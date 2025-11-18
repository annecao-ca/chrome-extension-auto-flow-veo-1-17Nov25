#!/bin/bash

# Script để phân tích screenshot UI với human-mcp

echo "🔍 Phân tích UI Screenshot với human-mcp"
echo ""

# Load nvm
source ~/.nvm/nvm.sh

# Screenshot file
SCREENSHOT="ui-screenshot.png"

# Kiểm tra file
if [ ! -f "$SCREENSHOT" ]; then
    echo "❌ Không tìm thấy file: $SCREENSHOT"
    echo ""
    echo "📸 Hướng dẫn chụp screenshot:"
    echo ""
    echo "1. Mở extension popup trong Chrome"
    echo "2. Nhấn Cmd+Shift+4 (macOS) để chụp màn hình"
    echo "3. Chọn vùng extension popup"
    echo "4. File sẽ được lưu trên Desktop"
    echo "5. Di chuyển file vào thư mục này:"
    echo "   mv ~/Desktop/Screen\\ Shot*.png ui-screenshot.png"
    echo ""
    exit 1
fi

echo "✅ Tìm thấy screenshot: $SCREENSHOT"
echo ""

# Thử các cách gọi human-mcp
echo "🔍 Đang phân tích..."

# Cách 1: eyes_analyze command
if command -v eyes_analyze &> /dev/null; then
    echo "Sử dụng eyes_analyze command..."
    eyes_analyze "$SCREENSHOT" "Phân tích thiết kế UI này một cách chi tiết, đánh giá glassmorphism effects, button design, color palette, spacing, và UX patterns"
    exit 0
fi

# Cách 2: human-mcp với eyes_analyze
echo "Thử human-mcp eyes_analyze..."
human-mcp eyes_analyze "$SCREENSHOT" "Phân tích thiết kế UI này một cách chi tiết" 2>&1 || \
echo "Lỗi: Không thể kết nối với human-mcp API"

# Cách 3: human-mcp analyze
echo ""
echo "Thử human-mcp analyze..."
human-mcp analyze "$SCREENSHOT" 2>&1 || \
echo "Lỗi: Không thể kết nối với human-mcp API"

echo ""
echo "💡 Nếu gặp lỗi API, có thể cần:"
echo "   1. Kiểm tra kết nối internet"
echo "   2. Kiểm tra API key của human-mcp"
echo "   3. Xem documentation: https://github.com/goonnguyen/human-mcp"

