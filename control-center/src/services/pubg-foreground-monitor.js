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

    [DllImport("user32.dll", SetLastError = true)]
    private static extern bool GetClientRect(IntPtr window, out Rect rect);

    [DllImport("user32.dll", SetLastError = true)]
    private static extern bool ClientToScreen(IntPtr window, ref Point point);

    [StructLayout(LayoutKind.Sequential)]
    private struct Rect {
        public int Left;
        public int Top;
        public int Right;
        public int Bottom;
    }

    [StructLayout(LayoutKind.Sequential)]
    private struct Point {
        public int X;
        public int Y;
    }

    public static string GetForegroundGameBounds() {
        IntPtr window = GetForegroundWindow();
        uint processId;
        GetWindowThreadProcessId(window, out processId);
        if (processId == 0) return "";

        try {
            using (var process = System.Diagnostics.Process.GetProcessById((int)processId)) {
                if (!process.ProcessName.Equals("TslGame", StringComparison.OrdinalIgnoreCase)) return "";
            }
        } catch (ArgumentException) {
            return "";
        } catch (InvalidOperationException) {
            return "";
        }

        Rect rect;
        if (!GetClientRect(window, out rect)) return "";

        Point topLeft = new Point { X = rect.Left, Y = rect.Top };
        Point bottomRight = new Point { X = rect.Right, Y = rect.Bottom };
        if (!ClientToScreen(window, ref topLeft) || !ClientToScreen(window, ref bottomRight)) return "";

        return String.Format("{0}|{1}|{2}|{3}", topLeft.X, topLeft.Y,
            bottomRight.X - topLeft.X, bottomRight.Y - topLeft.Y);
    }
}
'@

Add-Type -TypeDefinition $source -ErrorAction Stop
$lastState = ''
while ($true) {
    $bounds = [ForegroundWindow]::GetForegroundGameBounds()
    $state = if ($bounds) { "1|$bounds" } else { '0' }
    if ($state -ne $lastState) {
        [Console]::Out.WriteLine($state)
        [Console]::Out.Flush()
        $lastState = $state
    }
    Start-Sleep -Milliseconds 50
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
    onChange({ active: false });

    monitor.stdout.setEncoding("utf8");
    monitor.stdout.on("data", (chunk) => {
        output += chunk;
        const lines = output.split(/\r?\n/);
        output = lines.pop();
        for (const line of lines) {
            if (line === "0") {
                onChange({ active: false });
                continue;
            }

            const [active, x, y, width, height] = line.split("|").map(Number);
            if (active === 1 && [x, y, width, height].every(Number.isFinite) && width > 0 && height > 0) {
                onChange({ active: true, bounds: { x, y, width, height } });
            }
        }
    });

    monitor.stderr.setEncoding("utf8");
    monitor.stderr.on("data", (error) => {
        console.error("Erro ao monitorar a janela ativa do PUBG:", error.trim());
    });

    monitor.on("error", (error) => {
        if (stopped) return;
        console.error("Falha ao iniciar o monitor da janela ativa do PUBG:", error.message);
        onChange({ active: false });
    });

    monitor.on("close", (code) => {
        if (stopped) return;
        console.error(`O monitor da janela ativa do PUBG foi encerrado (código ${code}).`);
        onChange({ active: false });
    });

    return () => {
        stopped = true;
        monitor.kill();
        onChange({ active: false });
    };
}

module.exports = monitorPubgForeground;
