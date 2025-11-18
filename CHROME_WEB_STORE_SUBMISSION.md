# 📝 Chrome Web Store Submission - Required Sections

## 1. Single Purpose Description

### Mô tả ngắn gọn về mục đích chính của tiện ích:

**Auto Flow Veo** là tiện ích tự động hóa giúp bạn tạo hàng loạt hình ảnh và video trên Google Flow/Veo3 mà không cần thao tác thủ công. Tiện ích tự động điền prompts, click nút tạo, và theo dõi tiến trình xử lý, giúp bạn tiết kiệm thời gian khi cần tạo nhiều media cùng lúc.

---

## 2. Permission Justification

### Giải thích chi tiết từng quyền trong manifest.json:

#### 2.1. Permission: `storage`

**Lý do sử dụng:**
Tiện ích cần lưu trữ cài đặt và danh sách prompts của người dùng để có thể tiếp tục công việc sau khi đóng popup hoặc khởi động lại trình duyệt.

**Tính năng sử dụng quyền này:**
- Lưu trữ cài đặt: số lần lặp lại mỗi prompt, delay tối thiểu/tối đa, vị trí bắt đầu
- Lưu trữ danh sách prompts đã nhập
- Lưu trữ trạng thái workflow (đang chạy, đã tạm dừng, tiến trình)
- Lưu trữ tùy chọn ngôn ngữ (tiếng Việt/tiếng Anh)

**Ví dụ:** Khi người dùng nhập 10 prompts và cài đặt delay 90-120 giây, tiện ích lưu thông tin này vào local storage để có thể tiếp tục xử lý ngay cả khi popup bị đóng.

---

#### 2.2. Permission: `tabs`

**Lý do sử dụng:**
Tiện ích cần tự động tìm tab Google Flow/Veo3 để thực hiện automation. Vì người dùng có thể mở nhiều tabs, tiện ích cần quyền này để xác định tab nào đang chứa Google Flow/Veo3.

**Tính năng sử dụng quyền này:**
- Tìm kiếm tab có URL chứa "flow.google.com" hoặc "labs.google.com" trong tất cả cửa sổ
- Gửi messages đến content script trong tab đó để bắt đầu automation
- KHÔNG tự động chuyển sang tab đó (người dùng có thể tiếp tục làm việc ở tab khác)
- Automation chạy trong background, không cần tab phải active

**Ví dụ:** Khi người dùng click "Bắt đầu", tiện ích sẽ tự động tìm tab Google Flow/Veo3 (nếu chưa mở thì yêu cầu người dùng mở), sau đó gửi message đến tab đó để bắt đầu automation. Người dùng có thể chuyển sang tab khác và extension vẫn tiếp tục chạy trong background.

**Lưu ý:** Tiện ích CHỈ truy cập tabs có URL chứa "flow.google.com" hoặc "labs.google.com". Tiện ích KHÔNG đọc nội dung của các tabs khác.

---

#### 2.3. Permission: `scripting`

**Lý do sử dụng:**
Tiện ích cần inject content scripts vào trang Google Flow/Veo3 để tự động hóa các thao tác như điền prompt, click nút tạo, và theo dõi tiến trình.

**Tính năng sử dụng quyền này:**
- Inject content scripts vào trang Google Flow/Veo3 khi cần thiết
- Thực hiện automation: tìm và điền vào ô nhập prompt
- Click nút tạo hình ảnh/video tự động
- Theo dõi trạng thái xử lý và phát hiện khi media đã được tạo

**Ví dụ:** Khi tiện ích cần xử lý prompt tiếp theo, nó sẽ inject content script vào tab Google Flow/Veo3 (nếu chưa có), sau đó content script sẽ tự động điền prompt và click nút tạo.

**Lưu ý:** Tiện ích CHỈ inject scripts vào các trang có URL chứa "flow.google.com" hoặc "labs.google.com". Tiện ích KHÔNG inject vào các websites khác.

---

#### 2.4. Host Permissions: `https://*.flow.google.com/*` và `https://labs.google/*`

**Lý do sử dụng:**
Tiện ích chỉ hoạt động trên Google Flow/Veo3, do đó cần quyền truy cập các domains này để inject content scripts và thực hiện automation.

**Tính năng sử dụng quyền này:**
- Inject content scripts vào Google Flow/Veo3 pages
- Gửi messages giữa background script và content script
- Thực hiện automation trên các trang này

**Ví dụ:** Khi người dùng mở https://flow.google.com, tiện ích sẽ tự động inject content script để sẵn sàng nhận lệnh automation.

**Lưu ý:** Tiện ích CHỈ hoạt động trên Google Flow/Veo3. Tiện ích KHÔNG truy cập, không thu thập dữ liệu, và không thực hiện bất kỳ thao tác nào trên các websites khác.

---

#### 2.5. Permission: `downloads` (Nếu có trong manifest)

**Lý do sử dụng:**
Tiện ích theo dõi trạng thái download để thông báo cho người dùng khi file đã được tải về thành công.

**Tính năng sử dụng quyền này:**
- Theo dõi khi download hoàn thành
- Hiển thị thông báo "Đã tải về thành công" trong log

