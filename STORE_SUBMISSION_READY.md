# 📦 Chrome Web Store Submission - Ready to Copy

## 1. Single Purpose Description

**Copy đoạn này vào phần "Single Purpose Description":**

Auto Flow Veo tự động hóa quá trình tạo hàng loạt hình ảnh và video trên Google Flow/Veo3. Tiện ích tự động điền prompts, click nút tạo, và theo dõi tiến trình xử lý, giúp bạn tiết kiệm thời gian khi cần tạo nhiều media cùng lúc mà không cần thao tác thủ công từng bước.

---

## 2. Permission Justification

**Copy đoạn này vào phần "Permission Justification":**

### Storage Permission
**Lý do:** Tiện ích cần lưu trữ cài đặt (số lần lặp lại, delays, vị trí bắt đầu) và danh sách prompts của người dùng để có thể tiếp tục công việc sau khi đóng popup hoặc khởi động lại trình duyệt. Tất cả dữ liệu được lưu LOCAL trên máy của người dùng, không gửi lên server.

### Tabs Permission
**Lý do:** Tiện ích cần tự động tìm tab Google Flow/Veo3 để thực hiện automation. Khi người dùng click "Bắt đầu", tiện ích sẽ tìm tab có URL chứa "flow.google.com" hoặc "labs.google.com" trong tất cả cửa sổ, sau đó gửi message đến tab đó để bắt đầu automation. Tiện ích KHÔNG tự động chuyển sang tab đó (người dùng có thể tiếp tục làm việc ở tab khác). Tiện ích CHỈ truy cập tabs có URL chứa "flow.google.com" hoặc "labs.google.com", KHÔNG đọc nội dung của các tabs khác.

### Scripting Permission
**Lý do:** Tiện ích cần inject content scripts vào trang Google Flow/Veo3 để tự động hóa các thao tác như điền prompt vào ô nhập, click nút tạo hình ảnh/video, và theo dõi trạng thái xử lý. Tiện ích CHỈ inject scripts vào các trang có URL chứa "flow.google.com" hoặc "labs.google.com", KHÔNG inject vào các websites khác.

### ActiveTab Permission
**Lý do:** Tiện ích cần truy cập tab hiện tại khi người dùng tương tác với popup để đọc URL và xác định có phải Google Flow/Veo3 không. Quyền này chỉ active khi người dùng click vào icon extension, KHÔNG truy cập tabs khi không có tương tác của người dùng.

### Downloads Permission
**Lý do:** Tiện ích theo dõi trạng thái download để thông báo cho người dùng khi file đã được tải về thành công từ Google Flow/Veo3. Tiện ích CHỈ theo dõi download completion, KHÔNG tự động tải file mà không có sự đồng ý của người dùng.

### Host Permissions (https://*.flow.google.com/*, https://labs.google/*)
**Lý do:** Tiện ích chỉ hoạt động trên Google Flow/Veo3, do đó cần quyền truy cập các domains này để inject content scripts và thực hiện automation. Tiện ích CHỈ hoạt động trên Google Flow/Veo3, KHÔNG truy cập, không thu thập dữ liệu, và không thực hiện bất kỳ thao tác nào trên các websites khác.

---

## 3. Data Collection & Privacy Policy

**Copy đoạn này vào phần "Data Collection & Privacy Policy":**

### Thu thập dữ liệu
Tiện ích **KHÔNG thu thập bất kỳ dữ liệu cá nhân nào**. Tiện ích chỉ lưu trữ dữ liệu LOCAL trên máy của người dùng:
- Cài đặt: số lần lặp lại, delay tối thiểu/tối đa, vị trí bắt đầu
- Danh sách prompts mà người dùng nhập vào
- Trạng thái workflow: tiến trình hiện tại, số task đã hoàn thành
- Tùy chọn ngôn ngữ (tiếng Việt/tiếng Anh)

Tất cả dữ liệu được lưu trữ LOCAL, **KHÔNG gửi lên server nào**, **KHÔNG chia sẻ với bên thứ ba**.

### Privacy Policy
**Chính sách quyền riêng tư:**

1. **Thu thập dữ liệu:** Tiện ích KHÔNG thu thập dữ liệu cá nhân, thông tin duyệt web, passwords, hoặc bất kỳ thông tin nhạy cảm nào. Chỉ lưu trữ LOCAL các cài đặt và prompts mà người dùng nhập vào.

2. **Lưu trữ dữ liệu:** Tất cả dữ liệu được lưu trữ LOCAL trên máy của người dùng trong Chrome's local storage. Người dùng có thể xóa dữ liệu bất cứ lúc nào.

3. **Chia sẻ dữ liệu:** Tiện ích KHÔNG chia sẻ dữ liệu với bất kỳ bên thứ ba nào, KHÔNG gửi dữ liệu lên server, KHÔNG sử dụng analytics hoặc tracking services.

4. **Quyền truy cập:** Tiện ích CHỈ hoạt động trên Google Flow/Veo3 (flow.google.com, labs.google.com), KHÔNG truy cập các websites khác, KHÔNG đọc nội dung của các tabs không liên quan.

5. **Bảo mật:** Tất cả dữ liệu được lưu trữ an toàn trên máy của người dùng. Không có kết nối mạng nào được thiết lập để gửi dữ liệu.

**Privacy Policy đầy đủ:** https://example.com/privacy

**Liên hệ:** [Your Email Address]

---

## 📝 Hướng Dẫn Sử Dụng

1. **Single Purpose Description:** Copy phần 1 vào trường "Single Purpose Description" trong Chrome Web Store Developer Dashboard

2. **Permission Justification:** Copy phần 2 vào trường "Permission Justification" 

3. **Data Collection & Privacy Policy:** Copy phần 3 vào trường "Data Collection & Privacy Policy"

4. **Lưu ý:** 
   - Thay `https://example.com/privacy` bằng URL Privacy Policy thực tế của bạn
   - Thay `[Your Email Address]` bằng email liên hệ thực tế
   - Đảm bảo Privacy Policy URL đã được publish và accessible

---

## ✅ Checklist

- [ ] Đã copy 3 phần vào Chrome Web Store Developer Dashboard
- [ ] Đã cập nhật Privacy Policy URL thực tế
- [ ] Đã cập nhật email liên hệ
- [ ] Đã kiểm tra chính tả và ngữ pháp
- [ ] Đã đảm bảo nội dung khớp với chức năng thực tế của extension

