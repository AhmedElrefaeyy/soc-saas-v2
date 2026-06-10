<#
.SYNOPSIS
    SOC Platform Agent Bootstrap Installer
.DESCRIPTION
    Enrolls this machine as a SOC agent by exchanging a one-time installer
    token for permanent credentials, then installs the agent service.
.PARAMETER Token
    The one-time installer token generated from the SOC Platform dashboard.
.PARAMETER TenantId
    The tenant UUID shown in the SOC Platform dashboard.
.PARAMETER ApiUrl
    Base URL of the SOC Platform backend API.
.EXAMPLE
    .\bootstrap.ps1 -Token inst_xxx -TenantId xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx -ApiUrl https://backend.up.railway.app
#>
param(
    [Parameter(Mandatory=$true)]  [string]$Token,
    [Parameter(Mandatory=$true)]  [string]$TenantId,
    [Parameter(Mandatory=$false)] [string]$ApiUrl = "https://backend-production-a9cb4.up.railway.app"
)

$ErrorActionPreference = "Stop"
$ProgressPreference    = "SilentlyContinue"

# ── Helpers ───────────────────────────────────────────────────────────────────
function Write-Step  { param($msg) Write-Host "[bootstrap] $msg" -ForegroundColor Cyan }
function Write-OK    { param($msg) Write-Host "[bootstrap] OK  $msg" -ForegroundColor Green }
function Write-Fail  { param($msg) Write-Host "[bootstrap] ERR $msg" -ForegroundColor Red }

# ── Gather machine information ────────────────────────────────────────────────
Write-Step "Gathering machine information..."

$hostname  = $env:COMPUTERNAME
$osType    = "windows"
$ipAddress = $null
try {
    $ipAddress = (Get-NetIPAddress -AddressFamily IPv4 -ErrorAction SilentlyContinue |
                  Where-Object { $_.IPAddress -notmatch '^(127\.|169\.254\.)' } |
                  Select-Object -First 1).IPAddress
} catch {}

Write-OK "Hostname: $hostname  IP: $ipAddress"

# ── Call bootstrap-enroll ─────────────────────────────────────────────────────
Write-Step "Enrolling agent with SOC Platform..."

$enrollBody = @{
    token      = $Token
    tenant_id  = $TenantId
    machine_info = @{
        hostname      = $hostname
        os_type       = $osType
        ip_address    = $ipAddress
        agent_version = "2.0.0"
    }
} | ConvertTo-Json -Depth 5 -Compress

try {
    $resp = Invoke-RestMethod `
        -Uri            "$ApiUrl/api/v1/installer/bootstrap-enroll" `
        -Method         POST `
        -ContentType    "application/json; charset=utf-8" `
        -Body           $enrollBody `
        -UseBasicParsing
} catch {
    $body = $_.ErrorDetails.Message
    Write-Fail "Enrollment request failed: $($_.Exception.Message)"
    if ($body) { Write-Fail "Server response: $body" }
    exit 1
}

$agentId         = $resp.data.agent_id
$enrollmentToken = $resp.data.enrollment_token

if (-not $agentId) {
    Write-Fail "Enrollment succeeded but response was missing agent_id."
    exit 1
}

Write-OK "Enrolled — Agent ID: $agentId"

# ── Store credentials ─────────────────────────────────────────────────────────
Write-Step "Storing credentials..."

$credsDir  = "$env:ProgramData\SOCAnalyst"
$credsPath = "$credsDir\credentials.json"

New-Item -ItemType Directory -Force -Path $credsDir | Out-Null

@{
    agent_id         = $agentId
    enrollment_token = $enrollmentToken
    tenant_id        = $TenantId
    api_url          = $ApiUrl
    enrolled_at      = (Get-Date -Format "o")
    hostname         = $hostname
} | ConvertTo-Json | Set-Content -Path $credsPath -Encoding UTF8

Write-OK "Credentials saved to $credsPath"

# ── Done ──────────────────────────────────────────────────────────────────────
Write-Host ""
Write-Host "  Agent enrolled successfully." -ForegroundColor Green
Write-Host "  The agent will appear in your SOC Platform dashboard." -ForegroundColor Green
Write-Host "  Credentials stored at: $credsPath" -ForegroundColor DarkGray
Write-Host ""
