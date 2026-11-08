$WshShell = New-Object -ComObject WScript.Shell
$startupFolder = [System.IO.Path]::Combine($env:APPDATA, 'Microsoft\Windows\Start Menu\Programs\Startup')
$shortcutPath = [System.IO.Path]::Combine($startupFolder, 'LeetcoderDailyRunner.lnk')

$targetScript = 'c:\Users\ASUS\.gemini\antigravity\scratch\Leetcoder\start_automation_silent.vbs'

$shortcut = $WshShell.CreateShortcut($shortcutPath)
$shortcut.TargetPath = "wscript.exe"
$shortcut.Arguments = "`"$targetScript`""
$shortcut.WorkingDirectory = 'c:\Users\ASUS\.gemini\antigravity\scratch\Leetcoder'
$shortcut.Description = 'Leetcoder Daily Automated Solver Startup Task'
$shortcut.Save()

Write-Host "Startup shortcut created successfully at: $shortcutPath"

