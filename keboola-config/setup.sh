#!/bin/bash
set -e
# Build dist from src so Keboola matches GitHub Pages (CI builds on push; app clones repo as-is).
if [ -f package.json ]; then
  npm ci
  npm run build
fi
echo "Setup complete"
