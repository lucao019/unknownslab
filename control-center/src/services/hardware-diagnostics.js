const { execFile } = require("child_process");
const fs = require("fs");
const path = require("path");
const { promisify } = require("util");

const execFileAsync = promisify(execFile);
const POWERSHELL_SCRIPT = String.raw`
$ErrorActionPreference = 'Stop'
$warnings = @()
$cpu = $null
$cpuUsage = $null
$computer = $null
$os = $null
$gpus = @()
$memoryModules = @()
$physicalDisks = @()
$volumes = @()

try {
    $cpu = Get-CimInstance -ClassName Win32_Processor | Select-Object -First 1
    if ($cpu -and $null -ne $cpu.LoadPercentage) {
        $cpuUsage = [double]$cpu.LoadPercentage
    }
} catch {
    $warnings += "CPU: $($_.Exception.Message)"
}

try {
    $computer = Get-CimInstance -ClassName Win32_ComputerSystem
    $os = Get-CimInstance -ClassName Win32_OperatingSystem
} catch {
    $warnings += "Memória: $($_.Exception.Message)"
}

try {
    $gpus = @(Get-CimInstance -ClassName Win32_VideoController | ForEach-Object {
        [ordered]@{
            name = $_.Name
            driverVersion = $_.DriverVersion
            vramBytes = $_.AdapterRAM
        }
    })
} catch {
    $warnings += "GPU: $($_.Exception.Message)"
}

try {
    $memoryModules = @(Get-CimInstance -ClassName Win32_PhysicalMemory | ForEach-Object {
        [ordered]@{
            capacityBytes = $_.Capacity
            speedMHz = $_.Speed
            configuredSpeedMHz = $_.ConfiguredClockSpeed
        }
    })
} catch {
    $warnings += "Módulos de RAM: $($_.Exception.Message)"
}

try {
    $physicalDisks = @(Get-CimInstance -ClassName Win32_DiskDrive | ForEach-Object {
        [ordered]@{
            model = $_.Model
            mediaType = $_.MediaType
            capacityBytes = $_.Size
        }
    })
} catch {
    $warnings += "Discos físicos: $($_.Exception.Message)"
}

try {
    $volumes = @(Get-CimInstance -ClassName Win32_LogicalDisk -Filter 'DriveType = 3' | ForEach-Object {
        [ordered]@{
            deviceId = $_.DeviceID
            capacityBytes = $_.Size
            freeBytes = $_.FreeSpace
        }
    })
} catch {
    $warnings += "Volumes: $($_.Exception.Message)"
}

[ordered]@{
    cpu = [ordered]@{
        model = $(if ($cpu) { $cpu.Name } else { $null })
        cores = $(if ($cpu) { $cpu.NumberOfCores } else { $null })
        logicalProcessors = $(if ($cpu) { $cpu.NumberOfLogicalProcessors } else { $null })
        usagePercent = $cpuUsage
    }
    memory = [ordered]@{
        totalBytes = $(if ($computer) { $computer.TotalPhysicalMemory } else { $null })
        freeBytes = $(if ($os) { [double]$os.FreePhysicalMemory * 1024 } else { $null })
        modules = $memoryModules
    }
    gpus = $gpus
    physicalDisks = $physicalDisks
    volumes = $volumes
    warnings = $warnings
} | ConvertTo-Json -Depth 6 -Compress
`;

function runPowerShell(script) {
    return execFileAsync("powershell.exe", [
        "-NoLogo",
        "-NoProfile",
        "-NonInteractive",
        "-Command",
        script
    ], {
        windowsHide: true,
        timeout: 15000,
        maxBuffer: 1024 * 1024
    });
}

function parseNumber(value) {
    if (value === null || value === undefined || value === "") return null;
    const number = Number(value);
    return Number.isFinite(number) ? number : null;
}

function findNvidiaSmi() {
    const candidates = [
        path.join(process.env.ProgramFiles || "C:\\Program Files", "NVIDIA Corporation", "NVSMI", "nvidia-smi.exe"),
        path.join(process.env.SystemRoot || "C:\\Windows", "System32", "nvidia-smi.exe")
    ];
    return candidates.find(candidate => fs.existsSync(candidate)) || null;
}

async function readNvidiaTelemetry(warnings) {
    const executable = findNvidiaSmi();
    if (!executable) {
        return {
            available: false,
            reason: "nvidia-smi não foi encontrado nos caminhos padrão."
        };
    }

    try {
        const { stdout } = await execFileAsync(executable, [
            "--query-gpu=name,utilization.gpu,temperature.gpu,memory.total,memory.used",
            "--format=csv,noheader,nounits"
        ], {
            windowsHide: true,
            timeout: 5000,
            maxBuffer: 64 * 1024
        });

        const devices = stdout.trim().split(/\r?\n/).filter(Boolean).map(line => {
            const [name, usage, temperature, memoryTotal, memoryUsed] = line.split(",").map(value => value.trim());
            return {
                name,
                usagePercent: parseNumber(usage),
                temperatureCelsius: parseNumber(temperature),
                memoryTotalMiB: parseNumber(memoryTotal),
                memoryUsedMiB: parseNumber(memoryUsed)
            };
        });
        return { available: devices.length > 0, devices, reason: devices.length ? null : "nvidia-smi não retornou GPUs." };
    } catch (error) {
        const reason = error.code === "ENOENT"
            ? "nvidia-smi não está disponível neste driver."
            : `Falha na consulta somente leitura do nvidia-smi: ${error.message}`;
        warnings.push(reason);
        return { available: false, reason };
    }
}

async function collectHardwareDiagnostics(displays) {
    if (process.platform !== "win32") {
        throw new Error("O diagnóstico de hardware está disponível apenas no Windows.");
    }

    const { stdout } = await runPowerShell(POWERSHELL_SCRIPT);
    let system;
    try {
        system = JSON.parse(stdout.trim());
    } catch (error) {
        throw new Error(`Não foi possível interpretar a resposta do diagnóstico do Windows: ${error.message}`);
    }

    const warnings = Array.isArray(system.warnings) ? system.warnings : [];
    const nvidia = await readNvidiaTelemetry(warnings);

    return {
        capturedAt: new Date().toISOString(),
        source: "Windows CIM/WMI, Electron screen e nvidia-smi quando disponível",
        cpu: system.cpu,
        memory: system.memory,
        gpus: (Array.isArray(system.gpus) ? system.gpus : []).map(gpu => {
            const telemetry = (nvidia.devices || []).find(device =>
                device.name && gpu.name && device.name.toLowerCase() === gpu.name.toLowerCase()
            );
            return { ...gpu, telemetry: telemetry || null };
        }),
        nvidiaTelemetry: nvidia,
        displays: displays.map(display => ({
            id: display.id,
            width: display.size.width,
            height: display.size.height,
            refreshRateHz: display.displayFrequency,
            scaleFactor: display.scaleFactor,
            source: "Electron screen API"
        })),
        physicalDisks: Array.isArray(system.physicalDisks) ? system.physicalDisks : [],
        volumes: Array.isArray(system.volumes) ? system.volumes : [],
        warnings
    };
}

module.exports = { collectHardwareDiagnostics };
