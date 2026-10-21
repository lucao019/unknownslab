const { execFile, spawn } = require("child_process");
const fs = require("fs");
const os = require("os");
const path = require("path");
const readline = require("readline");
const { promisify } = require("util");

const execFileAsync = promisify(execFile);
const POLL_INTERVAL_MS = 2000;
const NVSMI_FIELDS = "name,utilization.gpu,temperature.gpu,memory.total,memory.used,fan.speed";

let pollTimer = null;
let sensorBridgeProcess = null;
let previousCpuTimes = null;
let pollInProgress = false;
let sensorBridgeWarning = null;

function findNvidiaSmi() {
    const candidates = [
        path.join(process.env.ProgramFiles || "C:\\Program Files", "NVIDIA Corporation", "NVSMI", "nvidia-smi.exe"),
        path.join(process.env.SystemRoot || "C:\\Windows", "System32", "nvidia-smi.exe")
    ];
    return candidates.find(candidate => fs.existsSync(candidate)) || null;
}

function getCpuUsagePercent() {
    const cpuTimes = os.cpus().map(cpu => cpu.times);
    if (!previousCpuTimes || previousCpuTimes.length !== cpuTimes.length) {
        previousCpuTimes = cpuTimes;
        return null;
    }

    let totalDelta = 0;
    let idleDelta = 0;
    cpuTimes.forEach((times, index) => {
        const previous = previousCpuTimes[index];
        const total = Object.values(times).reduce((sum, value) => sum + value, 0);
        const previousTotal = Object.values(previous).reduce((sum, value) => sum + value, 0);
        totalDelta += total - previousTotal;
        idleDelta += times.idle - previous.idle;
    });
    previousCpuTimes = cpuTimes;

    if (totalDelta <= 0) return null;
    return Math.round(((totalDelta - idleDelta) / totalDelta) * 100);
}

function parseCsvNumber(value) {
    const normalized = value.trim();
    if (!normalized || normalized.toLowerCase() === "[n/a]") return null;
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : null;
}

async function readGpuSensors(warnings) {
    const executable = findNvidiaSmi();
    if (!executable) {
        return {
            available: false,
            reason: "nvidia-smi não foi encontrado nos caminhos padrão do driver."
        };
    }

    try {
        const { stdout } = await execFileAsync(executable, [
            `--query-gpu=${NVSMI_FIELDS}`,
            "--format=csv,noheader,nounits"
        ], {
            windowsHide: true,
            timeout: 1500,
            maxBuffer: 64 * 1024
        });

        const devices = stdout.trim().split(/\r?\n/).filter(Boolean).map(line => {
            const [name = "", usage = "", temperature = "", memoryTotal = "", memoryUsed = "", fanSpeed = ""] = line.split(",");
            return {
                name: name.trim(),
                usagePercent: parseCsvNumber(usage),
                temperatureCelsius: parseCsvNumber(temperature),
                memoryTotalMiB: parseCsvNumber(memoryTotal),
                memoryUsedMiB: parseCsvNumber(memoryUsed),
                fanSpeedPercent: parseCsvNumber(fanSpeed)
            };
        });
        return {
            available: devices.length > 0,
            devices,
            reason: devices.length ? null : "nvidia-smi não retornou dispositivos."
        };
    } catch (error) {
        const reason = error.code === "ENOENT"
            ? "nvidia-smi não está disponível neste driver."
            : `Falha ao consultar sensores NVIDIA: ${error.message}`;
        warnings.push(reason);
        return { available: false, reason, devices: [] };
    }
}

async function collectLiveHardwareSnapshot() {
    const warnings = sensorBridgeWarning ? [sensorBridgeWarning] : [];
    const gpus = await readGpuSensors(warnings);
    const totalMemoryBytes = os.totalmem();
    const freeMemoryBytes = os.freemem();

    return {
        capturedAt: new Date().toISOString(),
        source: "Node.js OS APIs e nvidia-smi",
        intervalMs: POLL_INTERVAL_MS,
        cpu: {
            usagePercent: getCpuUsagePercent(),
            temperatureCelsius: null,
            temperatureReason: "O Windows não forneceu uma temperatura de CPU por um sensor padronizado."
        },
        memory: {
            totalBytes: totalMemoryBytes,
            freeBytes: freeMemoryBytes,
            usedBytes: totalMemoryBytes - freeMemoryBytes,
            usagePercent: totalMemoryBytes
                ? Math.round(((totalMemoryBytes - freeMemoryBytes) / totalMemoryBytes) * 100)
                : null
        },
        gpus: gpus.devices || [],
        gpuSensorsAvailable: gpus.available,
        gpuSensorsReason: gpus.reason,
        fps: {
            available: false,
            value: null,
            reason: "Nenhum provedor de captura de FPS/frametime compatível foi detectado. Sensores da GPU não são uma medição de FPS."
        },
        warnings
    };
}

