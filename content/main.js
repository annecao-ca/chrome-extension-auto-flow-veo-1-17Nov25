// Content Script Main Entry Point
// Main entry point for content script - coordinates all modules

// ===== IMPORTS =====
// Note: In browser extension context, these would be loaded via manifest.json
// For now, we assume all functions are available in global scope

// From constants.js: DELAYS, TIMEOUTS, RETRY_CONFIG, DEBUG_MODE
// From dom-helpers.js: isElementVisible, sleep, debugFindInputs, debugFindButtons, waitForElement, enhancePromptForConsistency
// From prompt-filler.js: fillPromptInput, clickCreateButton
// From monitor.js: monitorCompletion, triggerDownload, fallbackDirectDownload

// ===== GLOBAL VARIABLES =====
let isProcessing = false;
let currentPrompt = null;
let currentType = null;
let initialMediaCount = 0; // Track media count when starting a new prompt
let initialMediaSrcs = new Set(); // Track media sources when starting

// ===== UTILITY FUNCTIONS =====
function logToPopup(type, message) {
  chrome.runtime.sendMessage({
    action: 'log',
    type: type,
    message: message
  }).catch(() => {
    // Ignore errors
  });
}

function waitForPageReady() {
  return new Promise((resolve) => {
    if (document.readyState === 'complete') {
      resolve();
    } else {
      window.addEventListener('load', resolve);
    }
  });
}

