#Requires -RunAsAdministrator
# SOCAnalyst Agent -- Scheduled Task Repair
# Fixes machines where Python is user-local but the task was registered as SYSTEM,
# causing the task to stay permanently Queued and the agent to never start.
#
# No re-enrollment required -- works with existing credentials.json
# Usage (as Administrator):
#   irm <api-url>/api/v1/installer/repair.ps1 | iex

$INSTALL_DIR = 'C:\ProgramData\SOCAnalyst'
$AGENT_FILE  = Join-Path $INSTALL_DIR 'soc_agent_v2.py'
$TASK_NAME   = 'SOCAnalystAgent'

function Write-OK   { param($msg) Write-Host "[repair] OK    $msg" -ForegroundColor Green  }
function Write-Warn { param($msg) Write-Host "[repair] WARN  $msg" -ForegroundColor Yellow }
function Write-Fail { param($msg) Write-Host "[repair] FAIL  $msg" -ForegroundColor Red    }
function Write-Info { param($msg) Write-Host "[repair] INFO  $msg" -ForegroundColor Cyan   }

Write-Host ""
Write-Host "  SOCAnalyst Agent -- Scheduled Task Repair" -ForegroundColor White
Write-Host "  ==========================================" -ForegroundColor DarkGray
Write-Host ""

# 1. Verify agent is installed on this machine
if (-not (Test-Path $AGENT_FILE)) {
    Write-Fail "Agent not installed at $AGENT_FILE -- run bootstrap.ps1 first"
    exit 1
}
Write-Info "Agent found at $AGENT_FILE"

# 2. Get existing scheduled task
$task = Get-ScheduledTask -TaskName $TASK_NAME -ErrorAction SilentlyContinue
if (-not $task) {
    Write-Fail "Scheduled task '$TASK_NAME' not found -- re-enroll the machine via dashboard"
    exit 1
}

$taskUser  = $task.Principal.UserId
$taskState = $task.State
Write-Info "Current task  -- User: $taskUser  State: $taskState"

# 3. Find Python executable (from the task action first, then PATH)
$pythonExe = $task.Actions[0].Execute
if (-not $pythonExe -or -not (Test-Path $pythonExe -ErrorAction SilentlyContinue)) {
    Write-Warn "Task Python path not found ($pythonExe) -- searching PATH..."
    foreach ($cmd in @('python', 'python3', 'py')) {
        try {
            $found = (Get-Command $cmd -ErrorAction Stop).Source
            if ($found -and $found -notlike '*WindowsApps*') { $pythonExe = $found; break }
        } catch {}
    }
}
if (-not $pythonExe -or -not (Test-Path $pythonExe -ErrorAction SilentlyContinue)) {
    Write-Fail "Cannot locate Python executable -- reinstall Python or re-enroll"
    exit 1
}
Write-Info "Python        -- $pythonExe"

# 4. Determine if repair is needed
$pythonIsUserLocal = ($pythonExe -match [regex]::Escape($env:USERPROFILE)) -or
                     ($pythonExe -match '\\AppData\\') -or
                     ($pythonExe -match '\\Users\\[^\\]+\\')
$taskIsSystem      = $taskUser -eq 'SYSTEM'

if (-not $taskIsSystem) {
    Write-OK "Task already runs as $taskUser -- no repair needed"
    if ($taskState -ne 'Running') {
        Start-ScheduledTask -TaskName $TASK_NAME -ErrorAction SilentlyContinue
        Start-Sleep -Seconds 3
        $newState = (Get-ScheduledTask -TaskName $TASK_NAME -ErrorAction SilentlyContinue).State
        Write-OK "Agent started (state: $newState)"
    } else {
        Write-OK "Agent is already running"
    }
    Write-Host ""
    exit 0
}

if (-not $pythonIsUserLocal) {
    # SYSTEM + system-wide Python is correct -- just restart the task
    Write-Info "Python is system-wide and task is SYSTEM -- configuration is correct"
    Write-Info "Restarting task..."
    Stop-ScheduledTask  -TaskName $TASK_NAME -ErrorAction SilentlyContinue | Out-Null
    Start-Sleep -Seconds 2
    Start-ScheduledTask -TaskName $TASK_NAME -ErrorAction SilentlyContinue | Out-Null
    Start-Sleep -Seconds 5
    $newState = (Get-ScheduledTask -TaskName $TASK_NAME -ErrorAction SilentlyContinue).State
    Write-OK "Agent restarted (state: $newState)"
    Write-Host ""
    exit 0
}

# 5. The broken case: SYSTEM task + user-local Python
Write-Warn "Problem detected: task runs as SYSTEM but Python is user-local"
Write-Warn "SYSTEM cannot access $pythonExe -- task stays Queued forever"
Write-Info "Applying fix: re-registering task as current user..."
Write-Host ""

$pythonwExe = $pythonExe -replace 'python\.exe$', 'pythonw.exe'
if (-not (Test-Path $pythonwExe -ErrorAction SilentlyContinue)) { $pythonwExe = $pythonExe }

$currentUser = [System.Security.Principal.WindowsIdentity]::GetCurrent().Name
$action   = New-ScheduledTaskAction -Execute $pythonwExe -Argument "-u `"$AGENT_FILE`"" `
                -WorkingDirectory $INSTALL_DIR
$trigger  = New-ScheduledTaskTrigger -AtLogOn
$watchdog = New-ScheduledTaskTrigger -RepetitionInterval (New-TimeSpan -Minutes 30) `
                -Once -At ([datetime]::Today)
$settings = New-ScheduledTaskSettingsSet `
                -ExecutionTimeLimit       (New-TimeSpan -Hours 0) `
                -RestartCount             10 `
                -RestartInterval          (New-TimeSpan -Minutes 1) `
                -StartWhenAvailable `
                -RunOnlyIfNetworkAvailable:$false `
                -MultipleInstances        Queue
$principal = New-ScheduledTaskPrincipal -UserId $currentUser -LogonType Interactive -RunLevel Highest

Stop-ScheduledTask       -TaskName $TASK_NAME -ErrorAction SilentlyContinue | Out-Null
Unregister-ScheduledTask -TaskName $TASK_NAME -Confirm:$false -ErrorAction SilentlyContinue | Out-Null

try {
    Register-ScheduledTask `
        -TaskName  $TASK_NAME `
        -Action    $action `
        -Trigger   @($trigger, $watchdog) `
        -Settings  $settings `
        -Principal $principal `
        -Force -ErrorAction Stop | Out-Null
    Write-OK "Task re-registered as $currentUser (runs at logon)"
} catch {
    Write-Fail "Failed to register task: $_"
    exit 1
}

Start-ScheduledTask -TaskName $TASK_NAME -ErrorAction SilentlyContinue | Out-Null
Start-Sleep -Seconds 5
$finalState = (Get-ScheduledTask -TaskName $TASK_NAME -ErrorAction SilentlyContinue).State

Write-OK "Agent started (state: $finalState)"
Write-Host ""
Write-Host "  Machine:   $env:COMPUTERNAME" -ForegroundColor DarkGray
Write-Host "  Task user: $currentUser" -ForegroundColor DarkGray
Write-Host "  Python:    $pythonwExe" -ForegroundColor DarkGray
Write-Host "  Log:       Get-Content '$INSTALL_DIR\agent_v2.log' -Tail 20" -ForegroundColor DarkGray
Write-Host ""
