# 📸 Hướng Dẫn Phân Tích UI với human-mcp

## 🎯 Mục Đích

Phân tích screenshot UI của extension để đánh giá:
- ✅ Thiết kế tổng thể
- ✅ UX/UI patterns
- ✅ Accessibility
- ✅ Visual hierarchy
- ✅ Color contrast
- ✅ Spacing và layout

---

## 📋 Các Bước

### Bước 1: Chụp Screenshot

#### Cách 1: Chụp Extension Popup (Khuyến nghị)

1. **Mở extension popup:**
   - Click vào icon extension trên Chrome
   - Hoặc load extension trong Developer mode

2. **Chụp screenshot:**
   - **macOS**: Nhấn `Cmd + Shift + 4`
   - Chọn vùng popup extension
   - Screenshot sẽ được lưu trên Desktop

3. **Đổi tên và di chuyển:**
   ```bash
   mv ~/Desktop/Screen\ Shot*.png ui-screenshot.png
   ```

#### Cách 2: Chụp từ File Preview

1. **Mở file preview:**
   ```bash
   open ui-preview.html
   ```

2. **Chụp screenshot:**
   - Nhấn `Cmd + Shift + 4`
   - Chọn vùng UI
   - Lưu với tên `ui-screenshot.png` trong thư mục project

#### Cách 3: Sử dụng Developer Tools

1. Mở extension popup
2. Right-click → Inspect
3. Trong DevTools, chọn element `.container`
4. Right-click → Capture node screenshot
5. Lưu với tên `ui-screenshot.png`

---

### Bước 2: Phân Tích với human-mcp

#### Sử dụng Script (Khuyến nghị)

```bash
# Chạy script tự động
bash analyze-ui.sh
```

#### Sử dụng Command Trực Tiếp

```bash
# Load nvm
source ~/.nvm/nvm.sh

# Phân tích screenshot
human-mcp eyes_analyze ui-screenshot.png

# Hoặc
human-mcp analyze ui-screenshot.png
```

---

## 🔍 Các Câu Hỏi Phân Tích

Khi phân tích, hãy hỏi human-mcp về:

### 1. Thiết Kế Tổng Thể
- "Phân tích thiết kế tổng thể của UI này"
- "Đánh giá visual hierarchy"
- "Nhận xét về spacing và layout"

### 2. Glassmorphism
- "Phân tích hiệu ứng glassmorphism trong UI"
- "Đánh giá backdrop-filter và transparency effects"
- "Nhận xét về border và shadow effects"

### 3. Buttons
- "Phân tích thiết kế buttons"
- "Đánh giá button states (hover, active, disabled)"
- "Nhận xét về button hierarchy"

### 4. Typography
- "Phân tích typography system"
- "Đánh giá font sizes và weights"
- "Nhận xét về readability"

### 5. Colors
- "Phân tích color palette"
- "Đánh giá color contrast"
- "Nhận xét về accessibility"

### 6. UX Patterns
- "Phân tích UX patterns được sử dụng"
- "Đánh giá user flow"
- "Nhận xét về feedback mechanisms"

---

## 📝 Ví Dụ Phân Tích

```bash
# Phân tích tổng thể
human-mcp eyes_analyze ui-screenshot.png "Phân tích thiết kế tổng thể và đưa ra nhận xét về UX/UI"

# Phân tích glassmorphism
human-mcp eyes_analyze ui-screenshot.png "Đánh giá hiệu ứng glassmorphism, backdrop-filter, và visual effects"

# Phân tích buttons
human-mcp eyes_analyze ui-screenshot.png "Phân tích thiết kế buttons, states, và interactions"

# Phân tích accessibility
human-mcp eyes_analyze ui-screenshot.png "Đánh giá accessibility, color contrast, và usability"
```

---

## 🎨 Checklist Phân Tích

Khi phân tích UI, kiểm tra:

- [ ] **Visual Hierarchy**: Thông tin quan trọng có nổi bật không?
- [ ] **Spacing**: Khoảng cách có nhất quán không?
- [ ] **Typography**: Text có dễ đọc không?
- [ ] **Colors**: Màu sắc có đủ contrast không?
- [ ] **Buttons**: Buttons có rõ ràng và dễ click không?
- [ ] **Glassmorphism**: Hiệu ứng có đẹp và mượt mà không?
- [ ] **Loading States**: Feedback có rõ ràng không?
- [ ] **Empty States**: Có hướng dẫn người dùng không?
- [ ] **Responsive**: Layout có responsive không?
- [ ] **Accessibility**: Có accessible không?

---

## 💡 Tips

1. **Chụp nhiều trạng thái:**
   - Normal state
   - Hover state
   - Active state
   - Loading state
   - Empty state

2. **Chụp trên nhiều nền:**
   - Light background
   - Dark background
   - Gradient background

3. **Phân tích từng component:**
   - Buttons riêng
   - Cards riêng
   - Forms riêng

---

## 🚀 Quick Start

```bash
# 1. Chụp screenshot và lưu với tên ui-screenshot.png

# 2. Phân tích
source ~/.nvm/nvm.sh
human-mcp eyes_analyze ui-screenshot.png "Phân tích UI này một cách chi tiết"
```

---

## 📚 Tài Liệu Tham Khảo

- **human-mcp**: https://github.com/goonnguyen/human-mcp
- **UI Analysis Best Practices**: Material Design, Apple HIG
- **Accessibility Guidelines**: WCAG 2.1

