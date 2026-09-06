@echo off
setlocal
cd /d "%~dp0"
"C:\Users\DJ\AppData\Local\Comfy-Desktop\ComfyUI-Installs\ComfyUI\ComfyUI\.venv\Scripts\python.exe" scripts\select_shot.py %*