// ===== MAIN PROCESS FUNCTION =====
async function handleProcessPrompt(message) {
  if (isProcessing) {
    if (DEBUG_MODE) {
      console.log('Already processing, skipping...');
    }
    logToPopup('warning', 'Đang xử lý prompt khác, bỏ qua...');
    return;
  }
  
  isProcessing = true;
  currentPrompt = message.prompt;
  currentType = message.type;
  
  // ENHANCE PROMPT: Add character and scene description for consistency
  const enhancedPrompt = enhancePromptForConsistency(
    currentPrompt,
    message.characterDescription || '',
    message.sceneDescription || ''
  );
  
  if (enhancedPrompt !== currentPrompt) {
    logToPopup('info', 'Đã enhance prompt với character/scene description để giữ consistency');
    currentPrompt = enhancedPrompt; // Use enhanced prompt
  }
  
  logToPopup('info', `Bắt đầu xử lý prompt ${message.promptIndex}/${message.totalPrompts}: "${currentPrompt.substring(0, 50)}..."`);
  
  try {
    // Wait for page to be ready
    await waitForPageReady();
    logToPopup('info', 'Trang đã sẵn sàng');
    
    // CRITICAL: Record initial media count and sources BEFORE processing
    // This ensures we only count NEW media created for this prompt
    const existingMedia = document.querySelectorAll('video, img[src*="flow"], img[src*="veo"], img[src*="google"], canvas, [class*="preview" i], [class*="result" i]');
    initialMediaCount = 0;
    initialMediaSrcs = new Set();
    
    for (const media of existingMedia) {
      if (isElementVisible(media)) {
        if (media.tagName === 'IMG' && media.naturalWidth > 200) {
          initialMediaCount++;
          const src = media.src || media.currentSrc || '';
          if (src && src.length > 20) {
            initialMediaSrcs.add(src);
          }
        } else if (media.tagName === 'VIDEO' && media.duration > 0.5) {
          initialMediaCount++;
          const src = media.src || media.currentSrc || '';
          if (src && src.length > 20) {
            initialMediaSrcs.add(src);
          }
        } else if (media.offsetWidth > 300 && media.offsetHeight > 300) {
          initialMediaCount++;
        }
      }
    }
    
    logToPopup('info', `Đã ghi nhận ${initialMediaCount} media hiện có trên trang (sẽ chỉ count media MỚI)`);
    
    // Wait a bit more for React/Vue components to render (optimized for speed)
    await sleep(DELAYS.PAGE_LOAD);
    
    // Scroll to top to ensure we're at the right place
    window.scrollTo(0, 0);
    await sleep(DELAYS.MINIMAL);
    
    // Try to close any modals or overlays that might be blocking
    const closeButtons = document.querySelectorAll('button[aria-label*="close" i], button[aria-label*="đóng" i], [class*="close" i]');
    for (const closeBtn of closeButtons) {
      if (isElementVisible(closeBtn)) {
        try {
          closeBtn.click();
          await sleep(DELAYS.SHORT);
        } catch (e) {
          // Ignore
        }
      }
    }
    
    // Scroll to input area first
    const inputField = document.querySelector('textarea, input[type="text"], [contenteditable="true"]');
    if (inputField) {
      inputField.scrollIntoView({ behavior: 'smooth', block: 'center' });
      await sleep(DELAYS.SHORT);
      logToPopup('info', 'Đã scroll đến input area');
    }
    
    // Find and fill prompt input
    logToPopup('info', 'Đang tìm ô nhập prompt...');
    const inputFound = await fillPromptInput(currentPrompt);
    if (!inputFound) {
      // Debug: Log all available inputs
      if (DEBUG_MODE) {
        const debugInputs = debugFindInputs();
        console.log('Debug - Available inputs:', debugInputs);
      }
      const debugInputs = debugFindInputs();
      logToPopup('error', `Không tìm thấy ô nhập prompt. Tìm thấy: ${debugInputs.textareas.length} textarea, ${debugInputs.inputs.length} input, ${debugInputs.contentEditable.length} contenteditable`);
      
      // Try to log details of the most promising input
      if (debugInputs.textareas.length > 0) {
        const largest = debugInputs.textareas.reduce((a, b) => a.height > b.height ? a : b);
        logToPopup('info', `Textarea lớn nhất: placeholder="${largest.placeholder}", aria-label="${largest.ariaLabel}"`);
      }
      if (debugInputs.contentEditable.length > 0) {
        const largest = debugInputs.contentEditable.reduce((a, b) => a.height > b.height ? a : b);
        logToPopup('info', `ContentEditable lớn nhất: role="${largest.role}", aria-label="${largest.ariaLabel}"`);
      }
      
      throw new Error('Không tìm thấy ô nhập prompt');
    }
    logToPopup('success', 'Đã điền prompt vào ô nhập');
    
    // Verify prompt was filled correctly
    let inputElement = document.querySelector('textarea, input[type="text"], [contenteditable="true"]');
    if (inputElement) {
      const currentValue = inputElement.value || inputElement.textContent || inputElement.innerText || '';
      if (!currentValue.includes(currentPrompt.substring(0, Math.min(20, currentPrompt.length)))) {
        logToPopup('warning', 'Prompt có thể chưa được điền đúng, thử lại...');
        // Try to fill again
        await fillPromptInput(currentPrompt);
        await sleep(DELAYS.MEDIUM);
      } else {
        logToPopup('info', `Đã verify prompt: "${currentValue.substring(0, 50)}..."`);
      }
    }
    
    // Wait for website validation (optimized for speed)
    logToPopup('info', 'Đang chờ website validate prompt...');
    await sleep(DELAYS.SHORT);
    
    // Try Enter key to submit (sometimes works better than clicking button)
    if (inputElement) {
      inputElement.focus();
      await sleep(DELAYS.MINIMAL);
      logToPopup('info', 'Thử Enter key để submit...');
      inputElement.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', keyCode: 13, bubbles: true }));
      inputElement.dispatchEvent(new KeyboardEvent('keypress', { key: 'Enter', code: 'Enter', keyCode: 13, bubbles: true }));
      inputElement.dispatchEvent(new KeyboardEvent('keyup', { key: 'Enter', code: 'Enter', keyCode: 13, bubbles: true }));
      await sleep(DELAYS.SHORT);
      
      // Check if Enter key triggered processing
      const hasProcessing = document.querySelector('[class*="loading" i], [class*="generating" i], [class*="processing" i], [aria-busy="true"]');
      if (hasProcessing) {
        logToPopup('success', 'Enter key đã trigger processing! Bỏ qua click button.');
        // Skip button click if Enter worked, but still verify processing started
        await sleep(DELAYS.SHORT);
        // Continue to verify processing section below
      } else {
        logToPopup('info', 'Enter key chưa trigger processing, sẽ thử click button...');
      }
    }
    
    // Check if there are any validation errors before clicking
    const validationErrors = document.querySelectorAll('[class*="error" i], [class*="Error" i], [role="alert"], [class*="invalid" i]');
    for (const err of validationErrors) {
      if (isElementVisible(err)) {
        const errorText = err.textContent || err.innerText;
        if (errorText && errorText.trim().length > 0 && !errorText.includes('Flow - SceneBuilder')) {
          logToPopup('warning', `Validation error: ${errorText.substring(0, 100)}`);
        }
      }
    }
    
    // Check if processing already started from Enter key
    const alreadyProcessing = document.querySelector('[class*="loading" i], [class*="generating" i], [class*="processing" i], [aria-busy="true"]');
    if (!alreadyProcessing) {
      // Click create button (Image or Video) only if Enter didn't work
      logToPopup('info', `Đang tìm nút tạo ${currentType}...`);
      
      // Debug: Log all available buttons before clicking
      if (DEBUG_MODE) {
        const debugButtons = debugFindButtons(currentType);
        if (debugButtons.length > 0) {
          console.log(`Debug - Available buttons for ${currentType}:`, debugButtons);
          logToPopup('info', `Tìm thấy ${debugButtons.length} nút có thể phù hợp`);
        }
      }
      
      await clickCreateButton(currentType);
    } else {
      logToPopup('info', 'Processing đã bắt đầu từ Enter key, bỏ qua click button');
    }
    
    // Wait and verify that processing actually started (optimized for speed)
    logToPopup('info', 'Đang verify website đã bắt đầu xử lý...');
    await sleep(DELAYS.SHORT);
    
    // Verify processing started - if not, retry (minimal retries)
    if (!inputElement) {
      inputElement = document.querySelector('textarea, input[type="text"], [contenteditable="true"]');
    }
    let processingStarted = false;
    for (let verifyAttempt = 0; verifyAttempt < 3; verifyAttempt++) {
      const hasProcessing = document.querySelector('[class*="loading" i], [class*="generating" i], [class*="processing" i], [aria-busy="true"]');
      const hasNewElements = document.querySelectorAll('video, img, canvas, [class*="preview" i], [class*="result" i]').length > 0;
      const inputCleared = inputElement && (inputElement.value === '' || inputElement.textContent === '');
      const buttonDisabled = document.querySelector('button[disabled], button[aria-disabled="true"]');
      
      if (hasProcessing || hasNewElements || inputCleared || buttonDisabled) {
        processingStarted = true;
        logToPopup('success', 'Đã xác nhận: website đang xử lý');
        break;
      }
      
      if (verifyAttempt < 2) {
        logToPopup('warning', `Chưa thấy dấu hiệu xử lý, thử lại lần ${verifyAttempt + 2}...`);
        await sleep(DELAYS.SHORT);
        
        // Retry click button - find arrow button again
        if (inputElement) {
          inputElement.focus();
          await sleep(DELAYS.MINIMAL);
          
          // Find arrow button near input
          const container = inputElement.closest('[class*="input"], [class*="form"], [class*="prompt"], [class*="text"], [class*="create"]') || inputElement.parentElement;
          if (container) {
            const arrowButtons = container.querySelectorAll('button, [role="button"]');
            for (const btn of arrowButtons) {
              if (isElementVisible(btn) && !btn.disabled) {
                const hasArrow = btn.querySelector('svg, [class*="arrow"], [class*="Arrow"]');
                if (hasArrow) {
                  btn.click();
                  logToPopup('info', 'Đã retry click arrow button');
                  await sleep(DELAYS.MINIMAL);
                  break;
                }
              }
            }
          }
        }
      }
    }
    
    if (!processingStarted) {
      logToPopup('error', 'Không thể xác nhận website đã bắt đầu xử lý. Có thể button chưa được click đúng.');
      throw new Error('Website không bắt đầu xử lý sau khi click button');
    }
    
    // Wait minimal time to see if there are any errors (optimized)
    await sleep(DELAYS.VERIFY);
    
    // Check for error messages more thoroughly
    const errorSelectors = [
      '[class*="error" i]',
      '[class*="Error" i]',
      '[role="alert"]',
      '[class*="fail" i]',
      '[class*="invalid" i]',
      '[aria-invalid="true"]'
    ];
    
    let hasError = false;
    for (const selector of errorSelectors) {
      const errorMessages = document.querySelectorAll(selector);
      for (const err of errorMessages) {
        if (isElementVisible(err)) {
          const errorText = err.textContent || err.innerText;
          if (errorText && errorText.trim().length > 0) {
            // Ignore generic page title errors
            if (!errorText.includes('Flow - SceneBuilder') && !errorText.includes('Flow')) {
              logToPopup('error', `Lỗi từ website: ${errorText.substring(0, 150)}`);
              hasError = true;
            }
          }
        }
      }
    }
    
    // If there's a real error, don't continue monitoring
    if (hasError) {
      logToPopup('warning', 'Có lỗi từ website, nhưng sẽ tiếp tục chờ kết quả...');
    }
    
    // Monitor for completion
    logToPopup('info', 'Đang chờ kết quả...');
    const completionResult = await monitorCompletion();
    
    // Only notify completion if media was actually found
    if (completionResult && completionResult.mediaFound) {
      chrome.runtime.sendMessage({ action: 'promptCompleted', mediaFound: true });
      logToPopup('success', `Đã hoàn thành: "${currentPrompt.substring(0, 50)}..."`);
    } else {
      logToPopup('error', `Không tìm thấy media cho prompt: "${currentPrompt.substring(0, 50)}..."`);
      logToPopup('warning', 'Tiếp tục với prompt tiếp theo nhưng media chưa được tạo');
      // Still notify to continue, but mark as no media
      chrome.runtime.sendMessage({ action: 'promptCompleted', mediaFound: false });
    }
    
  } catch (error) {
    console.error('Error processing prompt:', error);
    logToPopup('error', `Lỗi: ${error.message}`);
    chrome.runtime.sendMessage({ action: 'promptCompleted', mediaFound: false }); // Continue anyway
  } finally {
    isProcessing = false;
    currentPrompt = null;
    currentType = null;
  }
}

// ===== MESSAGE LISTENER =====
// Listen for messages from background script
// Setup listener immediately when script loads
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'ping') {
    // Respond to ping to confirm content script is loaded
    if (DEBUG_MODE) {
      console.log('[Content Script] Received ping, responding...');
    }
    sendResponse({ success: true, loaded: true });
    return true;
  } else if (message.action === 'processPrompt') {
    if (DEBUG_MODE) {
      console.log('[Content Script] Received processPrompt message');
    }
    handleProcessPrompt(message);
    sendResponse({ success: true });
    return true;
  }
  return true;
});

// Log that content script is loaded and ready
if (DEBUG_MODE) {
  console.log('[Content Script] Content script loaded and ready to receive messages');
}
