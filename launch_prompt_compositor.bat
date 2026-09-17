@echo off
setlocal enabledelayedexpansion
cd /d "%~dp0"

echo =======================================================
echo   Spatial LookDev Web Prompt Compositor Studio
echo =======================================================
echo.

set "PY_EXE=C:\Users\DJ\AppData\Local\Comfy-Desktop\ComfyUI-Installs\ComfyUI\ComfyUI\.venv\Scripts\python.exe"

if exist "%PY_EXE%" (
    echo [OK] Using Python from ComfyUI environment.
    "%PY_EXE%" tools\prompt_compositor\server.py
) else (
    where python >nul 2>nul
    if %errorlevel% equ 0 (
        python tools\prompt_compositor\server.py
    ) else (
        echo [!] Python not found. Opening standalone HTML in default browser...
        start "" "%~dp0tools\prompt_compositor\index.html"
    )
)

pause
