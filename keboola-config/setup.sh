#!/bin/bash
set -e

cd /app
npm install
VITE_BASE_URL=/ npm run build
