# 🧪 Hướng Dẫn Test Extension - Tất Cả Tính Năng

## ✅ Các Tính Năng Đã Tích Hợp

1. **Persistent UI** - Extension tiếp tục chạy khi đóng popup/chuyển tab
2. **Auto Download** - Tự động tải ảnh/video về máy
3. **Character/Scene Consistency** - Giữ nhân vật và cảnh đồng nhất
4. **Background Processing** - Không tự động chuyển tab, chạy trong background

---

## 📋 Checklist Test

### 1. Test Persistent UI (Badge + Notifications)

**Mục đích:** Kiểm tra extension tiếp tục chạy khi đóng popup/chuyển tab

**Các bước:**
1. ✅ Mở extension popup
2. ✅ Nhập 5-10 prompts
3. ✅ Chọn Image hoặc Video
4. ✅ Click "Bắt đầu"
5. ✅ **Đóng popup ngay lập tức** (extension không tự động đóng)
6. ✅ **Tự chuyển sang tab khác** để làm việc (extension không tự động chuyển tab)
7. ✅ **Quan sát:**
   - Badge trên icon extension hiển thị số tasks còn lại (ví dụ: "5")
   - Badge màu cyan (#06b6d4) khi đang chạy
   - Chrome notifications xuất hiện khi có progress
8. ✅ Mở lại popup - Vẫn thấy đầy đủ log và progress

**Kết quả mong đợi:**
- ✅ Badge hiển thị số tasks còn lại
- ✅ Notifications xuất hiện khi có progress milestones (25%, 50%, 75%, 100%)
- ✅ Extension tiếp tục chạy trong background
- ✅ Có thể làm việc ở tab khác mà không bị gián đoạn

---

### 2. Test Auto Download

**Mục đích:** Kiểm tra tự động tải ảnh/video về máy

**Các bước:**
1. ✅ Mở extension popup
2. ✅ Nhập 3-5 prompts
3. ✅ Chọn Image hoặc Video
4. ✅ Click "Bắt đầu"
5. ✅ Đợi media được tạo
6. ✅ **Kiểm tra thư mục Downloads:**
   - Files được tải về tự động
   - Tên file: `flow_{image|video}_{timestamp}.{png|mp4}`
7. ✅ Xem log trong extension - có thông báo "Đang tải về: ..."

**Kết quả mong đợi:**
- ✅ Files tự động xuất hiện trong thư mục Downloads
- ✅ Tên file rõ ràng, có timestamp
- ✅ Log hiển thị thông báo download
- ✅ Notification khi download hoàn thành

---

### 3. Test Character/Scene Consistency

**Mục đích:** Kiểm tra nhân vật và cảnh đồng nhất giữa các video/ảnh

**Các bước:**
1. ✅ Mở extension popup
2. ✅ Mở Settings
3. ✅ Điền **Character Description:**
   ```
   A distinguished European man named Arthur, 70 years old, white hair, friendly face
   ```
4. ✅ Điền **Scene Description:**
   ```
   Modern smart home environment, warm lighting, contemporary furniture
   ```
5. ✅ Nhập 3-4 prompts khác nhau (ví dụ):
   - "Gardening in the garden"
   - "Reading a book"
   - "Cooking in the kitchen"
   - "Watching TV"
6. ✅ Chọn Image hoặc Video
7. ✅ Click "Bắt đầu"
8. ✅ Đợi tất cả media được tạo
9. ✅ **Kiểm tra kết quả:**
   - Nhân vật trong tất cả media giống nhau (Arthur, 70 tuổi, tóc trắng)
   - Cảnh trong tất cả media đồng nhất (smart home, ánh sáng ấm, nội thất hiện đại)

**Kết quả mong đợi:**
- ✅ Nhân vật đồng nhất trong tất cả media
- ✅ Cảnh đồng nhất trong tất cả media
- ✅ Prompt gốc vẫn được giữ nguyên, chỉ thêm character/scene description

**Test không có Character/Scene Description:**
1. ✅ Xóa Character Description và Scene Description
2. ✅ Chạy lại với cùng prompts
3. ✅ Kết quả: Prompt giữ nguyên như ban đầu (không có enhancement)

---

### 4. Test Background Processing (Không Tự Động Chuyển Tab)

**Mục đích:** Kiểm tra extension không tự động chuyển tab, chạy trong background

**Các bước:**
1. ✅ Mở tab Google Flow/Veo3 (https://flow.google.com)
2. ✅ **Chuyển sang tab khác** (ví dụ: Gmail, YouTube, etc.)
3. ✅ Mở extension popup
4. ✅ Nhập prompts và click "Bắt đầu"
5. ✅ **Quan sát:**
   - Extension KHÔNG tự động chuyển về tab Google Flow/Veo3
   - Bạn vẫn có thể làm việc ở tab hiện tại
   - Badge và notifications vẫn hoạt động
6. ✅ Đợi một chút, sau đó chuyển về tab Google Flow/Veo3
7. ✅ **Kiểm tra:**
   - Media đã được tạo trong background
   - Extension vẫn đang chạy

**Kết quả mong đợi:**
- ✅ Extension KHÔNG tự động chuyển tab
- ✅ Extension chạy trong background
- ✅ Media vẫn được tạo bình thường
- ✅ Có thể làm việc ở tab khác mà không bị gián đoạn

---

### 5. Test Tổng Hợp (Tất Cả Tính Năng Cùng Lúc)

**Mục đích:** Kiểm tra tất cả tính năng hoạt động cùng nhau

**Các bước:**
1. ✅ Mở extension popup
2. ✅ Mở Settings
3. ✅ Điền Character Description và Scene Description
4. ✅ Nhập 10 prompts
5. ✅ Chọn Video
6. ✅ Click "Bắt đầu"
7. ✅ **Đóng popup ngay lập tức**
8. ✅ **Chuyển sang tab khác** để làm việc
9. ✅ **Quan sát:**
   - Badge hiển thị số tasks còn lại
   - Notifications xuất hiện khi có progress
   - Extension tiếp tục chạy trong background
10. ✅ Đợi 5-10 phút
11. ✅ **Kiểm tra:**
    - Files đã được tải về trong thư mục Downloads
    - Mở lại popup - thấy đầy đủ log và progress
    - Badge chuyển thành "✓" màu xanh khi hoàn thành
12. ✅ Xem các video đã tạo - nhân vật và cảnh đồng nhất

**Kết quả mong đợi:**
- ✅ Tất cả tính năng hoạt động cùng nhau
- ✅ Extension chạy trong background
- ✅ Auto download hoạt động
- ✅ Character/Scene consistency được áp dụng
- ✅ Persistent UI (badge + notifications) hoạt động

---

## 🐛 Troubleshooting

### Badge không hiển thị
- ✅ Kiểm tra extension đã được reload chưa
- ✅ Kiểm tra Chrome đã cho phép notifications chưa
- ✅ Mở `chrome://extensions/` và reload extension

### Download không hoạt động
- ✅ Kiểm tra Chrome Downloads permission
- ✅ Kiểm tra thư mục Downloads có đủ dung lượng không
- ✅ Xem log trong extension để biết lỗi cụ thể

### Character/Scene không đồng nhất
- ✅ Kiểm tra Character/Scene Description đã được điền chưa
- ✅ Kiểm tra prompt enhancement trong console (F12)
- ✅ Thử với description chi tiết hơn

### Extension dừng khi chuyển tab
- ✅ Kiểm tra background.js đã được cập nhật (không có `chrome.tabs.update`)
- ✅ Kiểm tra service worker vẫn đang chạy
- ✅ Reload extension và thử lại

---

## 📊 Test Results Template

```
Date: ___________
Tester: ___________

### 1. Persistent UI
- [ ] Badge hiển thị số tasks
- [ ] Notifications xuất hiện
- [ ] Extension chạy khi đóng popup
- [ ] Extension chạy khi chuyển tab

### 2. Auto Download
- [ ] Files tự động tải về
- [ ] Tên file đúng format
- [ ] Log hiển thị download

### 3. Character/Scene Consistency
- [ ] Character đồng nhất
- [ ] Scene đồng nhất
- [ ] Prompt enhancement hoạt động

### 4. Background Processing
- [ ] Không tự động chuyển tab
- [ ] Chạy trong background
- [ ] Media vẫn được tạo

### 5. Tổng Hợp
- [ ] Tất cả tính năng hoạt động
- [ ] Không có lỗi
- [ ] Performance tốt

Issues Found:
_________________________________
_________________________________
_________________________________
```

---

## ✅ Kết Luận

Sau khi test xong, bạn sẽ biết:
- ✅ Extension có hoạt động đúng không
- ✅ Tính năng nào cần điều chỉnh
- ✅ Có lỗi nào cần fix không

**Chúc bạn test thành công!** 🎉

