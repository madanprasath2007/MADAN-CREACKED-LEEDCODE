$action = New-ScheduledTaskAction -Execute "wscript.exe" -Argument '"c:\Users\ASUS\.gemini\antigravity\scratch\Leetcoder\start_automation_silent.vbs"' -WorkingDirectory "c:\Users\ASUS\.gemini\antigravity\scratch\Leetcoder"

# Trigger every day at 06:30 AM
$trigger = New-ScheduledTaskTrigger -Daily -At "06:30AM"

# Allow wake up if sleep/standby, start when available if missed, and run on battery
$settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable -WakeToRun

Register-ScheduledTask -TaskName "LeetcoderDailyTask" -Action $action -Trigger $trigger -Settings $settings -Force

Write-Host "Daily Scheduled Task registered successfully: LeetcoderDailyTask at 06:30 AM daily (WakeToRun enabled)."

