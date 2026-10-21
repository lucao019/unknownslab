using System.Text.Json;
using LibreHardwareMonitor.Hardware;

const int SampleIntervalMs = 2000;
var jsonOptions = new JsonSerializerOptions(JsonSerializerDefaults.Web);
using var cancellation = new CancellationTokenSource();

Console.CancelKeyPress += (_, eventArgs) =>
{
    eventArgs.Cancel = true;
    cancellation.Cancel();
};

_ = Task.Run(async () =>
{
    while (await Console.In.ReadLineAsync() is { } command)
    {
        if (string.Equals(command, "stop", StringComparison.OrdinalIgnoreCase))
        {
            cancellation.Cancel();
            break;
        }
    }
});

Computer? computer = null;
try
{
    computer = new Computer
    {
        IsCpuEnabled = true,
        IsGpuEnabled = true,
        IsMemoryEnabled = true,
        IsMotherboardEnabled = true,
        IsStorageEnabled = true
    };
    computer.Open();

    while (!cancellation.IsCancellationRequested)
    {
        var sensors = new List<SensorReading>();
        var warnings = new List<string>();

        foreach (var hardware in computer.Hardware)
        {
            UpdateHardware(hardware, sensors, warnings);
        }

        var snapshot = new SensorSnapshot(
            DateTimeOffset.UtcNow,
            "LibreHardwareMonitor 0.9.6",
            SampleIntervalMs,
            sensors,
            warnings);
        Console.Out.WriteLine(JsonSerializer.Serialize(snapshot, jsonOptions));
        await Console.Out.FlushAsync();

        try
        {
            await Task.Delay(SampleIntervalMs, cancellation.Token);
        }
        catch (OperationCanceledException) when (cancellation.IsCancellationRequested)
        {
            break;
        }
    }

    return 0;
}
catch (Exception error)
{
    Console.Out.WriteLine(JsonSerializer.Serialize(new SensorError(
        DateTimeOffset.UtcNow,
        "LibreHardwareMonitor 0.9.6",
        error.Message), jsonOptions));
    await Console.Out.FlushAsync();
    return 1;
}
finally
{
    if (computer is not null)
    {
        try
        {
            computer.Close();
        }
        catch (Exception error)
        {
            Console.Error.WriteLine($"LibreHardwareMonitor cleanup failed: {error.Message}");
        }
    }
}

static void UpdateHardware(IHardware hardware, List<SensorReading> sensors, List<string> warnings)
{
    try
    {
        hardware.Update();
        foreach (var sensor in hardware.Sensors)
        {
            if (sensor.Value is not { } value || !float.IsFinite(value))
            {
                continue;
            }

            sensors.Add(new SensorReading(
                hardware.Name,
                hardware.HardwareType.ToString(),
                hardware.Identifier.ToString(),
                sensor.Name,
                sensor.SensorType.ToString(),
                value,
                GetUnit(sensor.SensorType)));
        }
    }
    catch (Exception error)
    {
        warnings.Add($"{hardware.Name}: {error.Message}");
    }

    foreach (var child in hardware.SubHardware)
    {
        UpdateHardware(child, sensors, warnings);
    }
}

static string GetUnit(SensorType sensorType) => sensorType switch
{
    SensorType.Temperature => "°C",
    SensorType.Fan => "RPM",
    SensorType.Control or SensorType.Load or SensorType.Level => "%",
    SensorType.Clock or SensorType.Frequency => "MHz",
    SensorType.Voltage => "V",
    SensorType.Current => "A",
    SensorType.Power => "W",
    SensorType.Data => "GB",
    SensorType.Throughput => "B/s",
    SensorType.Energy => "mWh",
    SensorType.Noise => "dBA",
    SensorType.Humidity => "%",
    SensorType.Flow => "L/h",
    SensorType.Conductivity => "µS/cm",
    _ => ""
};

internal sealed record SensorReading(
    string HardwareName,
    string HardwareType,
    string HardwareId,
    string Name,
    string SensorType,
    float Value,
    string Unit);

internal sealed record SensorSnapshot(
    DateTimeOffset CapturedAt,
    string Provider,
    int IntervalMs,
    IReadOnlyList<SensorReading> Sensors,
    IReadOnlyList<string> Warnings);

internal sealed record SensorError(
    DateTimeOffset CapturedAt,
    string Provider,
    string Error);
