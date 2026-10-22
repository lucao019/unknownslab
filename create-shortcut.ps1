$buildDirectory = "H:\Unknowns-Lab-Build"
$targetPath = Join-Path $buildDirectory "Unknowns-Lab-portable.exe"

if (-not (Test-Path -LiteralPath $targetPath -PathType Leaf)) {
    throw "Executável não encontrado: $targetPath"
}

$desktopPath = [Environment]::GetFolderPath([Environment+SpecialFolder]::DesktopDirectory)
$desktopLocations = @(
    $desktopPath,
    (Join-Path $env:PUBLIC "Desktop")
) | Select-Object -Unique

foreach ($desktopLocation in $desktopLocations) {
    if (-not (Test-Path -LiteralPath $desktopLocation -PathType Container)) {
        continue
    }

    $oldShortcuts = Get-ChildItem -LiteralPath $desktopLocation -Filter "Unknowns Lab*.lnk" -File -ErrorAction Stop
    foreach ($oldShortcut in $oldShortcuts) {
        Remove-Item -LiteralPath $oldShortcut.FullName -Force -ErrorAction Stop
    }
}

$ws = New-Object -ComObject WScript.Shell
$shortcut = $ws.CreateShortcut((Join-Path $desktopPath "Unknowns Lab.lnk"))
$shortcut.TargetPath = $targetPath
$shortcut.WorkingDirectory = $buildDirectory
$shortcut.IconLocation = $targetPath
$shortcut.Description = "Unknowns Lab Control Center"
$shortcut.Save()
Write-Host "Atalho criado na Área de Trabalho!"
