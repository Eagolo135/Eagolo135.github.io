@echo off
setlocal
node "%~dp0tools\site-agent\index.js" %*
exit /b %ERRORLEVEL%