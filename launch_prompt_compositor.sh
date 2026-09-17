#!/bin/bash
echo "🍏 Launching Apple Spatial LookDev Prompt Compositor Studio on macOS..."
cd "$(dirname "$0")/tools/prompt_compositor"
python3 server.py