**Ví dụ:** Khi người dùng tải về hình ảnh/video từ Google Flow/Veo3, tiện ích sẽ phát hiện và thông báo trong log.

**Lưu ý:** Tiện ích CHỈ theo dõi download completion. Tiện ích KHÔNG tự động tải file mà không có sự đồng ý của người dùng.

---

#### 2.6. Permission: `activeTab` (Nếu có trong manifest)

**Lý do sử dụng:**
Tiện ích có thể cần truy cập tab hiện tại khi người dùng tương tác với popup để đọc hoặc cập nhật thông tin.

**Tính năng sử dụng quyền này:**
- Đọc URL của tab hiện tại để xác định có phải Google Flow/Veo3 không
- Hiển thị thông tin tab trong popup

**Lưu ý:** Quyền này chỉ active khi người dùng click vào icon extension. Tiện ích KHÔNG truy cập tabs khi không có tương tác của người dùng.

---

## 3. Data Collection & Privacy Policy

### 3.1. Khai báo thu thập dữ liệu:

**Tiện ích KHÔNG thu thập bất kỳ dữ liệu cá nhân nào.**

Tiện ích chỉ lưu trữ dữ liệu LOCAL trên máy của người dùng:

- **Settings (Cài đặt):** Số lần lặp lại, delay tối thiểu/tối đa, vị trí bắt đầu
- **Prompts List (Danh sách prompts):** Các prompts mà người dùng nhập vào
- **Workflow State (Trạng thái workflow):** Tiến trình hiện tại, số task đã hoàn thành
- **Language Preference (Tùy chọn ngôn ngữ):** Tiếng Việt hoặc tiếng Anh

**Tất cả dữ liệu được lưu trữ LOCAL, KHÔNG gửi lên server nào, KHÔNG chia sẻ với bên thứ ba.**

---

### 3.2. Privacy Policy:

**Chính sách quyền riêng tư - Auto Flow Veo Extension**

**1. Thu thập dữ liệu:**
- Tiện ích KHÔNG thu thập dữ liệu cá nhân
- Tiện ích KHÔNG thu thập thông tin duyệt web
- Tiện ích KHÔNG thu thập passwords, thông tin thanh toán, hoặc bất kỳ thông tin nhạy cảm nào
- Tiện ích chỉ lưu trữ LOCAL các cài đặt và prompts mà người dùng nhập vào

**2. Lưu trữ dữ liệu:**
- Tất cả dữ liệu được lưu trữ LOCAL trên máy của người dùng
- Dữ liệu được lưu trong Chrome's local storage
- Người dùng có thể xóa dữ liệu bất cứ lúc nào bằng cách xóa extension hoặc clear browser data

**3. Chia sẻ dữ liệu:**
- Tiện ích KHÔNG chia sẻ dữ liệu với bất kỳ bên thứ ba nào
- Tiện ích KHÔNG gửi dữ liệu lên server
- Tiện ích KHÔNG sử dụng analytics hoặc tracking services

**4. Quyền truy cập:**
- Tiện ích CHỈ hoạt động trên Google Flow/Veo3 (flow.google.com, labs.google.com)
- Tiện ích KHÔNG truy cập các websites khác
- Tiện ích KHÔNG đọc nội dung của các tabs không liên quan

**5. Bảo mật:**
- Tất cả dữ liệu được lưu trữ an toàn trên máy của người dùng
- Không có kết nối mạng nào được thiết lập để gửi dữ liệu
- Extension chỉ thực hiện automation trên Google Flow/Veo3 theo yêu cầu của người dùng

**6. Quyền của người dùng:**
- Người dùng có quyền xóa extension và tất cả dữ liệu bất cứ lúc nào
- Người dùng có quyền xem và chỉnh sửa settings trong popup
- Người dùng có quyền dừng automation bất cứ lúc nào

**7. Cập nhật:**
- Privacy Policy này có thể được cập nhật trong tương lai
- Người dùng sẽ được thông báo nếu có thay đổi quan trọng

**8. Liên hệ:**
- Nếu có câu hỏi về privacy, vui lòng liên hệ: [Your Email Address]

**Privacy Policy đầy đủ:** https://example.com/privacy

**Ngày cập nhật:** [Date]

---

## 📋 Checklist Trước Khi Submit

- [ ] Đã điền đầy đủ 3 phần bắt buộc
- [ ] Đã kiểm tra chính tả và ngữ pháp
- [ ] Đã cập nhật Privacy Policy URL thực tế
- [ ] Đã cập nhật email liên hệ
- [ ] Đã đảm bảo nội dung khớp với chức năng thực tế
- [ ] Đã test extension với permissions đã khai báo

---

## 💡 Lưu Ý

1. **Privacy Policy URL:** Thay `https://example.com/privacy` bằng URL thực tế của bạn
2. **Email:** Thay `[Your Email Address]` bằng email thực tế
3. **Date:** Thay `[Date]` bằng ngày hiện tại
4. **Permissions:** Chỉ liệt kê permissions thực sự có trong manifest.json
5. **Honesty:** Đảm bảo mô tả chính xác với chức năng thực tế của extension

