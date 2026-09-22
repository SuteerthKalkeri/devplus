param([ValidateSet('run', 'test', 'package')][string]$Action = 'run')
$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path $PSScriptRoot -Parent
$envFile = Join-Path $projectRoot '.local/database.env'
if (-not (Test-Path $envFile)) { throw 'Run scripts/database.ps1 first.' }
$saved = @{}
try {
    Get-Content -LiteralPath $envFile | ForEach-Object {
        $parts = $_ -split '=',2
        if ($parts[0] -in @('DB_URL','DB_USER','DB_PASSWORD')) {
            $saved[$parts[0]] = [Environment]::GetEnvironmentVariable($parts[0], 'Process')
            [Environment]::SetEnvironmentVariable($parts[0], $parts[1], 'Process')
        }
    }
    if ($Action -in @('test', 'package')) { $env:DB_URL = $env:DB_URL -replace '/devpulse$', '/devpulse_test' }
    Push-Location (Join-Path $projectRoot 'apps/backend')
    try {
        $goal = if ($Action -eq 'run') { 'spring-boot:run' } else { $Action }
        [string[]]$goals = if ($Action -eq 'run') { @($goal) } else { @('clean', $goal) }
        & .\mvnw.cmd -B -ntp "-Dmaven.repo.local=$projectRoot\.bootstrap\maven-repository" @goals
        if ($LASTEXITCODE -ne 0) { throw "Backend $Action failed." }
    } finally { Pop-Location }
} finally {
    foreach ($name in $saved.Keys) { [Environment]::SetEnvironmentVariable($name, $saved[$name], 'Process') }
}
