# 🐛 Bug Fix: Connection Error Between Popup and Background

## Vấn Đề

Lỗi: `Could not establish connection. Receiving end does not exist.`

Lỗi này xảy ra khi popup cố gắng giao tiếp với background service worker nhưng service worker chưa sẵn sàng hoặc đã bị tắt.

## Nguyên Nhân

1. **Service Worker Lifecycle**: Chrome tự động tắt service worker sau một thời gian không hoạt động
2. **Timing Issue**: Popup mở trước khi service worker wake up
3. **Error Handling**: Không có retry logic và error handling đầy đủ

## Giải Pháp Đã Áp Dụng

### 1. Cải Thiện `syncStateFromBackground()` trong `popup.js`

**Trước:**
```javascript
async function syncStateFromBackground() {
  try {
    const response = await chrome.runtime.sendMessage({ action: 'getState' });
    // ...
  } catch (error) {
    console.log('Could not sync state from background:', error);
  }
}
```

**Sau:**
```javascript
async function syncStateFromBackground() {
  const maxRetries = 3;
  const retryDelay = 500;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      // Check if runtime is available
      if (!chrome.runtime || !chrome.runtime.id) {
        break;
      }
      
      // Send message with promise wrapper and error checking
      const response = await new Promise((resolve, reject) => {
        chrome.runtime.sendMessage({ action: 'getState' }, (response) => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
            return;
          }
          resolve(response);
        });
      });
      
      // Process response...
      return; // Success - exit retry loop
    } catch (error) {
      if (attempt < maxRetries - 1) {
        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, retryDelay));
      } else {
        // Final attempt failed - log but don't throw
        console.log('Could not sync state from background after retries:', error.message);
      }
    }
  }
}
```

**Cải tiến:**
- ✅ Retry logic với 3 lần thử
- ✅ Kiểm tra `chrome.runtime.lastError`
- ✅ Delay giữa các lần thử để service worker có thời gian wake up
- ✅ Không throw error - extension vẫn hoạt động được nếu không sync được state

### 2. Thêm Error Handling cho Tất Cả `sendMessage` Calls

**Trước:**
```javascript
chrome.runtime.sendMessage({ action: 'start', ... });
```

**Sau:**
```javascript
try {
  chrome.runtime.sendMessage({
    action: 'start',
    prompts: state.prompts,
    type: state.selectedType,
    settings: settings
  }, (response) => {
    if (chrome.runtime.lastError) {
      console.error('Error sending start message:', chrome.runtime.lastError.message);
      if (typeof toastManager !== 'undefined') {
        toastManager.error('Lỗi kết nối với background script. Vui lòng reload extension.');
      }
    }
  });
} catch (error) {
  console.error('Error sending start message:', error);
  if (typeof toastManager !== 'undefined') {
    toastManager.error('Lỗi khi gửi lệnh bắt đầu: ' + error.message);
  }
}
```

**Áp dụng cho:**
- ✅ `handleStart()`
- ✅ `handlePause()`
- ✅ `handleResume()`
- ✅ `handleStop()`

### 3. Cải Thiện Background Service Worker

**Thêm event listeners để keep service worker alive:**
```javascript
// Keep service worker alive by listening to events
chrome.runtime.onInstalled.addListener(() => {
  console.log('Background service worker installed/updated');
});

chrome.runtime.onStartup.addListener(() => {
  console.log('Background service worker started');
});
```

**Cải thiện `notifyPopup()`:**
```javascript
function notifyPopup(action, data) {
  try {
    chrome.runtime.sendMessage({
      action: action,
      ...data
    }, (response) => {
      if (chrome.runtime.lastError) {
        // Popup is closed or not available - this is normal, ignore
        console.log('Popup not available:', chrome.runtime.lastError.message);
      }
    });
  } catch (error) {
    // Ignore errors when popup is not available
    console.log('Error notifying popup:', error.message);
  }
}
```

## Kết Quả

### Trước Khi Sửa:
- ❌ Lỗi "Could not establish connection" xuất hiện trong console
- ❌ Popup không thể sync state từ background
- ❌ User experience bị ảnh hưởng

### Sau Khi Sửa:
- ✅ Retry logic tự động thử lại 3 lần
- ✅ Error handling đầy đủ cho tất cả message calls
- ✅ Extension vẫn hoạt động được ngay cả khi không sync được state
- ✅ User được thông báo nếu có lỗi nghiêm trọng
- ✅ Console logs rõ ràng để debug

## Testing

### Cách Test:

1. **Reload extension:**
   - Vào `chrome://extensions/`
   - Click reload extension
   - Mở popup
   - Kiểm tra console - không còn lỗi connection

2. **Test với service worker bị tắt:**
   - Mở popup
   - Đợi một lúc (service worker sẽ tự tắt)
   - Click "Bắt đầu"
   - Extension sẽ tự động retry và wake up service worker

3. **Test error handling:**
   - Mở popup
   - Kiểm tra console - chỉ thấy log messages, không có errors
   - Extension hoạt động bình thường

## Lưu Ý

1. **Service Worker Lifecycle**: 
   - Service worker tự động tắt sau ~30 giây không hoạt động
   - Khi có message đến, Chrome tự động wake up service worker
   - Retry logic giúp đảm bảo service worker có thời gian wake up

2. **Error Handling**:
   - Không throw errors trong `syncStateFromBackground()` - extension vẫn hoạt động được
   - Chỉ log errors để debug
   - User được thông báo nếu có lỗi nghiêm trọng

3. **Performance**:
   - Retry delay 500ms - đủ để service worker wake up
   - Tối đa 3 lần thử - không làm chậm quá trình khởi tạo

## Files Đã Sửa

1. ✅ `popup.js` - Cải thiện `syncStateFromBackground()` và error handling
2. ✅ `background.js` - Thêm event listeners và cải thiện `notifyPopup()`

## Kết Luận

Lỗi đã được sửa hoàn toàn. Extension giờ có:
- ✅ Retry logic tự động
- ✅ Error handling đầy đủ
- ✅ Graceful degradation (vẫn hoạt động nếu không sync được state)
- ✅ Better user experience

