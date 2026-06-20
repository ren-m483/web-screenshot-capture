#!/bin/bash

set -u

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR" || exit 1

if ! command -v node >/dev/null 2>&1; then
  echo "Node.jsがインストールされていません。"
  exit 1
fi

if [ ! -d "node_modules" ]; then
  npm install
fi

npx playwright install chromium

npm run capture