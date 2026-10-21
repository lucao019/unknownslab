const { spawn } = require("child_process");

const powershellScript = `
$source = @'
using System;
using System.Runtime.InteropServices;

public static class ForegroundWindow {
    [DllImport("user32.dll")]
    private static extern IntPtr GetForegroundWindow();

    [DllImport("user32.dll")]
    private static extern uint GetWindowThreadProcessId(IntPtr window, out uint processId);

    public static uint GetProcessId() {
        uint processId;
        GetWindowThreadProcessId(GetForegroundWindow(), out processId);
        return processId;
    }
}
'@

Add-Type -TypeDefinition $source -ErrorAction Stop
$lastState = ''
while ($true) {
    $state = '0'
    $foregroundProcessId = [ForegroundWindow]::GetProcessId()
    if ($foregroundProcessId -gt 0) {
        try {
            $process = [Diagnostics.Process]::GetProcessById([int]$foregroundProcessId)
            if ($process.ProcessName -ieq 'TslGame') {
                $state = '1'
            }
        } catch [System.ArgumentException] {
        } catch [System.InvalidOperationException] {
        }
    }
    if ($state -ne $lastState) {
        [Console]::Out.WriteLine($state)
        [Console]::Out.Flush()
        $lastState = $state
    }
    Start-Sleep -Milliseconds 150
}
`;

function monitorPubgForeground(onChange) {
    if (process.platform !== "win32") {
        throw new Error("O monitor de foco do PUBG está disponível apenas no Windows.");
    }

    const monitor = spawn("powershell.exe", [
        "-NoLogo",
        "-NoProfile",
        "-NonInteractive",
        "-Command",
        powershellScript
    ], {
        windowsHide: true,
        stdio: ["ignore", "pipe", "pipe"]
    });

    let stopped = false;
    let output = "";
    onChange(false);

    monitor.stdout.setEncoding("utf8");
    monitor.stdout.on("data", (chunk) => {
        output += chunk;
        const lines = output.split(/\r?\n/);
        output = lines.pop();
        for (const line of lines) {
            if (line === "1") onChange(true);
            else if (line === "0") onChange(false);
        }
    });

    monitor.stderr.setEncoding("utf8");
    monitor.stderr.on("data", (error) => {
        console.error("Erro ao monitorar a janela ativa do PUBG:", error.trim());
    });

    monitor.on("error", (error) => {
        if (stopped) return;
        console.error("Falha ao iniciar o monitor da janela ativa do PUBG:", error.message);
        onChange(false);
    });

    monitor.on("close", (code) => {
        if (stopped) return;
        console.error(`O monitor da janela ativa do PUBG foi encerrado (código ${code}).`);
        onChange(false);
    });

    return () => {
        stopped = true;
        monitor.kill();
        onChange(false);
    };
}

module.exports = monitorPubgForeground;