function getSensorBridgePath() {
    const packagedPath = process.resourcesPath
        ? path.join(process.resourcesPath, "hardware-sensor-bridge", "HardwareSensorBridge.exe")
        : null;
    const developmentPath = path.join(
        __dirname,
        "..",
        "..",
        "hardware-sensor-bridge",
        "publish",
        "HardwareSensorBridge.exe"
    );
    return [packagedPath, developmentPath].find(candidate => candidate && fs.existsSync(candidate)) || null;
}

function findSensor(sensors, predicate) {
    return sensors.find(sensor => Number.isFinite(sensor.value) && predicate(sensor)) || null;
}

function getLiveSnapshot(report) {
    const sensors = Array.isArray(report.sensors) ? report.sensors : [];
    const cpuSensors = sensors.filter(sensor => sensor.hardwareType === "Cpu");
    const cpuLoad = findSensor(cpuSensors, sensor =>
        sensor.sensorType === "Load" && /cpu total|total cpu/i.test(sensor.name)
    );
    const cpuTemperature = findSensor(cpuSensors, sensor =>
        sensor.sensorType === "Temperature"
        && sensor.value > 0
        && sensor.value < 150
        && /package|tctl|tdie|core max/i.test(sensor.name)
    ) || findSensor(cpuSensors, sensor =>
        sensor.sensorType === "Temperature" && sensor.value > 0 && sensor.value < 150
    );

    const memorySensors = sensors.filter(sensor =>
        sensor.hardwareType === "Memory" && !/virtual/i.test(sensor.hardwareName)
    );
    const memoryUsed = findSensor(memorySensors, sensor =>
        sensor.sensorType === "Data" && /used|in use/i.test(sensor.name)
    );
    const memoryAvailable = findSensor(memorySensors, sensor =>
        sensor.sensorType === "Data" && /available|free/i.test(sensor.name)
    );
    const memoryTotal = findSensor(memorySensors, sensor =>
        sensor.sensorType === "Data" && /total/i.test(sensor.name)
    );
    const memoryLoad = findSensor(memorySensors, sensor =>
        sensor.sensorType === "Load" && /memory/i.test(sensor.name)
    );
    const reportedTotalMemoryBytes = memoryTotal ? memoryTotal.value * 1024 ** 3 : null;
    const reportedUsedMemoryBytes = memoryUsed ? memoryUsed.value * 1024 ** 3 : null;
    const reportedAvailableMemoryBytes = memoryAvailable ? memoryAvailable.value * 1024 ** 3 : null;
    const totalMemoryBytes = reportedTotalMemoryBytes
        || (reportedUsedMemoryBytes !== null && reportedAvailableMemoryBytes !== null
            ? reportedUsedMemoryBytes + reportedAvailableMemoryBytes
            : os.totalmem());
    const usedMemoryBytes = reportedUsedMemoryBytes
        ?? (reportedAvailableMemoryBytes !== null
            ? totalMemoryBytes - reportedAvailableMemoryBytes
            : totalMemoryBytes - os.freemem());
    const availableMemoryBytes = reportedAvailableMemoryBytes
        ?? Math.max(0, totalMemoryBytes - usedMemoryBytes);

    const gpuHardware = new Map();
    sensors.filter(sensor => /^Gpu/.test(sensor.hardwareType)).forEach(sensor => {
        if (!gpuHardware.has(sensor.hardwareId)) {
            gpuHardware.set(sensor.hardwareId, { name: sensor.hardwareName, sensors: [] });
        }
        gpuHardware.get(sensor.hardwareId).sensors.push(sensor);
    });
    const gpus = Array.from(gpuHardware.values()).map(gpu => {
        const usage = findSensor(gpu.sensors, sensor =>
            sensor.sensorType === "Load" && /gpu core|gpu total|gpu utilization/i.test(sensor.name)
        );
        const temperature = findSensor(gpu.sensors, sensor =>
            sensor.sensorType === "Temperature"
            && sensor.value > 0
            && sensor.value < 150
            && /gpu core|gpu temperature|hot spot/i.test(sensor.name)
        ) || findSensor(gpu.sensors, sensor =>
            sensor.sensorType === "Temperature" && sensor.value > 0 && sensor.value < 150
        );
        const memoryUsedSensor = findSensor(gpu.sensors, sensor =>
            sensor.sensorType === "Data" && /memory used|gpu memory used/i.test(sensor.name)
        );
        const memoryTotalSensor = findSensor(gpu.sensors, sensor =>
            sensor.sensorType === "Data" && /memory total|gpu memory total/i.test(sensor.name)
        );
        const fanRpm = findSensor(gpu.sensors, sensor => sensor.sensorType === "Fan");
        const fanControl = findSensor(gpu.sensors, sensor => sensor.sensorType === "Control");
        return {
            name: gpu.name,
            usagePercent: usage?.value ?? null,
            temperatureCelsius: temperature?.value ?? null,
            memoryUsedMiB: memoryUsedSensor ? memoryUsedSensor.value * 1024 : null,
            memoryTotalMiB: memoryTotalSensor ? memoryTotalSensor.value * 1024 : null,
            fanSpeedRpm: fanRpm?.value ?? null,
            fanSpeedPercent: fanControl?.value ?? null
        };
    });

    return {
        capturedAt: report.capturedAt,
        source: report.provider || "LibreHardwareMonitor",
        intervalMs: report.intervalMs || POLL_INTERVAL_MS,
        cpuSource: cpuLoad ? report.provider : "Node.js OS APIs",
        memorySource: memoryUsed && memoryAvailable && memoryLoad
            ? report.provider
            : "LibreHardwareMonitor / Node.js OS APIs",
        cpu: {
            usagePercent: cpuLoad?.value ?? getCpuUsagePercent(),
            temperatureCelsius: cpuTemperature?.value ?? null,
            temperatureReason: cpuTemperature
                ? null
                : "O LibreHardwareMonitor não retornou um sensor de temperatura da CPU."
        },
        memory: {
            totalBytes: totalMemoryBytes,
            freeBytes: availableMemoryBytes,
            usedBytes: usedMemoryBytes,
            usagePercent: memoryLoad?.value ?? (totalMemoryBytes
                ? Math.round((usedMemoryBytes / totalMemoryBytes) * 100)
                : null)
        },
        gpus,
        gpuSensorsAvailable: gpus.length > 0,
        gpuSensorsReason: gpus.length ? null : "O LibreHardwareMonitor não retornou sensores de GPU.",
        fps: {
            available: false,
            value: null,
            reason: "LibreHardwareMonitor não mede FPS/frametime. Nenhum provedor de captura de frames foi configurado."
        },
        sensors,
        warnings: Array.isArray(report.warnings) ? report.warnings : []
    };
}

