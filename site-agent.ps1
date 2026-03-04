$scriptPath = Join-Path $PSScriptRoot "tools/site-agent/index.js"
& node $scriptPath @args
exit $LASTEXITCODE