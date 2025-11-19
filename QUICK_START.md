# 🚀 QUICK START - Đăng Extension Lên Chrome Web Store

## ⚡ **TÓM TẮT NHANH (5 PHÚT)**

```bash
# Bước 1: Tạo ZIP package
./create-store-package.sh

# Bước 2: Đăng ký Developer ($5)
# → https://chrome.google.com/webstore/devconsole

# Bước 3: Upload ZIP + điền thông tin
# → Sử dụng nội dung từ STORE_DESCRIPTION.md

# Bước 4: Submit for review
# → Đợi 1-3 ngày

# DONE! 🎉
```

---

## 📋 **CHECKLIST NHANH**

### **Đã có sẵn ✅**
- [x] Extension code hoàn chỉnh
- [x] Manifest.json v3
- [x] Icons tất cả sizes
- [x] CSP security
- [x] Error handling
- [x] Documentation đầy đủ
- [x] Store description template
- [x] Privacy policy HTML
- [x] Script tạo ZIP tự động

### **Cần làm ngay ⏳**
- [ ] Chụp screenshots (15 phút)
- [ ] Host privacy policy (5 phút)
- [ ] Đăng ký Developer account ($5)
- [ ] Tạo ZIP package (1 phút)
- [ ] Upload và submit (10 phút)

**Total time:** ~40 phút + 1-3 ngày review

---

## 📸 **BƯỚC 1: CHỤP SCREENSHOTS (15 PHÚT)**

### **Cách chụp nhanh:**

1. **Load extension vào Chrome:**
```bash
chrome://extensions/
→ Developer mode ON
→ Load unpacked
→ Chọn folder extension
```

2. **Chụp Screenshot 1 - Main UI:**
```
- Click icon extension
- Nhập vài prompts mẫu
- Select "Image" hoặc "Video"
- Chụp màn hình (Cmd+Shift+4 / Win+Shift+S)
- Resize về 1280x800 pixels
- Save as: screenshot-1-main-ui.png
```

3. **Chụp Screenshot 2 - Settings:**
```
- Click "Cài đặt" để mở settings panel
- Chụp màn hình
- Resize về 1280x800
- Save as: screenshot-2-settings.png
```

4. **Chụp Screenshot 3 - In Progress:**
```
- Start automation (hoặc fake bằng cách thêm log entries)
- Chụp khi có progress bar và logs
- Resize về 1280x800
- Save as: screenshot-3-progress.png
```

5. **Chụp Screenshot 4 - Success:**
```
- Trigger toast notification (hoặc inspect element)
- Chụp toast notification
- Resize về 1280x800
- Save as: screenshot-4-success.png
```

### **Tool resize nhanh:**
- Online: https://www.iloveimg.com/resize-image
- macOS: Preview → Tools → Adjust Size
- Windows: Paint → Resize
- Linux: GIMP → Image → Scale Image

### **Lưu vào folder:**
```bash
mkdir store-assets/screenshots
mv screenshot-*.png store-assets/screenshots/
```

---

## 🔒 **BƯỚC 2: HOST PRIVACY POLICY (5 PHÚT)**

### **Option A: GitHub Pages (Recommended)**

```bash
# 1. Add privacy-policy.html to git
git add privacy-policy.html
git commit -m "Add privacy policy for Chrome Web Store"
git push

# 2. Enable GitHub Pages
# Vào GitHub repo → Settings → Pages
# Source: main branch
# Save

# 3. Đợi 1-2 phút, URL sẽ là:
https://annecao-ca.github.io/chrome-extension-auto-flow-veo-1-17Nov25/privacy-policy.html

# 4. Test URL hoạt động chưa
curl -I [URL]
```

### **Option B: Quick Gist (2 phút)**

```bash
# 1. Vào https://gist.github.com
# 2. Paste nội dung privacy-policy.html
# 3. Create public gist
# 4. Click "Raw"
# 5. Copy URL
```

---

## 💰 **BƯỚC 3: ĐĂNG KÝ DEVELOPER ($5)**

```
1. Vào: https://chrome.google.com/webstore/devconsole
2. Đăng nhập Google Account
3. Accept terms
4. Pay $5 registration fee (one-time)
5. Verify email
⏱️ 5-10 phút
```

---

## 📦 **BƯỚC 4: TẠO ZIP PACKAGE (1 PHÚT)**

```bash
# Run script
./create-store-package.sh

# Output:
# ✅ auto-flow-veo-extension-v1.0.1.zip

# Verify ZIP contents:
unzip -l auto-flow-veo-extension-v1.0.1.zip | head -20
```

---

## 🌐 **BƯỚC 5: UPLOAD & SUBMIT (10 PHÚT)**

### **5.1. Upload ZIP (2 phút)**

```
1. Vào Developer Console:
   https://chrome.google.com/webstore/devconsole

2. Click "New Item" (top left)

3. Upload ZIP:
   → Choose file
   → Select: auto-flow-veo-extension-v1.0.1.zip
   → Upload

4. Đợi validation (~30s)
```

### **5.2. Product Details (3 phút)**

Copy-paste từ `STORE_DESCRIPTION.md`:

```
Extension Name:
→ Auto Flow Veo - Batch Image/Video Creator

Short Description:
→ [Copy từ STORE_DESCRIPTION.md]

Detailed Description:
→ [Copy từ STORE_DESCRIPTION.md]

Category:
→ Productivity

Language:
→ English (primary)
→ Vietnamese (add if needed)
```