async function createLiveSnapshot(report) {
    const snapshot = getLiveSnapshot(report);
    const nvidiaWarnings = [];
    const nvidia = await readGpuSensors(nvidiaWarnings);
    if (nvidia.available) {
        const libreGpuCount = snapshot.gpus.length;
        const remainingDevices = [...nvidia.devices];
        snapshot.gpus = snapshot.gpus.map(gpu => {
            const gpuName = (gpu.name || "").toLowerCase();
            const matchIndex = remainingDevices.findIndex(device => {
                const deviceName = device.name.toLowerCase();
                return gpuName.includes(deviceName) || deviceName.includes(gpuName);
            });
            const device = matchIndex >= 0 ? remainingDevices.splice(matchIndex, 1)[0] : null;
            return device ? {
                ...gpu,
                usagePercent: gpu.usagePercent ?? device.usagePercent,
                temperatureCelsius: gpu.temperatureCelsius ?? device.temperatureCelsius,
                memoryUsedMiB: gpu.memoryUsedMiB ?? device.memoryUsedMiB,
                memoryTotalMiB: gpu.memoryTotalMiB ?? device.memoryTotalMiB,
                fanSpeedPercent: gpu.fanSpeedPercent ?? device.fanSpeedPercent
            } : gpu;
        });
        remainingDevices.forEach(device => {
            snapshot.gpus.push({ ...device, fanSpeedRpm: null });
        });
        snapshot.gpuSensorsAvailable = snapshot.gpus.length > 0;
        snapshot.gpuSensorsReason = null;
        snapshot.gpuSource = libreGpuCount ? "LibreHardwareMonitor / nvidia-smi" : "nvidia-smi";
    } else {
        snapshot.gpuSource = "LibreHardwareMonitor";
    }
    snapshot.warnings.push(...nvidiaWarnings);
    return snapshot;
}

