# 🎨 Mô Tả UI - Auto Flow Veo Extension

## 📐 Kích Thước & Layout

- **Width**: 500px (fixed)
- **Min Height**: 600px
- **Background**: Gradient từ `#f8fafc` đến `#f1f5f9` với pattern nhẹ
- **Padding**: 16px container padding

## 🎨 Design System

### Color Palette (Ocean Blue Theme)
- **Primary**: #2563eb (Xanh dương)
- **Secondary**: #10b981 (Xanh lá)
- **Warning**: #f59e0b (Cam)
- **Danger**: #ef4444 (Đỏ)
- **Background**: #f8fafc → #f1f5f9 (Gradient)
- **Text Primary**: #1e293b
- **Text Secondary**: #64748b

### Typography
- **Font Family**: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto
- **Base Size**: 14px
- **Headings**: 20px (semibold)
- **Labels**: 14px (medium)
- **Small Text**: 12px

### Spacing System
- **XS**: 4px
- **SM**: 8px
- **MD**: 12px
- **LG**: 16px
- **XL**: 20px
- **2XL**: 24px
- **3XL**: 32px

## 🧩 Components

### 1. Header
- **Title**: "Auto Flow Veo" - 20px, semibold, màu primary
- **Language Toggle**: Button nhỏ ở góc phải
- **Border**: 2px solid ở dưới

### 2. Prompt Input Section
- **Card**: White background, 12px border-radius, shadow nhẹ
- **Textarea**: 
  - 8 rows
  - Border: 1px solid #e2e8f0
  - Border-radius: 8px
  - Padding: 12px 16px
  - Focus: Blue border với shadow ring
- **Import Button**: 
  - Glassmorphism style
  - Icon: 📁
  - Text: "Import từ file .txt"
  - Secondary variant (xám)

### 3. Type Selection
- **Buttons**: 2 buttons cạnh nhau
  - Image button: Icon 🖼️ + "Image"
  - Video button: Icon 🎬 + "Video"
- **Style**: Glassmorphism secondary
- **Active State**: Gradient primary với glow effect

### 4. Settings Section
- **Collapsible**: Có thể mở/đóng
- **Toggle Button**: ▼/▲
- **4 Input Fields**:
  - Số lần lặp lại
  - Bắt đầu từ prompt số
  - Delay tối thiểu
  - Delay tối đa

### 5. Control Buttons
- **Start Button**: 
  - Primary (xanh dương)
  - Icon: ▶️
  - Text: "Bắt đầu"
  - Disabled khi chưa có prompt
- **Pause Button**: 
  - Secondary (xám)
  - Icon: ⏸️
  - Text: "Tạm dừng"
- **Resume Button**: 
  - Primary (xanh dương)
  - Icon: ▶️
  - Text: "Tiếp tục"
- **Stop Button**: 
  - Destructive (đỏ)
  - Icon: ⏹️
  - Text: "Dừng"

### 6. Progress Section
- **Progress Text**: "Tiến trình: 0 / 0 (0%)"
- **Progress Bar**: 
  - Height: 10px
  - Border-radius: full (rounded)
  - Gradient: Primary → Secondary
  - Shimmer effect khi active
  - Pulse effect khi processing

### 7. Log Section
- **Header**: "Log:" + Clear button
- **Log Area**: 
  - Dark background (#1e293b)
  - Monospace font
  - Scrollable (max-height: 200px)
  - Color-coded entries:
    - Info: Blue
    - Success: Green
    - Warning: Yellow
    - Error: Red

## ✨ Glassmorphism Effects

### Buttons
- **Background**: rgba(255, 255, 255, 0.1) với backdrop-filter: blur(20px)
- **Border**: 1px solid rgba(255, 255, 255, 0.2)
- **Shadow**: 
  - Outer: 0 8px 32px rgba(0, 0, 0, 0.1)
  - Inset: 0 1px 0 rgba(255, 255, 255, 0.2)
- **Hover**: 
  - Sáng hơn
  - Nâng lên 2px
  - Glow effect
- **Active**: Nhấn xuống với inset shadow

### Cards (Sections)
- **Background**: White (#ffffff)
- **Border-radius**: 12px
- **Shadow**: 0 1px 3px rgba(0, 0, 0, 0.08)
- **Hover**: Shadow tăng lên

## 🎭 Interactive States

### Ripple Effect
- Material Design style
- Lan tỏa từ điểm click
- Animation: 0.6s cubic-bezier

### Loading States
- **Spinner**: Circular rotation
- **Dots**: Animated bouncing
- **Button Loading**: Text ẩn, spinner hiện

### Empty States
- Icon lớn (48px)
- Title + Message
- Suggestions box
- Action buttons

## 📱 Visual Hierarchy

1. **Primary Actions**: Start button (xanh dương, nổi bật)
2. **Secondary Actions**: Import, Clear log (xám)
3. **Destructive Actions**: Stop button (đỏ)
4. **Information**: Progress, Log (neutral)

## 🎨 Color Usage

- **Primary Blue**: Actions chính, links, active states
- **Green**: Success messages, progress completion
- **Orange**: Warnings, pause states
- **Red**: Errors, stop actions
- **Gray**: Secondary actions, disabled states

## 🔍 Key Visual Features

1. **Glassmorphism**: Tất cả buttons có hiệu ứng kính mờ
2. **Gradient Background**: Subtle gradient với pattern
3. **Smooth Animations**: Tất cả transitions 0.3s ease
4. **Ripple Effects**: Material Design style trên buttons
5. **Icon Integration**: Emoji icons trong buttons
6. **Progress Visualization**: Animated progress bar với shimmer
7. **Dark Log Area**: Contrast với light UI

## 📊 Layout Structure

```
┌─────────────────────────┐
│ Header (Title + Lang)   │
├─────────────────────────┤
│ Prompt Input Section    │
│  - Textarea             │
│  - Import Button        │
├─────────────────────────┤
│ Type Selection          │
│  - Image | Video        │
├─────────────────────────┤
│ Settings (Collapsible)  │
│  - 4 Input Fields       │
├─────────────────────────┤
│ Control Buttons         │
│  - Start/Pause/Resume/Stop│
├─────────────────────────┤
│ Progress                │
│  - Text + Bar           │
├─────────────────────────┤
│ Log                     │
│  - Header + Clear       │
│  - Dark Scrollable Area │
└─────────────────────────┘
```

## 🎯 Design Principles Applied

1. **Consistency**: Tất cả components dùng cùng design system
2. **Hierarchy**: Rõ ràng với colors và sizes
3. **Feedback**: Ripple, hover, loading states
4. **Accessibility**: Contrast ratios, focus states
5. **Modern**: Glassmorphism, smooth animations
6. **Professional**: Clean, organized layout

