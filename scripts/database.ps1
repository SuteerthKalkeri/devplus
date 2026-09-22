param([ValidateSet('start', 'stop')][string]$Action = 'start')
$ErrorActionPreference = 'Stop'
function New-LocalPassword {
    # Use APIs available in Windows PowerShell 5.1 as well as PowerShell 7.
    $bytes = New-Object byte[] 32
    $random = [Security.Cryptography.RandomNumberGenerator]::Create()
    try {
        $random.GetBytes($bytes)
        return [BitConverter]::ToString($bytes).Replace('-', '')
    } finally { $random.Dispose() }
}
$projectRoot = Split-Path $PSScriptRoot -Parent
$localDir = Join-Path $projectRoot '.local'
$dataDir = Join-Path $localDir 'postgres'
$pgBin = Split-Path (Get-Command psql.exe -ErrorAction Stop).Source
$pgCtl = Join-Path $pgBin 'pg_ctl.exe'
$envFile = Join-Path $localDir 'database.env'
if ($Action -eq 'stop') {
    if (Test-Path (Join-Path $dataDir 'postmaster.pid')) {
        & $pgCtl -D $dataDir -m fast -w stop
        if ($LASTEXITCODE -ne 0) { throw 'Could not stop DevPulse PostgreSQL.' }
    }
    exit
}
New-Item -ItemType Directory -Force -Path $localDir | Out-Null
if (-not (Test-Path $envFile)) {
    if (Test-Path (Join-Path $dataDir 'PG_VERSION')) { throw 'Database exists but local credentials are missing. Restore .local/database.env.' }
    $adminPassword = New-LocalPassword
    $appPassword = New-LocalPassword
    @("DB_URL=jdbc:postgresql://127.0.0.1:55432/devpulse", 'DB_USER=devpulse_app', "DB_PASSWORD=$appPassword", "DB_ADMIN_PASSWORD=$adminPassword") | Set-Content -LiteralPath $envFile
}
$values = @{}
Get-Content -LiteralPath $envFile | ForEach-Object { $parts = $_ -split '=',2; $values[$parts[0]] = $parts[1] }
if (-not (Test-Path (Join-Path $dataDir 'PG_VERSION'))) {
    $passwordFile = Join-Path $localDir 'init-password'
    $values.DB_ADMIN_PASSWORD | Set-Content -LiteralPath $passwordFile -NoNewline
    try {
        & (Join-Path $pgBin 'initdb.exe') -D $dataDir -U devpulse_admin --auth=scram-sha-256 --encoding=UTF8 --locale=C --pwfile=$passwordFile
        if ($LASTEXITCODE -ne 0) { throw 'Database initialization failed.' }
    } finally { Remove-Item -LiteralPath $passwordFile -ErrorAction SilentlyContinue }
    Add-Content -LiteralPath (Join-Path $dataDir 'postgresql.conf') -Value "`nlisten_addresses = '127.0.0.1'`nport = 55432"
}
& $pgCtl -D $dataDir status *> $null
if ($LASTEXITCODE -ne 0) {
    $logFile = Join-Path $localDir 'postgres.log'
    $process = Start-Process -FilePath $pgCtl -ArgumentList @('-D', "`"$dataDir`"", '-l', "`"$logFile`"", '-w', 'start') -WindowStyle Hidden -PassThru
    $process.WaitForExit()
    if ($process.ExitCode -ne 0) { throw 'PostgreSQL did not start. Check .local/postgres.log and port 55432.' }
}
$savedPassword = $env:PGPASSWORD
try {
    $env:PGPASSWORD = $values.DB_ADMIN_PASSWORD
    $psql = Join-Path $pgBin 'psql.exe'
    $connection = @('-h','127.0.0.1','-p','55432','-U','devpulse_admin','-d','postgres','-v','ON_ERROR_STOP=1','-w')
    $roleExists = & $psql @connection -tAc "SELECT 1 FROM pg_roles WHERE rolname='devpulse_app'"
    if ($LASTEXITCODE -ne 0) { throw 'Could not connect to the isolated database.' }
    if ($roleExists -ne '1') {
        "CREATE ROLE devpulse_app LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE PASSWORD '$($values.DB_PASSWORD)';" | & $psql @connection
        if ($LASTEXITCODE -ne 0) { throw 'Could not create application role.' }
    }
    foreach ($databaseName in @('devpulse', 'devpulse_test')) {
        $dbExists = & $psql @connection -tAc "SELECT 1 FROM pg_database WHERE datname='$databaseName'"
        if ($dbExists -ne '1') {
            & $psql @connection -c "CREATE DATABASE $databaseName OWNER devpulse_app"
            if ($LASTEXITCODE -ne 0) { throw 'Could not create application database.' }
        }
    }
} finally { $env:PGPASSWORD = $savedPassword }
Write-Output 'DevPulse PostgreSQL is ready on 127.0.0.1:55432. Credentials are stored in ignored .local/database.env.'
