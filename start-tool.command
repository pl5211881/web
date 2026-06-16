#!/bin/zsh
cd "$(dirname "$0")"

echo "Starting UX competitor analysis tool..."
echo "URL: http://127.0.0.1:5173/"
echo ""

(sleep 1 && open "http://127.0.0.1:5173/") &
npm run dev