### **5.3. Graphic Assets (2 phút)**

```
Icon 128x128:
→ Upload: icons/icon128.png

Screenshots (1280x800):
→ Upload all từ store-assets/screenshots/
→ Add captions cho mỗi ảnh (xem STORE_DESCRIPTION.md)

Promotional Tile (optional):
→ Skip for now (có thể thêm sau)
```

### **5.4. Privacy (1 phút)**

```
Privacy Policy URL:
→ [Your GitHub Pages URL]

Permissions Justification:
→ [Copy từ STORE_DESCRIPTION.md]

Data Usage:
→ Does NOT collect data ✓
```

### **5.5. Distribution (1 phút)**

```
Visibility:
→ Public (hoặc Unlisted nếu muốn test trước)

Pricing:
→ Free

Regions:
→ All countries
```

### **5.6. Submit (1 phút)**

```
1. Click "Preview" để xem trước
2. Check tất cả info đúng
3. Click "Submit for Review"
4. Confirm
```

---

## ⏳ **BƯỚC 6: ĐỢI REVIEW (1-3 NGÀY)**

```
Timeline:
├─ Automated Review: 30 min - 2 hours
│  ├─ Manifest validation ✓
│  ├─ Security scan ✓
│  └─ Permissions check ✓
│
└─ Manual Review: 1-3 days
   ├─ Human tester ✓
   ├─ Policy compliance ✓
   └─ Functionality check ✓

Email notification when:
→ Under review
→ Needs changes
→ Approved! 🎉
```

---

## 🎉 **SAU KHI APPROVED**

### **Extension URL:**
```
https://chrome.google.com/webstore/detail/[your-extension-id]
```

### **Update README.md:**
```markdown
## Installation

### From Chrome Web Store (Recommended)
[![Chrome Web Store](https://img.shields.io/chrome-web-store/v/[extension-id].svg)](https://chrome.google.com/webstore/detail/[extension-id])

[Install from Chrome Web Store](https://chrome.google.com/webstore/detail/[extension-id])
```

### **Share:**
```bash
# Twitter
# LinkedIn
# Reddit
# Product Hunt
# GitHub README badge
```

---

## 🆘 **TROUBLESHOOTING**

### **"Manifest invalid"**
```
→ Check manifest.json syntax
→ Validate at: https://json-validator.com
```

### **"Icons missing"**
```
→ Verify icons/ folder in ZIP
→ Check all sizes: 16, 48, 128
```

### **"Privacy policy required"**
```
→ Host privacy-policy.html
→ Enter public URL in form
→ Test URL is accessible
```

### **"Permissions not justified"**
```
→ Copy justification từ STORE_DESCRIPTION.md
→ Explain clearly WHY each permission needed
```

### **"Screenshots required"**
```
→ Need at least 1 screenshot
→ Size: 1280x800 or 640x400
→ Format: PNG or JPEG
```

---

## 📊 **PROGRESS TRACKER**

```
Extension Development:
├─ Code             ✅ Done (v1.0.1)
├─ Security         ✅ Done (CSP enabled)
├─ Error Handling   ✅ Done (robust)
├─ Documentation    ✅ Done (complete)
└─ Testing          ⏳ Your turn

Store Submission:
├─ Screenshots      ⏳ TODO (15 min)
├─ Privacy Policy   ⏳ TODO (5 min)
├─ Developer Acc    ⏳ TODO ($5 + 10 min)
├─ ZIP Package      ⏳ TODO (1 min)
├─ Upload           ⏳ TODO (10 min)
└─ Review           ⏳ Wait (1-3 days)

Post-Launch:
├─ Monitoring       ⏳ After approval
├─ User Support     ⏳ After approval
└─ Updates          ⏳ Ongoing
```

---

## 🎯 **ACTION PLAN**

### **Today (40 minutes):**
1. ☐ Chụp 4-5 screenshots (15 min)
2. ☐ Enable GitHub Pages (5 min)
3. ☐ Đăng ký Developer account ($5, 10 min)
4. ☐ Tạo ZIP package (1 min)
5. ☐ Upload & submit (10 min)

### **Tomorrow:**
1. ☐ Check email for review status
2. ☐ Respond to any feedback

### **Within 3 days:**
1. ☐ Get approval notification 🎉
2. ☐ Update README with store link
3. ☐ Share on social media
4. ☐ Monitor first users

---

## 📚 **USEFUL LINKS**

**Chrome Web Store:**
- Developer Console: https://chrome.google.com/webstore/devconsole
- Program Policies: https://developer.chrome.com/docs/webstore/program-policies
- Best Practices: https://developer.chrome.com/docs/webstore/best-practices

**Tools:**
- JSON Validator: https://json-validator.com
- Image Resize: https://www.iloveimg.com/resize-image
- Gist (Privacy Policy): https://gist.github.com

**Support:**
- Help Center: https://support.google.com/chrome_webstore
- Developer Forum: https://groups.google.com/a/chromium.org/g/chromium-extensions

---

## ✅ **READY TO GO?**

```bash
# Final check:
[ ] Code is tested and working
[ ] Screenshots are ready
[ ] Privacy policy is hosted
[ ] Developer account is set up
[ ] ZIP package is created
[ ] Store description is prepared

If all checked ✓ → START SUBMISSION!
```

**Good luck! 🚀**

Questions? Check `CHROME_WEB_STORE_GUIDE.md` for detailed walkthrough.
