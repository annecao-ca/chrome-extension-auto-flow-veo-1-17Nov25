# 🎯 Phân Tích UI Nhanh - Auto Flow Veo Extension

## 📸 Bước 1: Chụp Screenshot

### Cách Nhanh Nhất:

1. **Mở extension popup:**
   - Click vào icon extension trên Chrome toolbar
   - Hoặc load extension trong Developer mode

2. **Chụp screenshot (macOS):**
   ```bash
   # Nhấn Cmd+Shift+4
   # Chọn vùng extension popup
   # File sẽ lưu trên Desktop
   ```

3. **Di chuyển vào project:**
   ```bash
   cd /Users/queeniecao/chrome-extension-auto-flow-veo-1
   mv ~/Desktop/Screen\ Shot*.png ui-screenshot.png
   ```

---

## 🔍 Bước 2: Phân Tích với human-mcp

### Sử dụng Script (Khuyến nghị):

```bash
bash analyze-screenshot.sh
```

### Hoặc Command Trực Tiếp:

```bash
# Load nvm
source ~/.nvm/nvm.sh

# Phân tích
eyes_analyze ui-screenshot.png "Phân tích thiết kế UI này một cách chi tiết"

# Hoặc
human-mcp eyes_analyze ui-screenshot.png "Phân tích UI"
```

---

## 📋 Câu Hỏi Phân Tích Mẫu

### 1. Thiết Kế Tổng Thể
```
"Phân tích thiết kế tổng thể của UI này. Đánh giá visual hierarchy, 
spacing system, và layout organization."
```

### 2. Glassmorphism
```
"Đánh giá hiệu ứng glassmorphism trong UI này. Phân tích backdrop-filter, 
transparency, borders, và shadow effects. So sánh với phong cách Apple."
```

### 3. Buttons
```
"Phân tích thiết kế buttons trong UI này. Đánh giá các states (normal, hover, 
active, disabled), ripple effects, và button hierarchy."
```

### 4. Color & Typography
```
"Phân tích color palette và typography system. Đánh giá contrast ratios, 
readability, và accessibility."
```

### 5. UX Patterns
```
"Phân tích UX patterns được sử dụng. Đánh giá user flow, feedback mechanisms, 
và interaction design."
```

### 6. So Sánh với Best Practices
```
"So sánh UI này với Material Design và Apple HIG. Đưa ra nhận xét và 
gợi ý cải thiện."
```

---

## 🎨 Mô Tả UI Hiện Tại (Để Tham Khảo)

### Kích Thước
- Width: 500px
- Min Height: 600px

### Design System
- **Theme**: Ocean Blue (Glassmorphism)
- **Primary Color**: #2563eb
- **Background**: Gradient với pattern
- **Buttons**: Glassmorphism với ripple effects

### Components
1. **Header**: Title + Language toggle
2. **Prompt Input**: Textarea + Import button
3. **Type Selection**: Image/Video buttons
4. **Settings**: Collapsible section
5. **Control Buttons**: Start/Pause/Resume/Stop
6. **Progress**: Animated progress bar
7. **Log**: Dark scrollable area

### Visual Features
- Glassmorphism buttons với backdrop-filter
- Ripple effects (Material Design)
- Smooth animations (0.3s ease)
- Gradient backgrounds
- Icon integration (emoji)
- Loading states với animated dots

---

## ⚠️ Lưu Ý

Nếu human-mcp gặp lỗi API:
1. Kiểm tra kết nối internet
2. Kiểm tra API key configuration
3. Thử lại sau vài phút
4. Xem documentation: https://github.com/goonnguyen/human-mcp

---

## 🚀 Quick Start

```bash
# 1. Chụp screenshot và lưu với tên ui-screenshot.png

# 2. Phân tích
source ~/.nvm/nvm.sh
bash analyze-screenshot.sh
```

