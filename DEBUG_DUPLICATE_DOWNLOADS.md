# 🔍 Hướng Dẫn Debug Duplicate Downloads

## ⚠️ QUAN TRỌNG: Reload Extension Sau Khi Sửa Code

Extension của bạn là **"Unpacked extension"**, nghĩa là bạn PHẢI reload extension sau mỗi lần sửa code!

### Cách Reload Extension:

1. Mở `chrome://extensions/`
2. Tìm extension **"Auto Flow Veo"**
3. Click nút **"Reload"** (hoặc icon refresh 🔄) ở góc trên bên phải của extension card
4. Hoặc toggle **OFF** rồi **ON** lại extension

## 📊 Kiểm Tra Logs Để Debug

### 1. Xem Background Service Worker Logs

1. Mở `chrome://extensions/`
2. Tìm extension **"Auto Flow Veo"**
3. Click **"service worker"** (hoặc "Inspect views" > "Service worker")
4. Một cửa sổ DevTools sẽ mở ra với console của background script
5. Xem logs khi extension chạy

### 2. Logs Bạn Sẽ Thấy:

#### Khi Download Bắt Đầu:
```
[Background] handleDownloadMedia called: { url: "...", filename: "...", promptIndex: "..." }
[Background] Base filename: "A_designers_hand_202511182029"
[Background] Downloaded filenames: []
[Background] Active downloads: []
[Background] ✅ New download starting: "A_designers_hand_202511182029.jpeg"
```

#### Khi Phát Hiện Duplicate:
```
[Background] Download created: { id: 123, filename: "A_designers_hand_202511182029 (1).jpeg", ... }
[Background] Filename: "A_designers_hand_202511182029 (1).jpeg"
[Background] Base filename: "A_designers_hand_202511182029"
[Background] Downloaded filenames: ["A_designers_hand_202511182029"]
[Background] DUPLICATE DETECTED! Canceling: "A_designers_hand_202511182029 (1).jpeg"
[Background] ✅ Đã hủy duplicate download: "A_designers_hand_202511182029 (1).jpeg"
```

### 3. Xem Content Script Logs

1. Mở trang **Google Flow/Veo3** (https://flow.google.com)
2. Mở DevTools (F12 hoặc Cmd+Option+I)
3. Chọn tab **Console**
4. Xem logs từ content script

## 🐛 Các Vấn Đề Thường Gặp

### Vấn Đề 1: Extension Chưa Được Reload

**Triệu chứng:**
- Không thấy logs trong background service worker
- Extension vẫn hoạt động như cũ

**Giải pháp:**
- Reload extension (xem hướng dẫn ở trên)
- Đảm bảo service worker đang **Active** (không phải Inactive)

### Vấn Đề 2: Service Worker Bị Inactive

**Triệu chứng:**
- Trong `chrome://extensions/`, thấy "Service worker (Inactive)"

**Giải pháp:**
- Click vào "service worker" để activate
- Hoặc reload extension

### Vấn Đề 3: Không Thấy Logs

**Triệu chứng:**
- Console trống, không có logs

**Giải pháp:**
- Đảm bảo đang xem đúng console (background.js, không phải page console)
- Thử trigger một download để xem logs xuất hiện
- Check xem có filter nào đang bật không

### Vấn Đề 4: Duplicate Vẫn Xảy Ra

**Triệu chứng:**
- Vẫn thấy file `(1)`, `(2)`, `(3)`...

**Kiểm tra:**
1. Xem logs trong background service worker
2. Tìm dòng `[Background] DUPLICATE DETECTED!`
3. Nếu không thấy dòng này, có nghĩa là:
   - Extension chưa được reload
   - `chrome.downloads.onCreated` listener chưa hoạt động
   - Website đang download trực tiếp (không qua Chrome API)

## 🔧 Test Extension

### Test 1: Kiểm Tra Intercept Hoạt Động

1. Reload extension
2. Mở background service worker console
3. Bắt đầu một prompt
4. Xem logs khi download bắt đầu
5. Nếu thấy duplicate, xem logs có hiển thị "DUPLICATE DETECTED" không

### Test 2: Kiểm Tra Base Filename Extraction

Trong background service worker console, test regex:
```javascript
const filename = "A_designers_hand_202511182029 (1).jpeg";
const baseFilename = filename.replace(/\s*\(\d+\)\.[^.]+$/, '').replace(/\.[^.]+$/, '');
console.log(baseFilename); // Should output: "A_designers_hand_202511182029"
```

## 📝 Checklist Trước Khi Test

- [ ] Extension đã được reload
- [ ] Service worker đang Active
- [ ] Background service worker console đã mở
- [ ] Content script console đã mở (trên trang Flow)
- [ ] Sẵn sàng xem logs khi test

## 🎯 Kết Quả Mong Đợi

Sau khi reload extension và test:

1. **Mỗi file chỉ download 1 lần** - không còn `(1)`, `(2)`, `(3)`...
2. **Logs hiển thị rõ ràng** - thấy "DUPLICATE DETECTED" khi có duplicate
3. **Duplicate bị hủy tự động** - thấy "✅ Đã hủy duplicate download"

Nếu vẫn còn vấn đề, hãy:
1. Copy toàn bộ logs từ background service worker console
2. Gửi cho tôi để phân tích