function publishSensorBridgeError(onUpdate, message) {
    if (typeof onUpdate === "function") {
        onUpdate({
            capturedAt: new Date().toISOString(),
            source: "LibreHardwareMonitor",
            intervalMs: POLL_INTERVAL_MS,
            error: message
        });
    }
}

function startSensorBridge(executable, onUpdate) {
    const child = spawn(executable, [], {
        windowsHide: true,
        stdio: ["pipe", "pipe", "pipe"]
    });
    sensorBridgeProcess = child;
    let snapshotPending = false;
    const output = readline.createInterface({ input: child.stdout, crlfDelay: Infinity });

    output.on("line", line => {
        if (sensorBridgeProcess !== child || snapshotPending || !line.trim()) return;
        try {
            const report = JSON.parse(line);
            if (report.error) {
                publishSensorBridgeError(onUpdate, report.error);
                return;
            }
            snapshotPending = true;
            createLiveSnapshot(report)
                .then(snapshot => {
                    if (sensorBridgeProcess === child) onUpdate(snapshot);
                })
                .catch(error => {
                    if (sensorBridgeProcess === child) {
                        publishSensorBridgeError(onUpdate, `Falha ao consolidar sensores: ${error.message}`);
                    }
                })
                .finally(() => {
                    snapshotPending = false;
                });
        } catch (error) {
            publishSensorBridgeError(onUpdate, `Resposta inválida do LibreHardwareMonitor: ${error.message}`);
        }
    });

    child.stderr.on("data", chunk => {
        const diagnostic = chunk.toString().trim();
        if (diagnostic) console.error(`LibreHardwareMonitor: ${diagnostic}`);
    });

    child.on("error", error => {
        if (sensorBridgeProcess === child) {
            sensorBridgeProcess = null;
            startFallbackMonitor(onUpdate, `Não foi possível iniciar a ponte de sensores: ${error.message}`);
        }
    });

    child.on("close", code => {
        if (sensorBridgeProcess !== child) return;
        sensorBridgeProcess = null;
        startFallbackMonitor(onUpdate, `A ponte de sensores encerrou inesperadamente (código ${code}).`);
    });
}

function startFallbackMonitor(onUpdate, warning = null) {
    if (pollTimer) clearInterval(pollTimer);
    sensorBridgeWarning = warning;
    pollTimer = setInterval(() => publishSnapshot(onUpdate), POLL_INTERVAL_MS);
    pollTimer.unref();
    publishSnapshot(onUpdate);
}

async function publishSnapshot(onUpdate) {
    if (pollInProgress || !pollTimer) return;
    pollInProgress = true;
    try {
        const snapshot = await collectLiveHardwareSnapshot();
        if (pollTimer && typeof onUpdate === "function") onUpdate(snapshot);
    } catch (error) {
        if (pollTimer && typeof onUpdate === "function") {
            onUpdate({
                capturedAt: new Date().toISOString(),
                source: "Node.js OS APIs e nvidia-smi",
                intervalMs: POLL_INTERVAL_MS,
                error: error.message
            });
        }
    } finally {
        pollInProgress = false;
    }
}

async function startLiveHardwareMonitor(onUpdate) {
    stopLiveHardwareMonitor();
    previousCpuTimes = null;
    sensorBridgeWarning = null;
    const bridgePath = getSensorBridgePath();
    if (bridgePath) {
        startSensorBridge(bridgePath, onUpdate);
        return { running: true, intervalMs: POLL_INTERVAL_MS, provider: "LibreHardwareMonitor" };
    }

    startFallbackMonitor(onUpdate, "A ponte LibreHardwareMonitor não foi encontrada; mostrando apenas os sensores disponíveis no sistema e no driver NVIDIA.");
    return { running: true, intervalMs: POLL_INTERVAL_MS, provider: "Node.js / nvidia-smi" };
}

function stopLiveHardwareMonitor() {
    if (pollTimer) clearInterval(pollTimer);
    pollTimer = null;
    const child = sensorBridgeProcess;
    sensorBridgeProcess = null;
    sensorBridgeWarning = null;
    if (child && !child.killed) {
        let forceStopTimer = null;
        child.once("close", () => clearTimeout(forceStopTimer));
        if (child.stdin.writable) child.stdin.write("stop\n");
        forceStopTimer = setTimeout(() => {
            if (!child.killed) child.kill();
        }, 3000);
        forceStopTimer.unref();
    }
    previousCpuTimes = null;
    return { running: false };
}

module.exports = {
    startLiveHardwareMonitor,
    stopLiveHardwareMonitor,
    collectLiveHardwareSnapshot
};
