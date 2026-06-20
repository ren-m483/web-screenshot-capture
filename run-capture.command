#!/bin/bash

# このファイルが置かれているフォルダへ移動
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR" || exit 1

echo "========================================"
echo "Web Screenshot Capture"
echo "========================================"
echo ""

# Node.jsがインストールされているか確認
if ! command -v node >/dev/null 2>&1; then
  echo "エラー: Node.jsがインストールされていません。"
  echo ""
  echo "Node.jsをインストールしてから再実行してください。"
  echo "https://nodejs.org/"
  echo ""
  read -r -p "Enterキーを押して終了します..."
  exit 1
fi

# npmが利用できるか確認
if ! command -v npm >/dev/null 2>&1; then
  echo "エラー: npmが見つかりません。"
  echo ""
  read -r -p "Enterキーを押して終了します..."
  exit 1
fi

echo "Node.js: $(node --version)"
echo "npm: $(npm --version)"
echo ""

# node_modulesがない場合だけ依存関係をインストール
if [ ! -d "node_modules" ]; then
  echo "必要なパッケージをインストールします..."
  echo ""

  npm install

  if [ $? -ne 0 ]; then
    echo ""
    echo "エラー: npm installに失敗しました。"
    read -r -p "Enterキーを押して終了します..."
    exit 1
  fi
fi

# Chromiumが未導入の場合にも対応
echo "Playwright用のChromiumを確認します..."
echo ""

npx playwright install chromium

if [ $? -ne 0 ]; then
  echo ""
  echo "エラー: Chromiumのインストールに失敗しました。"
  read -r -p "Enterキーを押して終了します..."
  exit 1
fi

echo ""
echo "スクリーンショット撮影を開始します。"
echo ""

npm run capture

CAPTURE_EXIT_CODE=$?

echo ""

if [ $CAPTURE_EXIT_CODE -ne 0 ]; then
  echo "一部の撮影でエラーが発生しました。"
  echo "screenshotsフォルダ内のcapture-report.jsonを確認してください。"
else
  echo "すべての撮影が完了しました。"
fi

echo ""

# screenshotsフォルダをFinderで開く
if [ -d "screenshots" ]; then
  open "screenshots"
fi

read -r -p "Enterキーを押して終了します..."

exit $CAPTURE_EXIT_CODE