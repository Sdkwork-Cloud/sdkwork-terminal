@echo off
setlocal

set "SCRIPT_DIR=%~dp0"
set "BUILD_SCRIPT=%SCRIPT_DIR%build.mjs"

if defined npm_node_execpath if exist "%npm_node_execpath%" (
  "%npm_node_execpath%" "%BUILD_SCRIPT%"
  exit /b %errorlevel%
)

if defined NVM_SYMLINK if exist "%NVM_SYMLINK%\node.exe" (
  "%NVM_SYMLINK%\node.exe" "%BUILD_SCRIPT%"
  exit /b %errorlevel%
)

if exist "%ProgramFiles%\nodejs\node.exe" (
  "%ProgramFiles%\nodejs\node.exe" "%BUILD_SCRIPT%"
  exit /b %errorlevel%
)

if defined ProgramFiles(x86) if exist "%ProgramFiles(x86)%\nodejs\node.exe" (
  "%ProgramFiles(x86)%\nodejs\node.exe" "%BUILD_SCRIPT%"
  exit /b %errorlevel%
)

where node >nul 2>nul
if not errorlevel 1 (
  node "%BUILD_SCRIPT%"
  exit /b %errorlevel%
)

echo Unable to locate Node.js for @sdkwork/terminal-shell prepack.
exit /b 1
