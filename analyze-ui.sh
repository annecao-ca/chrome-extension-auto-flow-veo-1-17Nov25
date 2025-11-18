#!/bin/bash

# Script để phân tích UI screenshot bằng human-mcp

echo "📸 Phân tích UI Screenshot với human-mcp"
echo ""

# Load nvm
source ~/.nvm/nvm.sh

# Kiểm tra screenshot
SCREENSHOT_FILE="ui-screenshot.png"

if [ ! -f "$SCREENSHOT_FILE" ]; then
    echo "⚠️  Chưa tìm thấy screenshot: $SCREENSHOT_FILE"
    echo ""
    echo "📋 Hướng dẫn chụp screenshot:"
    echo ""
    echo "Cách 1: Chụp extension popup"
    echo "  1. Mở Chrome extension popup"
    echo "  2. Nhấn Cmd+Shift+4 để chụp màn hình"
    echo "  3. Chọn vùng popup"
    echo "  4. Lưu file với tên: ui-screenshot.png trong thư mục này"
    echo ""
    echo "Cách 2: Chụp từ file preview"
    echo "  1. Mở file ui-preview.html trong trình duyệt"
    echo "  2. Nhấn Cmd+Shift+4 để chụp màn hình"
    echo "  3. Chọn vùng UI"
    echo "  4. Lưu file với tên: ui-screenshot.png"
    echo ""
    echo "Sau khi có screenshot, chạy lại script này:"
    echo "  bash analyze-ui.sh"
    exit 1
fi

echo "✅ Tìm thấy screenshot: $SCREENSHOT_FILE"
echo ""

# Kiểm tra human-mcp
if ! command -v human-mcp &> /dev/null; then
    echo "❌ human-mcp chưa được cài đặt"
    echo "Cài đặt: npm install -g @goonnguyen/human-mcp"
    exit 1
fi

echo "🔍 Đang phân tích screenshot..."
echo ""

# Phân tích với human-mcp
# Lưu ý: Cần kiểm tra cú pháp chính xác của human-mcp
human-mcp analyze "$SCREENSHOT_FILE" 2>&1 || \
human-mcp eyes_analyze "$SCREENSHOT_FILE" 2>&1 || \
echo "Vui lòng kiểm tra cú pháp của human-mcp command"

