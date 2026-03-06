param(
  [string]$EnvFile = ".env",
  [ValidateSet('User', 'Machine')]
  [string]$Scope = 'User'
)

if (-not (Test-Path $EnvFile)) {
  throw "Env file not found: $EnvFile"
}

$lines = Get-Content $EnvFile
$updated = @()

foreach ($line in $lines) {
  if ([string]::IsNullOrWhiteSpace($line)) { continue }
  if ($line -match '^\s*#') { continue }

  $parts = $line.Split('=', 2)
  if ($parts.Count -ne 2) { continue }

  $name = $parts[0].Trim()
  if ([string]::IsNullOrWhiteSpace($name)) { continue }

  $value = $parts[1]
  [Environment]::SetEnvironmentVariable($name, $value, $Scope)

  if ($Scope -eq 'User') {
    Set-Item -Path ("Env:{0}" -f $name) -Value $value
  }

  $updated += $name
}

if ($updated.Count -eq 0) {
  Write-Host "No variables were updated from $EnvFile"
  exit 0
}

Write-Host "Persisted $($updated.Count) variable(s) to $Scope scope from $EnvFile"
Write-Host ("Updated: {0}" -f ($updated -join ', '))