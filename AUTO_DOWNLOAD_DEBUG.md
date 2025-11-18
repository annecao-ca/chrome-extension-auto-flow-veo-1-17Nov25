# 🔧 Debug Auto Download - Hướng Dẫn Khắc Phục

## ✅ Đã Cải Thiện Logic Download

### Các Cải Tiến:

1. **Tìm Video Element Mới Nhất**
   - Sắp xếp media elements theo vị trí trong DOM
   - Ưu tiên video/image mới được tạo

2. **Lấy URL Từ Nhiều Nguồn**
   - `video.src`
   - `video.currentSrc`
   - `video.getAttribute('src')`
   - `<source>` element bên trong video
   - `data-src` attribute

3. **Xử Lý Blob URL**
   - Tìm download button gần video element
   - Nếu không có button, fetch blob và tạo download link

4. **Tìm Download Button**
   - Tìm button gần media element mới nhất (Strategy 0)
   - Tìm button chung trên trang (Strategy 1)
   - Tìm button bằng text content (Strategy 3)

---

## 🐛 Cách Debug

### Bước 1: Kiểm Tra Console Log

1. Mở extension popup
2. Mở Developer Tools (F12) trên tab Google Flow/Veo3
3. Xem tab **Console**
4. Tìm các log messages:
   - `"Đang tìm cách tải về..."`
   - `"Tìm thấy video: ..."`
   - `"Đang tải về qua Chrome Downloads API..."`
   - `"Đã bắt đầu download ..."`

### Bước 2: Kiểm Tra Video Element

Trong Console, chạy:

```javascript
// Tìm tất cả video elements
const videos = document.querySelectorAll('video');
console.log('Tổng số video:', videos.length);

// Kiểm tra video mới nhất
const lastVideo = videos[videos.length - 1];
if (lastVideo) {
  console.log('Video mới nhất:');
  console.log('  - src:', lastVideo.src);
  console.log('  - currentSrc:', lastVideo.currentSrc);
  console.log('  - duration:', lastVideo.duration);
  console.log('  - readyState:', lastVideo.readyState);
  console.log('  - visible:', lastVideo.offsetWidth > 0 && lastVideo.offsetHeight > 0);
  
  // Kiểm tra source element
  const source = lastVideo.querySelector('source');
  if (source) {
    console.log('  - source src:', source.src);
  }
}
```

### Bước 3: Kiểm Tra Download Button

Trong Console, chạy:

```javascript
// Tìm download button
const downloadBtns = document.querySelectorAll(
  'button[aria-label*="download" i], ' +
  'button[aria-label*="tải" i], ' +
  'a[download]'
);
console.log('Tổng số download buttons:', downloadBtns.length);

downloadBtns.forEach((btn, i) => {
  console.log(`Button ${i + 1}:`, {
    text: btn.textContent,
    ariaLabel: btn.getAttribute('aria-label'),
    visible: btn.offsetWidth > 0 && btn.offsetHeight > 0,
    parent: btn.parentElement.className
  });
});
```

### Bước 4: Kiểm Tra Chrome Downloads API

1. Mở `chrome://extensions/`
2. Tìm extension "Auto Flow Veo"
3. Click "service worker" hoặc "background page"
4. Xem Console của background script
5. Tìm log messages về download

---

## 🔍 Các Vấn Đề Thường Gặp

### Vấn Đề 1: Video Không Có URL

**Triệu chứng:**
- Log: `"Không tìm thấy URL từ VIDEO element"`

**Nguyên nhân:**
- Video chưa load xong
- Video sử dụng blob URL hoặc data URL
- Video được load từ JavaScript

**Giải pháp:**
- Đợi thêm vài giây để video load
- Extension sẽ tự động tìm download button thay vì download trực tiếp

### Vấn Đề 2: Blob URL Không Download Được

**Triệu chứng:**
- Log: `"Phát hiện blob URL, đang tìm cách download..."`

**Nguyên nhân:**
- Chrome Downloads API không hỗ trợ blob URL trực tiếp

**Giải pháp:**
- Extension sẽ tự động:
  1. Tìm download button gần video
  2. Nếu không có, fetch blob và tạo download link

### Vấn Đề 3: Không Tìm Thấy Download Button

**Triệu chứng:**
- Log: `"Không tìm thấy nút tải về"`

**Nguyên nhân:**
- Website không có download button
- Button có selector khác

**Giải pháp:**
- Extension sẽ thử download trực tiếp từ video URL
- Nếu không được, bạn cần tải thủ công

### Vấn Đề 4: Chrome Downloads API Lỗi

**Triệu chứng:**
- Log: `"Chrome API error: ..."`

**Nguyên nhân:**
- Permission chưa được cấp
- URL không hợp lệ
- Network error

**Giải pháp:**
1. Kiểm tra `manifest.json` có permission `"downloads"` không
2. Reload extension
3. Kiểm tra URL có hợp lệ không (phải là http/https)

---

## 📋 Checklist Debug

- [ ] Console có log `"Đang tìm cách tải về..."` không?
- [ ] Console có log `"Tìm thấy video: ..."` không?
- [ ] Video element có `src` hoặc `currentSrc` không?
- [ ] Có download button trên website không?
- [ ] Chrome Downloads API có hoạt động không?
- [ ] Files có xuất hiện trong thư mục Downloads không?

---

## 🚀 Test Lại

Sau khi sửa, test lại:

1. **Reload extension:**
   - Mở `chrome://extensions/`
   - Click reload (biểu tượng vòng tròn)

2. **Test với 1 video:**
   - Nhập 1 prompt
   - Chọn Video
   - Click "Bắt đầu"
   - Mở Console và xem log
   - Kiểm tra thư mục Downloads

3. **Kiểm tra log:**
   - Xem log trong extension popup
   - Xem log trong Console (F12)
   - Xem log trong background script

---

## 💡 Tips

1. **Luôn mở Console khi test** để xem log chi tiết
2. **Kiểm tra video element** trước khi extension chạy
3. **Kiểm tra download button** có tồn tại không
4. **Reload extension** sau mỗi lần sửa code
5. **Kiểm tra permissions** trong `manifest.json`

---

## 📞 Nếu Vẫn Không Hoạt Động

Nếu sau khi debug vẫn không hoạt động, hãy cung cấp:

1. **Console logs** (copy toàn bộ)
2. **Video element info** (từ Bước 2)
3. **Download button info** (từ Bước 3)
4. **Background script logs** (từ Bước 4)
5. **Screenshot** của website khi video đã được tạo

---

**Chúc bạn debug thành công!** 🎉

