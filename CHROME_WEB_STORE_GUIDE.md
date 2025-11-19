# 🌐 HƯỚNG DẪN ĐĂNG EXTENSION LÊN CHROME WEB STORE

## 📚 **MỤC LỤC**
1. [Chuẩn bị trước khi submit](#step-1)
2. [Tạo tài khoản Chrome Web Store Developer](#step-2)
3. [Tạo file ZIP](#step-3)
4. [Tạo store listing](#step-4)
5. [Submit extension](#step-5)
6. [Review process](#step-6)

---

## <a name="step-1"></a>📦 **BƯỚC 1: CHUẨN BỊ TRƯỚC KHI SUBMIT**

### **1.1. Test Extension Locally**

```bash
# 1. Mở Chrome
chrome://extensions/

# 2. Enable "Developer mode" (góc trên phải)

# 3. Click "Load unpacked"

# 4. Chọn folder extension
/home/user/chrome-extension-auto-flow-veo-1-17Nov25/

# 5. Test tất cả features:
- Import prompts
- Select Image/Video
- Start automation
- Check logs
- Verify downloads
```

### **1.2. Chụp Screenshots** 📸

**Yêu cầu:**
- Size: **1280x800** (recommended) hoặc 640x400
- Format: PNG hoặc JPEG
- Số lượng: 1-5 screenshots

**Cách chụp:**

```bash
# Option 1: Sử dụng Chrome DevTools
1. Mở extension popup
2. F12 → Console → Type:
   document.body.style.width = '1280px'
   document.body.style.height = '800px'
3. Cmd/Ctrl + Shift + P → "Capture screenshot"

# Option 2: Sử dụng tool chụp màn hình
- macOS: Cmd + Shift + 4
- Windows: Win + Shift + S
- Linux: Flameshot, GNOME Screenshot
```

**Screenshots nên chụp:**
1. ✅ Extension popup với prompts (main screen)
2. ✅ Settings panel mở ra
3. ✅ Extension đang chạy (progress bar + logs)
4. ✅ Toast notification success
5. ✅ Empty state (optional)

Lưu screenshots vào folder: `store-assets/screenshots/`

### **1.3. Host Privacy Policy** 🔒

**Option A: GitHub Pages (Recommended - Miễn phí)**

```bash
# 1. Tạo file privacy-policy.html
cp PRIVACY_POLICY_TEMPLATE.md privacy-policy.html

# 2. Convert Markdown to HTML (hoặc dùng template)
# Tôi sẽ tạo file HTML cho bạn

# 3. Commit và push
git add privacy-policy.html
git commit -m "Add privacy policy for Chrome Web Store"
git push

# 4. Enable GitHub Pages
# Vào Settings → Pages → Source: main branch → Save

# 5. URL sẽ là:
# https://annecao-ca.github.io/chrome-extension-auto-flow-veo-1-17Nov25/privacy-policy.html
```

**Option B: Google Sites**
1. Vào https://sites.google.com
2. Tạo site mới
3. Copy nội dung từ PRIVACY_POLICY_TEMPLATE.md
4. Publish
5. Copy URL

**Option C: Gist**
1. Vào https://gist.github.com
2. Paste PRIVACY_POLICY_TEMPLATE.md
3. Create public gist
4. Copy URL

### **1.4. Viết Store Description**

Tôi đã chuẩn bị template cho bạn (xem bên dưới)

---

## <a name="step-2"></a>👤 **BƯỚC 2: TẠO TÀI KHOẢN CHROME WEB STORE DEVELOPER**

### **2.1. Đăng ký Developer Account**

1. **Vào**: https://chrome.google.com/webstore/devconsole

2. **Đăng nhập** bằng Google Account

3. **Trả phí đăng ký**: $5 USD (một lần duy nhất)
   - Chấp nhận điều khoản
   - Nhập thông tin thanh toán
   - Xác nhận

4. **Verify email** (nếu được yêu cầu)

⏱️ **Thời gian**: 5-10 phút

---

## <a name="step-3"></a>📦 **BƯỚC 3: TẠO FILE ZIP**

### **3.1. Files cần đưa vào ZIP**

**✅ Bắt buộc:**
```
manifest.json
background.js
popup.html
popup.css
popup.js
constants.js
utils.js
i18n.js
settings.js
loading-utils.js
empty-states.js
button-effects.js
design-system.css
content/
  ├── dom-helpers.js
  ├── prompt-filler.js
  ├── monitor.js
  └── main.js
icons/
  ├── icon16.png
  ├── icon48.png
  └── icon128.png
```

**❌ KHÔNG đưa vào:**
```
.git/
.gitignore
node_modules/
*.md (except if needed)
*.backup
*.log
debug files
test files
store-assets/
```

### **3.2. Tạo ZIP tự động**

Tôi sẽ tạo script cho bạn (xem bên dưới)

---

## <a name="step-4"></a>🎨 **BƯỚC 4: TẠO STORE LISTING**

### **4.1. Thông tin cơ bản**

**Extension Name:**
```
Auto Flow Veo - Batch Image/Video Creator
```

**Short Description** (132 ký tự max):
```
Automate batch image and video creation on Google Flow/Veo3. Import prompts, set options, and generate media automatically.
```

**Detailed Description:**
```
Auto Flow Veo là Chrome Extension giúp tự động hóa việc tạo hình ảnh và video hàng loạt trên Google Flow/Veo3.

🚀 TÍNH NĂNG CHÍNH:

✅ Tạo hàng loạt hình ảnh/video tự động
✅ Import prompts từ file .txt
✅ Hỗ trợ cả Image và Video generation
✅ Tùy chỉnh số lần lặp lại mỗi prompt
✅ Character & Scene consistency descriptions
✅ Smart delay để tránh bị phát hiện bot
✅ Tự động tải về kết quả
✅ Giao diện song ngữ (Tiếng Việt/English)
✅ Theo dõi tiến trình real-time
✅ Tạm dừng, tiếp tục, dừng bất cứ lúc nào

🎯 CÁCH SỬ DỤNG:

1. Mở Google Flow/Veo3 (flow.google.com)
2. Click vào icon extension
3. Nhập hoặc import danh sách prompts
4. Chọn loại: Image hoặc Video
5. Click "Bắt đầu" và để extension làm việc!

💡 PERFECT FOR:

- Content creators cần tạo nhiều variations
- Marketers thử nghiệm nhiều concepts
- Designers cần batch generation
- Anyone muốn tiết kiệm thời gian!

⚡ HIỆU SUẤT:

- Smart 3-stage waiting logic
- Tự động retry khi có lỗi
- Monitor completion chính xác
- Không làm spam Google servers

🔒 SECURITY & PRIVACY:

- Không thu thập dữ liệu cá nhân
- Chỉ hoạt động trên flow.google.com
- Code nguồn mở, có thể review
- CSP security enabled

📚 DOCUMENTATION:

Full documentation và source code tại GitHub:
https://github.com/annecao-ca/chrome-extension-auto-flow-veo-1-17Nov25

🆘 SUPPORT:

Report issues: GitHub Issues
Email: [your-email@example.com]

⚠️ LƯU Ý:

Extension này tuân thủ Google Flow/Veo3 Terms of Service.
Sử dụng với tốc độ hợp lý để tránh quá tải server.

Version 1.0.1 - Updated Nov 2025
```

**Category:**
- Productivity

**Language:**
- Vietnamese (primary)
- English (secondary)

### **4.2. Assets**

**Icon** (128x128):
- Upload: `icons/icon128.png`

**Screenshots** (1280x800):
- Upload tất cả screenshots đã chụp
- Thêm captions cho mỗi screenshot:
  - "Extension popup with prompt input"
  - "Automation in progress with real-time logs"
  - "Settings panel with advanced options"
  - "Success notification"

**Promotional Images** (Optional):
- Small tile: 440x280
- Large tile: 920x680
- Marquee: 1400x560

### **4.3. Privacy**

**Privacy Policy URL:**
```
https://annecao-ca.github.io/chrome-extension-auto-flow-veo-1-17Nov25/privacy-policy.html
```

**Permissions justification:**

```
activeTab: Cần để interact với Google Flow/Veo3 tab
storage: Lưu settings và state của user
downloads: Auto-download generated media
tabs: Tìm Google Flow/Veo3 tab đang mở
scripting: Inject content script vào Flow/Veo3
notifications: Thông báo cho user khi hoàn thành
```

---

## <a name="step-5"></a>🚀 **BƯỚC 5: SUBMIT EXTENSION**

### **5.1. Upload ZIP**

1. **Vào Developer Dashboard:**
   https://chrome.google.com/webstore/devconsole

2. **Click "New Item"** (góc trên bên trái)

3. **Upload ZIP file:**
   - Click "Choose file"
   - Select `auto-flow-veo-extension.zip`
   - Click "Upload"

4. **Đợi validation:**
   - Chrome sẽ validate manifest.json
   - Check permissions
   - Scan for malware
   - ⏱️ Mất ~30 giây

### **5.2. Điền Store Listing**

1. **Product Details:**
   - Extension Name
   - Description
   - Category
   - Language

2. **Privacy:**
   - Privacy Policy URL
   - Permissions justification

3. **Graphic Assets:**
   - Icon 128x128
   - Screenshots (1-5)
   - Promotional images (optional)

4. **Distribution:**
   - Visibility: Public / Unlisted / Private
   - Pricing: Free
   - Regions: All countries (or specific)

### **5.3. Review & Submit**

1. **Preview listing:**
   - Click "Preview"
   - Check tất cả thông tin đúng
   - Check screenshots hiển thị OK

2. **Submit for review:**
   - Click "Submit for review"
   - Confirm submission

3. **Đợi review:**
   - ⏱️ Thường mất 1-3 ngày làm việc
   - Có thể lâu hơn nếu cần review thủ công

---

## <a name="step-6"></a>⏳ **BƯỚC 6: REVIEW PROCESS**

### **6.1. Giai đoạn Review**

**Automated Review (30 phút - 2 giờ):**
- ✅ Manifest validation
- ✅ Security scan
- ✅ Permissions check
- ✅ Privacy policy check

**Manual Review (1-3 ngày):**
- 👤 Human reviewer test extension
- 👤 Check for policy violations
- 👤 Verify functionality
- 👤 Check content appropriateness

### **6.2. Kết quả có thể**

**✅ APPROVED:**
- Extension published lên store
- Nhận email thông báo
- User có thể cài đặt ngay

**⚠️ NEEDS WORK:**
- Chrome yêu cầu sửa lỗi
- List các issues cần fix
- Phải upload version mới

**❌ REJECTED:**
- Vi phạm policies
- Có thể appeal quyết định
- Cần sửa nghiêm trọng

### **6.3. Sau khi Approved**

**Extension URL:**
```
https://chrome.google.com/webstore/detail/[extension-id]
```

**Chia sẻ:**
- Thêm badge vào README.md
- Share trên social media
- Update documentation

**Monitor:**
- Check ratings & reviews
- Respond to user feedback
- Track installation stats

---

## 📊 **TIMELINE TỔNG QUAN**

| Bước | Thời gian | Ghi chú |
|------|-----------|---------|
| Chuẩn bị assets | 1-2 giờ | Screenshots, Privacy Policy |
| Đăng ký Developer | 10 phút | $5 fee |
| Tạo ZIP & upload | 5 phút | Automated |
| Điền store listing | 30 phút | Careful & complete |
| Automated review | 30 phút - 2 giờ | Instant feedback |
| Manual review | 1-3 ngày | Patience needed |
| **TOTAL** | **~2-4 ngày** | From start to publish |

---

## ✅ **CHECKLIST CUỐI CÙNG**

Trước khi submit, check lại:

- [ ] Extension đã test kỹ locally
- [ ] Tất cả features hoạt động
- [ ] Không có errors trong console
- [ ] Screenshots đẹp và rõ ràng (1-5 ảnh)
- [ ] Privacy Policy đã host
- [ ] Store description đầy đủ và hấp dẫn
- [ ] Manifest.json đúng format
- [ ] Icons tất cả sizes
- [ ] ZIP file không chứa junk files
- [ ] Developer account đã setup
- [ ] Đã đọc Chrome Web Store policies
- [ ] Đã review lại tất cả permissions

---

## 🆘 **TROUBLESHOOTING**

### **Lỗi thường gặp:**

**"Manifest file is missing or unreadable"**
→ Check manifest.json có trong root của ZIP

**"Invalid icon dimensions"**
→ Icon phải đúng 16x16, 48x48, 128x128 pixels

**"Privacy policy URL is required"**
→ Phải host privacy policy trên URL công khai

**"Permissions not justified"**
→ Viết rõ lý do cần mỗi permission

**"Screenshots required"**
→ Phải có ít nhất 1 screenshot 1280x800

---

## 🎉 **SAU KHI PUBLISH**

### **Marketing:**
1. Share trên Twitter/Facebook/LinkedIn
2. Post trên Product Hunt
3. Write blog post
4. Submit to extension directories

### **Maintenance:**
1. Monitor user reviews
2. Fix bugs nhanh
3. Add features dựa trên feedback
4. Update regularly

### **Updates:**
```bash
# 1. Bump version in manifest.json
"version": "1.0.2"

# 2. Tạo ZIP mới
./create-store-package.sh

# 3. Upload lên Developer Console
# Upload new version

# 4. Submit for review again
```

---

## 📞 **SUPPORT**

**Chrome Web Store Help:**
- https://support.google.com/chrome_webstore/

**Developer Docs:**
- https://developer.chrome.com/docs/webstore/

**Policies:**
- https://developer.chrome.com/docs/webstore/program-policies/

**Community:**
- Stack Overflow: [google-chrome-extension]
- Reddit: /r/chrome_extensions

---

## 🎯 **TÓM TẮT NHANH**

```bash
# 1. Test extension locally
chrome://extensions/ → Load unpacked

# 2. Chụp screenshots (1280x800)

# 3. Host Privacy Policy (GitHub Pages)

# 4. Tạo ZIP
./create-store-package.sh

# 5. Đăng ký Developer ($5)
https://chrome.google.com/webstore/devconsole

# 6. Upload ZIP + điền thông tin

# 7. Submit for review

# 8. Đợi 1-3 ngày

# 9. PUBLISHED! 🎉
```

---

**Good luck! 🚀**

Bạn có câu hỏi gì không? Tôi sẵn sàng giúp từng bước!
