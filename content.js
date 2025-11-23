// Content script - Automates actions on Google Flow/Veo3 website

let isProcessing = false;
let currentPrompt = null;
let currentType = null;
let initialMediaCount = 0; // Track media count when starting a new prompt
let initialMediaSrcs = new Set(); // Track media sources when starting
let autoDownloadEnsured = false;
// GLOBAL: Track ALL downloaded media sources across all prompts to prevent duplicates
// Use Set() for O(1) lookup performance and automatic deduplication
const globalDownloadedMediaSrcs = new Set();
// Also track by unique identifiers (position + size) for better duplicate detection
const globalDownloadedMediaIds = new Set();
// Track download buttons that have been clicked to prevent duplicate clicks
const clickedDownloadButtons = new WeakSet();
// Track media elements that have already triggered download (by unique ID)
const downloadedMediaElements = new Set();
// Track if download has been successfully triggered for this media
let downloadTriggeredForMedia = false;
// Track download attempts by timestamp to prevent rapid duplicate clicks
let lastDownloadAttemptTime = 0;
const MIN_DOWNLOAD_INTERVAL = 5000; // Minimum 5 seconds between download attempts for same media
// Track last button click time to prevent rapid clicks
let lastButtonClickTime = 0;
const MIN_BUTTON_CLICK_INTERVAL = 2000; // Minimum 2 seconds between button clicks

// Debug helper: Log all potential input elements
function debugFindInputs() {
  const inputs = {
    textareas: [],
    inputs: [],
    contentEditable: []
  };

  document.querySelectorAll('textarea').forEach((el, idx) => {
    if (isElementVisible(el)) {
      inputs.textareas.push({
        index: idx,
        placeholder: el.placeholder || '',
        ariaLabel: el.getAttribute('aria-label') || '',
        id: el.id || '',
        className: el.className || '',
        value: el.value ? el.value.substring(0, 50) : '',
        height: el.offsetHeight,
        width: el.offsetWidth
      });
    }
  });

  document.querySelectorAll('input[type="text"], input[type="search"]').forEach((el, idx) => {
    if (isElementVisible(el)) {
      inputs.inputs.push({
        index: idx,
        placeholder: el.placeholder || '',
        ariaLabel: el.getAttribute('aria-label') || '',
        id: el.id || '',
        className: el.className || '',
        value: el.value ? el.value.substring(0, 50) : '',
        height: el.offsetHeight,
        width: el.offsetWidth
      });
    }
  });

  document.querySelectorAll('[contenteditable="true"]').forEach((el, idx) => {
    if (isElementVisible(el)) {
      inputs.contentEditable.push({
        index: idx,
        role: el.getAttribute('role') || '',
        ariaLabel: el.getAttribute('aria-label') || '',
        id: el.id || '',
        className: el.className || '',
        textContent: el.textContent ? el.textContent.substring(0, 50) : '',
        height: el.offsetHeight,
        width: el.offsetWidth
      });
    }
  });

  return inputs;
}

// Debug helper: Log all potential button elements
function debugFindButtons(type) {
  const buttons = [];
  const searchTerms = type === 'image'
    ? ['image', 'hình', 'create', 'tạo', 'generate']
    : type === 'video'
      ? ['video', 'create', 'tạo', 'generate']
      : ['create', 'tạo', 'generate'];

  document.querySelectorAll('button').forEach((el, idx) => {
    if (isElementVisible(el) && !el.disabled) {
      const text = el.textContent.toLowerCase();
      const ariaLabel = (el.getAttribute('aria-label') || '').toLowerCase();
      const combinedText = text + ' ' + ariaLabel;

      // Check if button might be relevant
      if (searchTerms.some(term => combinedText.includes(term)) ||
        el.offsetHeight > 30 || el.offsetWidth > 100) {
        buttons.push({
          index: idx,
          text: el.textContent.substring(0, 50),
          ariaLabel: el.getAttribute('aria-label') || '',
          id: el.id || '',
          className: el.className || '',
          dataTestId: el.getAttribute('data-testid') || '',
          height: el.offsetHeight,
          width: el.offsetWidth,
          matches: searchTerms.filter(term => combinedText.includes(term))
        });
      }
    }
  });

  return buttons;
}

// Listen for messages from background script
// Setup listener immediately when script loads
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'ping') {
    // Respond to ping to confirm content script is loaded
    console.log('[Content Script] Received ping, responding...');
    sendResponse({ success: true, loaded: true });
    return true;
  } else if (message.action === 'processPrompt') {
    console.log('[Content Script] Received processPrompt message');
    handleProcessPrompt(message);
    sendResponse({ success: true });
    return true;
  } else if (message.action === 'ensureAutoDownload') {
    ensureAutoDownloadEnabled(true).then((result) => {
      sendResponse({ success: result });
    }).catch((error) => {
      console.error('Error ensuring auto download:', error);
      sendResponse({ success: false, error: error.message });
    });
    return true;
  } else if (message.action === 'toggleAutoDownload') {
    // Toggle auto-download setting on Flow website based on checkbox state
    const enabled = message.enabled;
    if (enabled) {
      ensureAutoDownloadEnabled(true).then((result) => {
        sendResponse({ success: result });
      }).catch((error) => {
        console.error('Error enabling auto download:', error);
        sendResponse({ success: false });
      });
    } else {
      // Disable auto-download
      disableAutoDownload().then((result) => {
        sendResponse({ success: result });
      }).catch((error) => {
        console.error('Error disabling auto download:', error);
        sendResponse({ success: false });
      });
    }
    return true; // Keep channel open for async response
  }
  return true;
});

// Log that content script is loaded and ready
console.log('[Content Script] Content script loaded and ready to receive messages');

async function handleProcessPrompt(message) {
  if (isProcessing) {
    console.log('Already processing, skipping...');
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
    // CRITICAL: Reset download state for new prompt
    downloadTriggeredForMedia = false;
    downloadedMediaElements.clear(); // Clear downloaded media elements for new prompt
    lastDownloadAttemptTime = 0; // Reset download attempt timer
    lastButtonClickTime = 0; // Reset button click timer
    // Note: clickedDownloadButtons is WeakSet so it auto-clears when DOM elements are removed
    // We also track by media element ID to be more reliable

    // Ensure auto download setting is enabled before interacting
    await ensureAutoDownloadEnabled();

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
    await sleep(400);

    // Scroll to top to ensure we're at the right place
    window.scrollTo(0, 0);
    await sleep(100);

    // Try to close any modals or overlays that might be blocking
    const closeButtons = document.querySelectorAll('button[aria-label*="close" i], button[aria-label*="đóng" i], [class*="close" i]');
    for (const closeBtn of closeButtons) {
      if (isElementVisible(closeBtn)) {
        try {
          closeBtn.click();
          await sleep(250);
        } catch (e) {
          // Ignore
        }
      }
    }

    // Scroll to input area first
    const inputField = document.querySelector('textarea, input[type="text"], [contenteditable="true"]');
    if (inputField) {
      inputField.scrollIntoView({ behavior: 'smooth', block: 'center' });
      await sleep(250);
      logToPopup('info', 'Đã scroll đến input area');
    }

    // Find and fill prompt input
    logToPopup('info', 'Đang tìm ô nhập prompt...');
    const inputFound = await fillPromptInput(currentPrompt);
    if (!inputFound) {
      // Debug: Log all available inputs
      const debugInputs = debugFindInputs();
      console.log('Debug - Available inputs:', debugInputs);
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
        await sleep(500);
      } else {
        logToPopup('info', `Đã verify prompt: "${currentValue.substring(0, 50)}..."`);
      }
    }

    // Wait for website validation (optimized for speed)
    logToPopup('info', 'Đang chờ website validate prompt...');
    await sleep(250);

    // Try Enter key to submit (sometimes works better than clicking button)
    if (inputElement) {
      inputElement.focus();
      await sleep(100);
      logToPopup('info', 'Thử Enter key để submit...');
      inputElement.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', keyCode: 13, bubbles: true }));
      inputElement.dispatchEvent(new KeyboardEvent('keypress', { key: 'Enter', code: 'Enter', keyCode: 13, bubbles: true }));
      inputElement.dispatchEvent(new KeyboardEvent('keyup', { key: 'Enter', code: 'Enter', keyCode: 13, bubbles: true }));
      await sleep(250);

      // Check if Enter key triggered processing
      const hasProcessing = document.querySelector('[class*="loading" i], [class*="generating" i], [class*="processing" i], [aria-busy="true"]');
      if (hasProcessing) {
        logToPopup('success', 'Enter key đã trigger processing! Bỏ qua click button.');
        // Skip button click if Enter worked, but still verify processing started
        await sleep(250);
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
      const debugButtons = debugFindButtons(currentType);
      if (debugButtons.length > 0) {
        console.log(`Debug - Available buttons for ${currentType}:`, debugButtons);
        logToPopup('info', `Tìm thấy ${debugButtons.length} nút có thể phù hợp`);
      }

      await clickCreateButton(currentType);
    } else {
      logToPopup('info', 'Processing đã bắt đầu từ Enter key, bỏ qua click button');
    }

    // Wait and verify that processing actually started (optimized for speed)
    logToPopup('info', 'Đang verify website đã bắt đầu xử lý...');
    await sleep(250);

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
        await sleep(250);

        // Retry click button - find arrow button again
        if (inputElement) {
          inputElement.focus();
          await sleep(100);

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
                  await sleep(100);
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
    await sleep(150);

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

function waitForPageReady() {
  return new Promise((resolve) => {
    if (document.readyState === 'complete') {
      resolve();
    } else {
      window.addEventListener('load', resolve);
    }
  });
}

// Wait for element to appear with MutationObserver
async function waitForElement(selector, timeout = 10000) {
  return new Promise((resolve, reject) => {
    // Check if already exists
    const existing = document.querySelector(selector);
    if (existing && isElementVisible(existing)) {
      resolve(existing);
      return;
    }

    const startTime = Date.now();
    const observer = new MutationObserver(() => {
      const element = document.querySelector(selector);
      if (element && isElementVisible(element)) {
        observer.disconnect();
        resolve(element);
        return;
      }

      if (Date.now() - startTime > timeout) {
        observer.disconnect();
        reject(new Error(`Timeout waiting for ${selector}`));
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });

    // Also check periodically
    const interval = setInterval(() => {
      const element = document.querySelector(selector);
      if (element && isElementVisible(element)) {
        clearInterval(interval);
        observer.disconnect();
        resolve(element);
      } else if (Date.now() - startTime > timeout) {
        clearInterval(interval);
        observer.disconnect();
        reject(new Error(`Timeout waiting for ${selector}`));
      }
    }, 500);
  });
}

async function fillPromptInput(prompt, retries = 5) {
  // Expanded selectors - try more variations
  const selectors = [
    // Specific selectors first
    'textarea[placeholder*="prompt" i]',
    'textarea[placeholder*="describe" i]',
    'textarea[placeholder*="nhập" i]',
    'textarea[placeholder*="enter" i]',
    'textarea[aria-label*="prompt" i]',
    'textarea[aria-label*="describe" i]',
    'textarea[aria-label*="text" i]',
    'textarea[id*="prompt" i]',
    'textarea[id*="input" i]',
    'textarea[class*="prompt" i]',
    'textarea[class*="input" i]',
    // Contenteditable
    'div[contenteditable="true"][role="textbox"]',
    'div[contenteditable="true"][aria-label*="prompt" i]',
    'div[contenteditable="true"][aria-label*="describe" i]',
    '[contenteditable="true"]',
    // Input fields
    'input[type="text"][placeholder*="prompt" i]',
    'input[type="text"][aria-label*="prompt" i]',
    // Generic - but prefer larger ones
    'textarea',
    'input[type="text"]'
  ];

  let input = null;
  let bestInput = null;
  let bestScore = 0;

  for (let attempt = 0; attempt < retries; attempt++) {
    logToPopup('info', `Tìm input - lần thử ${attempt + 1}/${retries}...`);

    for (const selector of selectors) {
      try {
        const elements = document.querySelectorAll(selector);
        for (const el of elements) {
          // Check if element is visible and likely the prompt input
          if (isElementVisible(el) && el.offsetHeight > 0) {
            // Score elements based on how likely they are to be the prompt input
            let score = 0;

            // Prefer textareas over inputs
            if (el.tagName === 'TEXTAREA') score += 10;

            // Prefer larger elements
            score += Math.min(el.offsetHeight / 10, 5);
            score += Math.min(el.offsetWidth / 100, 5);

            // Prefer elements with prompt-related attributes
            const placeholder = (el.placeholder || '').toLowerCase();
            const ariaLabel = (el.getAttribute('aria-label') || '').toLowerCase();
            const id = (el.id || '').toLowerCase();
            const className = (el.className || '').toLowerCase();

            if (placeholder.includes('prompt') || placeholder.includes('describe') || placeholder.includes('nhập')) score += 20;
            if (ariaLabel.includes('prompt') || ariaLabel.includes('describe')) score += 20;
            if (id.includes('prompt') || id.includes('input')) score += 10;
            if (className.includes('prompt') || className.includes('input')) score += 10;

            // Prefer contenteditable with role="textbox"
            if (el.contentEditable === 'true' && el.getAttribute('role') === 'textbox') score += 15;

            if (score > bestScore) {
              bestScore = score;
              bestInput = el;
            }

            // If score is very high, use it immediately
            if (score > 30) {
              input = el;
              break;
            }
          }
        }
        if (input) break;
      } catch (e) {
        // Invalid selector, continue
      }
    }

    if (input) break;

    // If we found a best input but didn't use it, use it now
    if (!input && bestInput) {
      input = bestInput;
      logToPopup('info', `Sử dụng input tốt nhất (score: ${bestScore})`);
      break;
    }

    // Wait before retry (optimized for speed)
    if (attempt < retries - 1) {
      logToPopup('info', `Chờ 1s trước khi thử lại...`);
      await sleep(1000);
    }
  }

  if (!input && bestInput) {
    input = bestInput;
    logToPopup('info', `Sử dụng input dự phòng (score: ${bestScore})`);
  }

  if (!input) {
    logToPopup('error', 'Không tìm thấy input sau nhiều lần thử');
    return false;
  }

  logToPopup('success', `Đã tìm thấy input: ${input.tagName}, score: ${bestScore}`);

  // Clear and fill input
  try {
    // Focus first
    input.focus();
    await sleep(100);

    // Select all and delete (to clear existing content)
    if (document.activeElement === input) {
      input.select();
      if (input.setSelectionRange) {
        input.setSelectionRange(0, input.value ? input.value.length : 0);
      }
      await sleep(50);

      // Simulate key events to clear
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Backspace', bubbles: true }));
      input.dispatchEvent(new KeyboardEvent('keyup', { key: 'Backspace', bubbles: true }));
      await sleep(50);
    }

    // For contenteditable divs
    if (input.contentEditable === 'true' || input.hasAttribute('contenteditable')) {
      input.textContent = '';
      input.innerText = '';
      input.innerHTML = '';

      // Simulate typing for React/Vue
      for (let i = 0; i < prompt.length; i++) {
        const char = prompt[i];
        input.textContent += char;
        input.innerText += char;

        // Dispatch input event for each character (for React)
        if (i % 10 === 0 || i === prompt.length - 1) {
          input.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
          input.dispatchEvent(new InputEvent('input', { bubbles: true, cancelable: true, data: char }));
        }
      }

      // Final events
      input.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
      input.dispatchEvent(new Event('change', { bubbles: true, cancelable: true }));
    } else {
      // For regular inputs/textarea
      input.value = '';

      // Simulate typing for React/Vue
      for (let i = 0; i < prompt.length; i++) {
        const char = prompt[i];
        input.value += char;

        // Dispatch input event periodically (for React)
        if (i % 10 === 0 || i === prompt.length - 1) {
          input.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
          input.dispatchEvent(new InputEvent('input', { bubbles: true, cancelable: true, data: char }));
        }
      }

      // Final events
      input.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
      input.dispatchEvent(new Event('change', { bubbles: true, cancelable: true }));
      input.dispatchEvent(new Event('blur', { bubbles: true, cancelable: true }));
      input.focus(); // Focus again
    }

    // Wait a bit for any validation (optimized for speed)
    await sleep(500);

    // Verify the value was set
    const currentValue = input.value || input.textContent || input.innerText || '';
    if (!currentValue.includes(prompt.substring(0, Math.min(10, prompt.length)))) {
      logToPopup('warning', 'Có thể prompt chưa được điền đúng, thử lại...');
      await sleep(250);

      // Try direct assignment
      if (input.contentEditable === 'true' || input.hasAttribute('contenteditable')) {
        input.textContent = prompt;
        input.innerText = prompt;
      } else {
        input.value = prompt;
      }

      // Trigger all possible events
      input.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
      input.dispatchEvent(new Event('change', { bubbles: true, cancelable: true }));
      input.dispatchEvent(new InputEvent('input', { bubbles: true, cancelable: true }));

      await sleep(250);
    }

    logToPopup('info', `Đã điền prompt (${prompt.length} ký tự)`);
    return true;
  } catch (error) {
    logToPopup('error', `Lỗi khi điền prompt: ${error.message}`);
    return false;
  }
}

async function clickCreateButton(type, retries = 5) {
  const searchTerms = type === 'image'
    ? ['image', 'hình', 'ảnh', 'picture', 'photo']
    : type === 'video'
      ? ['video', 'clip', 'movie']
      : [];

  const actionTerms = ['create', 'tạo', 'generate', 'make', 'generate', 'bắt đầu', 'render', 'submit'];
  const bannedButtonTerms = [
    'sắp xếp',
    'ultra',
    'standard',
    'medium',
    'high',
    'low',
    'chất lượng',
    'quality',
    'mode',
    'tốc độ',
    'nhanh',
    'chậm',
    'xong',
    'preview'
  ];
  const isBannedButtonText = (text) => bannedButtonTerms.some(term => text.includes(term));
  const hasActionKeyword = (text) => actionTerms.some(term => text.includes(term));
  const hasArrowIcon = (btn) => !!btn?.querySelector('svg[class*="arrow"], svg[class*="Arrow"], svg[class*="play"], svg[class*="send"], [class*="arrow"], [class*="Arrow"], [class*="play"], [class*="send"]');
  const MIN_VERIFIED_BUTTON_SCORE = 35;

  // First, try to find button in the input area (most reliable)
  const inputField = document.querySelector('textarea, input[type="text"], [contenteditable="true"]');
  let inputAreaButton = null;

  if (inputField) {
    // Scroll input into view
    inputField.scrollIntoView({ behavior: 'smooth', block: 'center' });
    await sleep(150);

    // Find parent container of input - try multiple levels
    let container = inputField.closest('[class*="input"], [class*="form"], [class*="prompt"], [class*="text"], [class*="create"], [class*="card"], [class*="panel"]');
    if (!container) {
      container = inputField.parentElement;
      // Try parent's parent
      if (container && container.parentElement) {
        container = container.parentElement;
      }
    }

    // Look for buttons near the input - prioritize arrow buttons
    if (container) {
      // First, look for arrow buttons specifically (highest priority)
      const arrowButtons = container.querySelectorAll('button, [role="button"]');
      for (const btn of arrowButtons) {
        if (isElementVisible(btn) && !btn.disabled) {
          // Check for arrow icon (right arrow, play icon, etc.)
          const hasArrow = btn.querySelector('svg[class*="arrow"], svg[class*="Arrow"], svg[class*="play"], svg[class*="send"], [class*="arrow"], [class*="Arrow"], [class*="play"], [class*="send"]');
          const btnText = (btn.textContent || btn.getAttribute('aria-label') || '').toLowerCase();

          // Skip dropdown buttons
          if (btnText.includes('dropdown') || btnText.includes('arrow_drop_down') || btn.classList.contains('dropdown')) {
            continue;
          }

          if (hasArrow) {
            inputAreaButton = btn;
            logToPopup('success', 'Tìm thấy arrow button trong input area');
            break;
          }
        }
      }

      // If no arrow button, look for submit buttons
      if (!inputAreaButton) {
        const nearbyButtons = container.querySelectorAll('button, [role="button"]');
        for (const btn of nearbyButtons) {
          if (isElementVisible(btn) && !btn.disabled) {
            const btnText = (btn.textContent || btn.getAttribute('aria-label') || '').toLowerCase();
            const isSubmit = btn.type === 'submit' || btn.getAttribute('type') === 'submit';

            // Skip dropdown buttons
            if (btnText.includes('dropdown') || btnText.includes('arrow_drop_down') || btn.classList.contains('dropdown')) {
              continue;
            }

            // Skip unwanted buttons (including settings/config)
            if (btnText.includes('veo') || btnText.includes('volume') || btnText.includes('model') ||
              btnText.includes('fast') || btnText.includes('settings') || btnText.includes('mở rộng') ||
              btnText.includes('setting') || btnText.includes('config') || btnText.includes('tune') ||
              btnText.includes('cài đặt') || btnText.includes('cấu hình') ||
              btnText === 'videos' || btnText === 'images' || btnText === 'video' || btnText === 'image' ||
              isBannedButtonText(btnText)) {
              continue;
            }

            if (isSubmit || actionTerms.some(term => btnText.includes(term))) {
              inputAreaButton = btn;
              logToPopup('info', 'Tìm thấy submit/action button trong input area');
              break;
            }
          }
        }
      }

      // If still no button, look for ANY button near input (even without arrow or action text)
      if (!inputAreaButton) {
        const nearbyButtons = container.querySelectorAll('button, [role="button"]');
        for (const btn of nearbyButtons) {
          if (isElementVisible(btn) && !btn.disabled) {
            const btnText = (btn.textContent || btn.getAttribute('aria-label') || '').toLowerCase();

            // Skip dropdown and unwanted buttons (including settings/config)
            if (btnText.includes('dropdown') || btnText.includes('arrow_drop_down') ||
              btnText.includes('veo') || btnText.includes('volume') || btnText.includes('model') ||
              btnText.includes('fast') || btnText.includes('settings') || btnText.includes('mở rộng') ||
              btnText.includes('setting') || btnText.includes('config') || btnText.includes('tune') ||
              btnText.includes('cài đặt') || btnText.includes('cấu hình') ||
              btnText === 'videos' || btnText === 'images' || btnText === 'video' || btnText === 'image' ||
              isBannedButtonText(btnText)) {
              continue;
            }

            // Accept button if it's small/icon button (likely submit button) or has no text
            if (btnText.length === 0 || btnText.length < 15 || btn.offsetWidth < 100) {
              inputAreaButton = btn;
              logToPopup('info', 'Tìm thấy button trong input area (có thể là icon button)');
              break;
            }
          }
        }
      }
    }

    // Also check siblings of input (buttons next to input)
    if (!inputAreaButton && inputField.parentElement) {
      const siblings = Array.from(inputField.parentElement.children);
      for (const sibling of siblings) {
        if (sibling.tagName === 'BUTTON' || sibling.getAttribute('role') === 'button') {
          if (isElementVisible(sibling) && !sibling.disabled) {
            const hasArrow = sibling.querySelector('svg, [class*="arrow"], [class*="Arrow"], [class*="play"], [class*="send"]');
            const btnText = (sibling.textContent || sibling.getAttribute('aria-label') || '').toLowerCase();

            // Skip dropdown
            if (btnText.includes('dropdown') || btnText.includes('arrow_drop_down')) {
              continue;
            }

            if (hasArrow) {
              inputAreaButton = sibling;
              logToPopup('success', 'Tìm thấy arrow button bên cạnh input');
              break;
            }
          }
        }
      }
    }

    // Also check buttons positioned to the right of input (common layout)
    if (!inputAreaButton && inputField) {
      const inputRect = inputField.getBoundingClientRect();
      const allButtons = document.querySelectorAll('button, [role="button"]');

      for (const btn of allButtons) {
        if (isElementVisible(btn) && !btn.disabled) {
          const btnRect = btn.getBoundingClientRect();
          const btnText = (btn.textContent || btn.getAttribute('aria-label') || '').toLowerCase();

          // Skip dropdown
          if (btnText.includes('dropdown') || btnText.includes('arrow_drop_down')) {
            continue;
          }

          // Check if button is to the right of input and close vertically
          const isToRight = btnRect.left > inputRect.right;
          const isVerticallyAligned = Math.abs(btnRect.top - inputRect.top) < 50;
          const distance = Math.sqrt(Math.pow(btnRect.left - inputRect.right, 2) + Math.pow(btnRect.top - inputRect.top, 2));

          if (isToRight && isVerticallyAligned && distance < 200) {
            const hasArrow = btn.querySelector('svg, [class*="arrow"], [class*="Arrow"], [class*="play"], [class*="send"]');
            if (hasArrow) {
              inputAreaButton = btn;
              logToPopup('success', 'Tìm thấy arrow button bên phải input');
              break;
            }
          }
        }
      }
    }
  }

  // Expanded selectors
  const buttonSelectors = [
    // Type-specific with action (prioritize these)
    ...actionTerms.flatMap(action => searchTerms.flatMap(term => [
      `button[aria-label*="${action}" i][aria-label*="${term}" i]`,
      `button[aria-label*="${term}" i][aria-label*="${action}" i]`
    ])),
    // Type-specific
    `button[aria-label*="${type}" i]`,
    `button[data-testid*="${type}" i]`,
    `button[id*="${type}" i]`,
    `button[class*="${type}" i]`,
    // Type-specific with action
    ...searchTerms.flatMap(term => [
      `button[aria-label*="${term}" i]`,
      `button[data-testid*="${term}" i]`
    ]),
    // Generic action buttons
    'button[type="submit"]',
    ...actionTerms.flatMap(term => [
      `button[aria-label*="${term}" i]`,
      `button[data-testid*="${term}" i]`
    ])
  ];

  let button = null;
  let bestButton = null;
  let bestScore = 0;

  // If we found a button in input area, use it first (highest priority)
  if (inputAreaButton) {
    const btnText = (inputAreaButton.textContent || inputAreaButton.getAttribute('aria-label') || '').toLowerCase();
    const hasAction = actionTerms.some(term => btnText.includes(term));
    const hasArrow = hasArrowIcon(inputAreaButton);

    if (hasAction || inputAreaButton.type === 'submit' || hasArrow) {
      button = inputAreaButton;
      bestScore = Math.max(bestScore, 60);
      logToPopup('success', 'Sử dụng button từ input area (verified)');
    } else {
      bestButton = inputAreaButton;
      bestScore = 60; // High score for input area button
    }
  }

  for (let attempt = 0; attempt < retries; attempt++) {
    logToPopup('info', `Tìm button ${type} - lần thử ${attempt + 1}/${retries}...`);

    if (button) break; // Already found button in input area

    // Try CSS selectors
    for (const selector of buttonSelectors) {
      try {
        const elements = document.querySelectorAll(selector);
        for (const el of elements) {
          if (isElementVisible(el) && !el.disabled) {
            const buttonText = el.textContent.toLowerCase();
            const ariaLabel = (el.getAttribute('aria-label') || '').toLowerCase();
            const combinedText = buttonText + ' ' + ariaLabel;

            // Skip tab buttons and dropdown buttons
            const isTabButton = (combinedText === 'videos' || combinedText === 'images' ||
              combinedText === 'video' || combinedText === 'image' ||
              (combinedText.includes('videocam') && !actionTerms.some(term => combinedText.includes(term))));
            const isDropdownButton = (combinedText.includes('dropdown') || combinedText.includes('arrow_drop_down') ||
              el.classList.contains('dropdown') || el.getAttribute('aria-haspopup') === 'true');

            // Skip model/audio/settings buttons (not create buttons)
            const isModelButton = combinedText.includes('veo') || combinedText.includes('model') ||
              combinedText.includes('fast') || combinedText.includes('volume') ||
              combinedText.includes('volume_up') || combinedText.includes('settings') ||
              combinedText.includes('cài đặt') || combinedText.includes('mở rộng') ||
              combinedText.includes('setting') || combinedText.includes('config') ||
              combinedText.includes('tune') || combinedText.includes('cấu hình');
            const isBannedButton = isBannedButtonText(combinedText);

            if (isTabButton || isDropdownButton || isModelButton || isBannedButton) {
              continue; // Skip this button
            }

            // Score button
            let score = 0;

            // Must be visible and enabled
            if (el.offsetHeight > 20) score += 5;
            if (el.offsetWidth > 50) score += 5;

            // Type matching (but not if it's just a tab)
            if (type === 'image') {
              if (combinedText.includes('image') || combinedText.includes('hình') || combinedText.includes('ảnh')) {
                // Only add score if it also has action term (to avoid tab buttons)
                if (actionTerms.some(term => combinedText.includes(term))) {
                  score += 40; // Higher score if has both type and action
                } else {
                  score += 10; // Lower score if just type
                }
              }
            } else if (type === 'video') {
              if (combinedText.includes('video')) {
                // Only add score if it also has action term (to avoid tab buttons)
                if (actionTerms.some(term => combinedText.includes(term))) {
                  score += 40; // Higher score if has both type and action
                } else {
                  score += 10; // Lower score if just type
                }
              }
            }

            // Action matching (very important - must have action term)
            if (actionTerms.some(term => combinedText.includes(term))) {
              score += 30; // High score for action terms
            }

            // Check if button is near input field (more likely to be create button)
            const inputField = document.querySelector('textarea, input[type="text"], [contenteditable="true"]');
            if (inputField) {
              const inputRect = inputField.getBoundingClientRect();
              const buttonRect = el.getBoundingClientRect();
              const distance = Math.abs(buttonRect.top - inputRect.bottom);
              if (distance < 200) { // Button is near input
                score += 40; // High bonus for proximity to input (increased from 25 to ensure it passes threshold)
              }
            }

            // Check for arrow icon or submit-like indicators
            const hasArrow = el.querySelector('svg[class*="arrow"], svg[class*="Arrow"], [class*="arrow"], [class*="Arrow"]');
            if (hasArrow) score += 15;

            // Prominent button
            if (el.offsetHeight > 40 && el.offsetWidth > 100) score += 10;

            if (score > bestScore) {
              bestScore = score;
              bestButton = el;
            }

            // High score = use immediately (reduced threshold to find more buttons)
            if (score > 30) {
              button = el;
              break;
            }
          }
        }
        if (button) break;
      } catch (e) {
        // Continue
      }
    }

    if (button) break;

    // Fallback: search all buttons
    if (!button) {
      const allButtons = document.querySelectorAll('button, [role="button"]');
      for (const btn of allButtons) {
        if (isElementVisible(btn) && !btn.disabled && btn.offsetHeight > 20) {
          const text = btn.textContent.toLowerCase();
          const ariaLabel = (btn.getAttribute('aria-label') || '').toLowerCase();
          const combinedText = text + ' ' + ariaLabel;

          // Skip tab buttons and dropdown buttons
          const isTabButton = (combinedText === 'videos' || combinedText === 'images' ||
            combinedText === 'video' || combinedText === 'image' ||
            (combinedText.includes('videocam') && !actionTerms.some(term => combinedText.includes(term))));
          const isDropdownButton = (combinedText.includes('dropdown') || combinedText.includes('arrow_drop_down') ||
            btn.classList.contains('dropdown') || btn.getAttribute('aria-haspopup') === 'true');

          // Skip model/audio/settings buttons
          const isModelButton = combinedText.includes('veo') || combinedText.includes('model') ||
            combinedText.includes('fast') || combinedText.includes('volume') ||
            combinedText.includes('volume_up') || combinedText.includes('settings') ||
            combinedText.includes('cài đặt') || combinedText.includes('mở rộng') ||
            combinedText.includes('setting') || combinedText.includes('config') ||
            combinedText.includes('tune') || combinedText.includes('cấu hình');
          const isBannedButton = isBannedButtonText(combinedText);

          if (isTabButton || isDropdownButton || isModelButton || isBannedButton) {
            continue; // Skip this button
          }

          let score = 0;

          // Type matching (but not if it's just a tab)
          if (type === 'image' && (combinedText.includes('image') || combinedText.includes('hình') || combinedText.includes('ảnh'))) {
            if (actionTerms.some(term => combinedText.includes(term))) {
              score += 40; // Higher if has action
            } else {
              score += 10; // Lower if just type
            }
          } else if (type === 'video' && combinedText.includes('video')) {
            if (actionTerms.some(term => combinedText.includes(term))) {
              score += 40; // Higher if has action
            } else {
              score += 10; // Lower if just type
            }
          }

          // Action matching (very important)
          if (actionTerms.some(term => combinedText.includes(term))) score += 30;

          // Check if button is near input field
          const inputField = document.querySelector('textarea, input[type="text"], [contenteditable="true"]');
          if (inputField) {
            const inputRect = inputField.getBoundingClientRect();
            const buttonRect = btn.getBoundingClientRect();
            const distance = Math.abs(buttonRect.top - inputRect.bottom);
            if (distance < 200) {
              score += 40; // High bonus for proximity (increased from 25)
            }
          }

          // Check for arrow icon
          const hasArrow = btn.querySelector('svg[class*="arrow"], svg[class*="Arrow"], [class*="arrow"], [class*="Arrow"]');
          if (hasArrow) score += 15;

          // Prominent
          if (btn.offsetHeight > 40 && btn.offsetWidth > 100) score += 10;

          if (score > bestScore) {
            bestScore = score;
            bestButton = btn;
          }

          if (score > 30) {
            button = btn;
            break;
          }
        }
      }
    }

    if (button) break;

    // Use best button if found (reduced threshold to find more buttons)
    if (!button && bestButton && bestScore > 20) {
      button = bestButton;
      logToPopup('info', `Sử dụng button tốt nhất (score: ${bestScore})`);
      break;
    }

    // Wait before retry (optimized for speed)
    if (attempt < retries - 1) {
      await sleep(1000);
    }
  }

  if (!button && bestButton) {
    button = bestButton;
    logToPopup('info', `Sử dụng button dự phòng (score: ${bestScore})`);
  }

  if (!button) {
    logToPopup('error', `Không tìm thấy button sau ${retries} lần thử`);
    throw new Error(`Không tìm thấy nút tạo ${type}`);
  }

  const finalButtonText = (button.textContent || button.getAttribute('aria-label') || '').toLowerCase();
  if (isBannedButtonText(finalButtonText)) {
    logToPopup('error', `Button tìm thấy có nội dung "${finalButtonText.substring(0, 60)}" - đây có thể là nút Scene Builder. Dừng để tránh click sai.`);
    throw new Error('Phát hiện nút Scene Builder, không thể tiếp tục');
  }
  const isSubmitButton = button.type === 'submit' || button.getAttribute('type') === 'submit';
  const hasArrowIconFlag = hasArrowIcon(button);
  const hasActionTerm = hasActionKeyword(finalButtonText);
  if (!hasActionTerm && !isSubmitButton && !hasArrowIconFlag) {
    logToPopup('error', `Button tìm thấy không có từ khóa hành động hoặc icon gửi (text: "${finalButtonText.substring(0, 60)}"). Vui lòng dùng giao diện Flow chuẩn.`);
    throw new Error('Không tìm thấy nút tạo hợp lệ (thiếu action cues)');
  }
  if (bestScore > 0 && bestScore < MIN_VERIFIED_BUTTON_SCORE && !hasActionTerm && !hasArrowIconFlag) {
    logToPopup('error', `Button có score quá thấp (${bestScore}) và không có action keyword/icon. UI có thể đang ở chế độ Scene Builder.`);
    throw new Error('Nút tạo không đáng tin cậy (score thấp)');
  } else if (bestScore > 0 && bestScore < MIN_VERIFIED_BUTTON_SCORE && hasArrowIconFlag) {
    logToPopup('info', `Button có score thấp (${bestScore}) nhưng có arrow icon -> Chấp nhận.`);
  }

  // CRITICAL: Never accept button with score 0 - it's definitely wrong
  if (bestScore === 0 && button) {
    logToPopup('warning', `Button có score 0 - không đáng tin cậy. Đang thử tìm button tốt hơn...`);
    button = null; // Reset button

    // Try to find ANY button near input as last resort
    if (inputField) {
      const inputRect = inputField.getBoundingClientRect();
      const allButtons = document.querySelectorAll('button, [role="button"]');

      for (const btn of allButtons) {
        if (isElementVisible(btn) && !btn.disabled) {
          const btnText = (btn.textContent || btn.getAttribute('aria-label') || '').toLowerCase();
          const btnRect = btn.getBoundingClientRect();

          // Skip unwanted buttons
          if (btnText.includes('veo') || btnText.includes('volume') || btnText.includes('model') ||
            btnText.includes('fast') || btnText.includes('settings') || btnText.includes('mở rộng') ||
            btnText.includes('dropdown') || btnText.includes('arrow_drop_down') ||
            btnText === 'videos' || btnText === 'images' || btnText === 'video' || btnText === 'image' ||
            isBannedButtonText(btnText)) {
            continue;
          }

          // Check if button is very close to input (within 200px)
          const distance = Math.sqrt(Math.pow(btnRect.left - inputRect.right, 2) + Math.pow(btnRect.top - inputRect.bottom, 2));

          if (distance < 200 && btn.offsetHeight > 15 && btn.offsetWidth > 20) {
            // Check for ANY arrow/send/play icon
            const hasAnyIcon = btn.querySelector('svg, i, [class*="icon"]');
            if (hasAnyIcon) {
              button = btn;
              bestScore = 35; // Set minimum acceptable score
              logToPopup('success', `Tìm thấy button gần input (last resort with icon, distance: ${Math.round(distance)}px)`);
              break;
            }

            // If no icon but very close, still accept
            if (distance < 100) {
              button = btn;
              bestScore = 30;
              logToPopup('success', `Tìm thấy button rất gần input (last resort, distance: ${Math.round(distance)}px)`);
              break;
            }
          }
        }
      }
    }
  }

  // Only use button if score is high enough (avoid false positives)
  // But if button came from inputAreaButton, it's already verified, so use it
  if (!button && bestScore < 50) {
    logToPopup('warning', `Button có score thấp (${bestScore}), đang thử các fallback strategies...`);

    // Fallback Strategy 1: Try to find arrow button more aggressively
    if (inputField) {
      const container = inputField.closest('[class*="input"], [class*="form"], [class*="prompt"], [class*="text"], [class*="create"]') || inputField.parentElement;
      if (container) {
        const allButtons = container.querySelectorAll('button, [role="button"]');
        for (const btn of allButtons) {
          if (isElementVisible(btn) && !btn.disabled) {
            const hasArrow = btn.querySelector('svg, [class*="arrow"], [class*="Arrow"], [class*="play"], [class*="send"]');
            const btnText = (btn.textContent || btn.getAttribute('aria-label') || '').toLowerCase();

            // Skip model/audio buttons
            if (btnText.includes('veo') || btnText.includes('volume') || btnText.includes('model') ||
              btnText.includes('fast') || btnText.includes('settings') || btnText.includes('mở rộng') ||
              btnText.includes('dropdown') || btnText.includes('arrow_drop_down') ||
              isBannedButtonText(btnText)) {
              continue;
            }

            if (hasArrow) {
              button = btn;
              bestScore = 50; // Set score to acceptable level
              logToPopup('success', 'Tìm thấy arrow button (fallback strategy 1)');
              break;
            }
          }
        }
      }
    }

    // Fallback Strategy 2: Find any button near input field (even without arrow)
    if (!button && inputField) {
      const inputRect = inputField.getBoundingClientRect();
      const allButtons = document.querySelectorAll('button, [role="button"]');

      for (const btn of allButtons) {
        if (isElementVisible(btn) && !btn.disabled) {
          const btnText = (btn.textContent || btn.getAttribute('aria-label') || '').toLowerCase();
          const btnRect = btn.getBoundingClientRect();

          // Skip unwanted buttons
          if (btnText.includes('veo') || btnText.includes('volume') || btnText.includes('model') ||
            btnText.includes('fast') || btnText.includes('settings') || btnText.includes('mở rộng') ||
            btnText.includes('dropdown') || btnText.includes('arrow_drop_down') ||
            btnText === 'videos' || btnText === 'images' || btnText === 'video' || btnText === 'image' ||
            isBannedButtonText(btnText)) {
            continue;
          }

          // Check if button is near input (within 300px horizontally or vertically)
          const horizontalDistance = Math.min(Math.abs(btnRect.left - inputRect.right), Math.abs(btnRect.right - inputRect.left));
          const verticalDistance = Math.abs(btnRect.top - inputRect.bottom);
          const totalDistance = Math.sqrt(Math.pow(horizontalDistance, 2) + Math.pow(verticalDistance, 2));

          if (totalDistance < 300 && btn.offsetHeight > 20 && btn.offsetWidth > 30) {
            // Check if it's a submit button or has submit-like attributes
            const isSubmit = btn.type === 'submit' || btn.getAttribute('type') === 'submit' ||
              btn.getAttribute('role') === 'button' ||
              btn.classList.toString().toLowerCase().includes('submit') ||
              btn.classList.toString().toLowerCase().includes('create') ||
              btn.classList.toString().toLowerCase().includes('generate');

            if (isSubmit || btnText.length === 0 || btnText.length < 20) { // Empty or short text = likely icon button
              button = btn;
              bestScore = 40; // Set score to acceptable level
              logToPopup('success', `Tìm thấy button gần input (fallback strategy 2, distance: ${Math.round(totalDistance)}px)`);
              break;
            }
          }
        }
      }
    }

    // Fallback Strategy 3: Find submit button in form
    if (!button && inputField) {
      const form = inputField.closest('form') || inputField.closest('[class*="form"]');
      if (form) {
        const submitButtons = form.querySelectorAll('button[type="submit"], button:not([type]), [role="button"]');
        for (const btn of submitButtons) {
          if (isElementVisible(btn) && !btn.disabled) {
            const btnText = (btn.textContent || btn.getAttribute('aria-label') || '').toLowerCase();

            // Skip unwanted buttons
            if (btnText.includes('veo') || btnText.includes('volume') || btnText.includes('model') ||
              btnText.includes('fast') || btnText.includes('settings') || btnText.includes('mở rộng') ||
              btnText.includes('dropdown') || btnText === 'videos' || btnText === 'images' ||
              isBannedButtonText(btnText)) {
              continue;
            }

            button = btn;
            bestScore = 45; // Set score to acceptable level
            logToPopup('success', 'Tìm thấy submit button trong form (fallback strategy 3)');
            break;
          }
        }
      }
    }

    // Fallback Strategy 4: Use best button found (even with low score) if it's near input
    if (!button && bestButton && bestScore > 0) {
      if (inputField) {
        const inputRect = inputField.getBoundingClientRect();
        const buttonRect = bestButton.getBoundingClientRect();
        const distance = Math.sqrt(Math.pow(buttonRect.left - inputRect.right, 2) + Math.pow(buttonRect.top - inputRect.bottom, 2));

        if (distance < 500) { // Within 500px
          button = bestButton;
          logToPopup('warning', `Sử dụng button tốt nhất với score thấp (${bestScore}) vì gần input (${Math.round(distance)}px)`);
        }
      }
    }

    // Final fallback: Use best button if score > 0 (better than nothing)
    if (!button && bestButton && bestScore > 0) {
      button = bestButton;
      logToPopup('warning', `Sử dụng button tốt nhất với score ${bestScore} (final fallback)`);
    }

    if (!button) {
      throw new Error(`Không tìm thấy button phù hợp. Score cao nhất: ${bestScore}`);
    }
  } else if (button && bestScore < 30 && bestScore > 0) {
    // Even if we have a button, if score is very low (but not 0), try to find arrow button
    logToPopup('warning', `Button có score thấp (${bestScore}), thử tìm arrow button tốt hơn...`);
    if (inputField) {
      const container = inputField.closest('[class*="input"], [class*="form"], [class*="prompt"], [class*="text"], [class*="create"]') || inputField.parentElement;
      if (container) {
        const allButtons = container.querySelectorAll('button, [role="button"]');
        for (const btn of allButtons) {
          if (isElementVisible(btn) && !btn.disabled) {
            const hasArrow = btn.querySelector('svg, [class*="arrow"], [class*="Arrow"], [class*="play"], [class*="send"]');
            const btnText = (btn.textContent || btn.getAttribute('aria-label') || '').toLowerCase();

            // Skip model/audio buttons
            if (btnText.includes('veo') || btnText.includes('volume') || btnText.includes('model') ||
              btnText.includes('fast') || btnText.includes('settings') || btnText.includes('mở rộng')) {
              continue;
            }

            if (hasArrow) {
              button = btn;
              logToPopup('success', 'Đã thay thế bằng arrow button tốt hơn');
              break;
            }
          }
        }
      }
    }
  }

  // Final check: if still score 0, throw error
  if (button && bestScore === 0) {
    throw new Error('Button có score 0 - không thể sử dụng. Vui lòng kiểm tra lại.');
  }

  logToPopup('success', `Đã tìm thấy button: "${button.textContent.substring(0, 30)}", score: ${bestScore}`);

  // Check if button is enabled (faster check - only wait 3 seconds max)
  if (button.disabled || button.getAttribute('aria-disabled') === 'true') {
    logToPopup('warning', 'Button bị disabled, đang chờ...');
    // Wait and check again (reduced from 10s to 3s)
    for (let i = 0; i < 3; i++) {
      await sleep(1000);
      if (!button.disabled && button.getAttribute('aria-disabled') !== 'true') {
        logToPopup('info', 'Button đã được enable');
        break;
      }
    }
    if (button.disabled || button.getAttribute('aria-disabled') === 'true') {
      throw new Error('Button vẫn bị disabled sau khi chờ');
    }
  }

  // Scroll into view (instant, no smooth)
  button.scrollIntoView({ behavior: 'auto', block: 'center' });
  await sleep(50);

  // Make sure button is still visible and enabled
  if (!isElementVisible(button)) {
    button.scrollIntoView({ behavior: 'auto', block: 'center' });
    await sleep(50);
  }

  // Try multiple click methods for React/Vue compatibility (optimized - do all quickly)
  try {
    // Method 1: Direct click
    button.click();
  } catch (e) {
    // Ignore
  }

  // Method 2: Mouse events (for React) - do immediately
  try {
    button.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true, view: window }));
    button.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, cancelable: true, view: window }));
    button.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));
  } catch (e) {
    // Ignore
  }

  // Method 3: React onClick - do immediately
  try {
    const reactKey = Object.keys(button).find(key => key.startsWith('__reactFiber') || key.startsWith('__reactInternalInstance'));
    if (reactKey) {
      const reactFiber = button[reactKey];
      if (reactFiber && reactFiber.memoizedProps && reactFiber.memoizedProps.onClick) {
        reactFiber.memoizedProps.onClick(new MouseEvent('click', { bubbles: true }));
      }
    }
  } catch (e) {
    // Ignore
  }

  await sleep(100); // Minimal wait for request to be sent (optimized)

  // Verify that click actually triggered something (optimized)
  await sleep(250);

  // Check if there are any changes indicating the request was sent
  let hasProcessingIndicator = document.querySelector('[class*="loading" i], [class*="generating" i], [class*="processing" i], [aria-busy="true"]');
  let hasNewMedia = document.querySelectorAll('video, img[src*="flow"], img[src*="veo"], canvas').length > 0;

  // Also check for any UI changes (button disabled, input cleared, etc.)
  const buttonDisabled = button.disabled || button.getAttribute('aria-disabled') === 'true';
  const inputCleared = inputField && (inputField.value === '' || inputField.textContent === '');

  if (hasProcessingIndicator || hasNewMedia || buttonDisabled || inputCleared) {
    logToPopup('success', `Đã xác nhận: website đang xử lý sau khi click button`);
  } else {
    logToPopup('warning', 'Chưa thấy dấu hiệu website đang xử lý, thử click lại...');

    // Retry click with more force (minimal wait)
    await sleep(200);
    try {
      // Focus input first (sometimes needed)
      if (inputField) {
        inputField.focus();
        await sleep(100);
      }

      // Try Enter key first (sometimes works better than click)
      if (inputField) {
        inputField.focus();
        await sleep(50);
        inputField.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', keyCode: 13, bubbles: true }));
        inputField.dispatchEvent(new KeyboardEvent('keypress', { key: 'Enter', code: 'Enter', keyCode: 13, bubbles: true }));
        inputField.dispatchEvent(new KeyboardEvent('keyup', { key: 'Enter', code: 'Enter', keyCode: 13, bubbles: true }));
        await sleep(100);
      }

      // Click button again with all methods
      button.click();
      button.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true, view: window }));
      button.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, cancelable: true, view: window }));
      button.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));

      // Try React onClick again
      const reactKey = Object.keys(button).find(key => key.startsWith('__reactFiber') || key.startsWith('__reactInternalInstance'));
      if (reactKey) {
        const reactFiber = button[reactKey];
        if (reactFiber && reactFiber.memoizedProps && reactFiber.memoizedProps.onClick) {
          reactFiber.memoizedProps.onClick(new MouseEvent('click', { bubbles: true }));
        }
      }

      await sleep(250); // Wait for processing to start (optimized)

      // Check again
      hasProcessingIndicator = document.querySelector('[class*="loading" i], [class*="generating" i], [class*="processing" i], [aria-busy="true"]');
      hasNewMedia = document.querySelectorAll('video, img[src*="flow"], img[src*="veo"], canvas').length > 0;

      if (hasProcessingIndicator || hasNewMedia) {
        logToPopup('success', 'Đã xác nhận sau khi retry: website đang xử lý');
      } else {
        logToPopup('warning', 'Vẫn chưa thấy dấu hiệu xử lý, nhưng sẽ tiếp tục monitor...');
      }
    } catch (e) {
      logToPopup('warning', `Lỗi khi retry: ${e.message}`);
    }
  }

  logToPopup('info', `Đã hoàn tất click nút tạo ${type}`);
}

async function monitorCompletion() {
  // Monitor for completion indicators
  // Optimized for faster detection

  // Different timeout for image vs video - give more time for actual generation
  const isVideo = currentType === 'video';
  const maxWaitTime = isVideo ? 300000 : 180000; // 5 min for video, 3 min for image (realistic times)
  const checkInterval = 1000; // Check every 1 second (fast but not too CPU intensive)
  const startTime = Date.now();
  let lastStatus = '';
  let lastMediaCount = 0;
  let lastMediaSrcs = new Set(); // Track media sources to detect new ones
  let noProgressTime = 0;
  const noProgressTimeout = 120000; // 2 minutes without progress = skip (only if never saw processing)
  let hasSeenProcessing = false; // Track if we've seen any processing indicator
  let hasStartedProcessing = false; // Track if processing actually started

  logToPopup('info', `Bắt đầu monitor completion (tối đa ${Math.round(maxWaitTime / 60000)} phút cho ${currentType})...`);

  while (Date.now() - startTime < maxWaitTime) {
    const elapsed = Math.round((Date.now() - startTime) / 1000);

    // Fast path: Check for completion indicators first (most common)
    const completionIndicators = [
      // Look for download buttons, success messages, etc.
      'button[aria-label*="download" i]',
      'button[aria-label*="tải" i]',
      'button[aria-label*="save" i]',
      'button[aria-label*="lưu" i]',
      '[class*="success" i]',
      '[class*="complete" i]',
      '[class*="done" i]',
      '[class*="finished" i]',
      '[class*="ready" i]'
    ];

    let completed = false;
    for (const selector of completionIndicators) {
      const elements = document.querySelectorAll(selector);
      if (elements.length > 0) {
        // Check if any element is visible
        for (const el of elements) {
          if (isElementVisible(el)) {
            completed = true;
            logToPopup('success', `Tìm thấy completion indicator: ${selector}`);
            break;
          }
        }
        if (completed) break;
      }
    }

    // Fast path: Check for video/image elements that might indicate completion
    // CRITICAL: Only count NEW media (not existing media from previous prompts)
    if (!completed) {
      const mediaElements = document.querySelectorAll('video, img, canvas, [class*="preview" i], [class*="result" i], [class*="output" i]');
      let currentMediaCount = 0;
      let newMediaCount = 0; // Count only NEW media
      let hasLoadedMedia = false;
      const currentMediaSrcs = new Set();
      const newMediaSrcs = new Set(); // Track NEW media sources

      for (const el of mediaElements) {
        if (isElementVisible(el)) {
          // Track media sources
          let src = '';
          let isNewMedia = false;

          if (el.tagName === 'VIDEO' || el.tagName === 'IMG') {
            src = el.src || el.currentSrc || '';
            if (src && (src.includes('flow') || src.includes('veo') || src.includes('google') || src.startsWith('http'))) {
              currentMediaSrcs.add(src);
              // Check if this is NEW media (not in initial set)
              if (!initialMediaSrcs.has(src) && src.length > 20) {
                isNewMedia = true;
                newMediaSrcs.add(src);
              }
            }
          }

          // Count all visible media
          if (el.tagName === 'VIDEO' || el.tagName === 'IMG' || el.tagName === 'CANVAS' ||
            (el.classList && Array.from(el.classList).some(c => c.toLowerCase().includes('preview') || c.toLowerCase().includes('result')))) {
            currentMediaCount++;
          }

          // Only consider completion if we find NEW media
          if (isNewMedia) {
            newMediaCount++;

            if (el.tagName === 'VIDEO') {
              // Kiểm tra kỹ hơn xem có VIDEO thực sự chưa
              if (el.readyState >= 3 && el.duration > 0 && el.duration >= 1.0 &&
                el.videoWidth >= 200 && el.videoHeight >= 200 && el.buffered.length > 0) {
                completed = true;
                hasLoadedMedia = true;
                logToPopup('success', `Tìm thấy VIDEO MỚI đã load đầy đủ (duration: ${el.duration.toFixed(1)}s, size: ${el.videoWidth}x${el.videoHeight}, readyState: ${el.readyState})`);
                break;
              }
            } else if (el.tagName === 'IMG') {
              if (el.complete && el.naturalWidth > 0 && el.naturalHeight > 0) {
                // Check if it's a real image (not just an icon/placeholder) - require larger size
                const aspectRatio = el.naturalWidth / el.naturalHeight;
                if (el.naturalWidth >= 300 && el.naturalHeight >= 300 && isElementVisible(el) &&
                  aspectRatio <= 3 && aspectRatio >= 0.33) { // Not a banner/icon
                  completed = true;
                  hasLoadedMedia = true;
                  logToPopup('success', `Tìm thấy IMAGE MỚI đã load (${el.naturalWidth}x${el.naturalHeight})`);
                  break;
                }
              }
            } else if (el.tagName === 'CANVAS') {
              if (el.width > 0 && el.height > 0) {
                // Check if canvas has actual content (not just empty)
                try {
                  const ctx = el.getContext('2d');
                  const imageData = ctx.getImageData(0, 0, Math.min(10, el.width), Math.min(10, el.height));
                  const hasContent = imageData.data.some((val, idx) => idx % 4 !== 3 && val !== 0);
                  if (hasContent && el.width > 100 && el.height > 100) {
                    completed = true;
                    hasLoadedMedia = true;
                    logToPopup('success', `Tìm thấy canvas MỚI với content (${el.width}x${el.height})`);
                    break;
                  }
                } catch (e) {
                  // Canvas might be from different origin, just check size
                  if (el.width > 200 && el.height > 200) {
                    completed = true;
                    hasLoadedMedia = true;
                    logToPopup('success', `Tìm thấy canvas MỚI lớn (${el.width}x${el.height})`);
                    break;
                  }
                }
              }
            } else if (el.classList) {
              const classes = Array.from(el.classList).map(c => c.toLowerCase());
              // Preview, result, output elements - require larger size and visibility
              if (classes.some(c => c.includes('preview') || c.includes('result') || c.includes('output') || c.includes('generated'))) {
                if (el.offsetWidth > 300 && el.offsetHeight > 300 && isElementVisible(el)) {
                  // Also check if it contains actual media (img or video)
                  const hasMediaInside = el.querySelector('img[src], video[src]');
                  if (hasMediaInside) {
                    completed = true;
                    hasLoadedMedia = true;
                    logToPopup('success', `Tìm thấy preview/result element MỚI với media (${el.offsetWidth}x${el.offsetHeight})`);
                    break;
                  }
                }
              }
            }
          }
        }
      }

      // Log progress: show NEW media count
      if (newMediaCount > 0) {
        logToPopup('info', `Phát hiện ${newMediaCount} media MỚI (tổng: ${currentMediaCount}, ban đầu: ${initialMediaCount})`);
      }

      // Track progress: Only count NEW media (not existing media)
      // Compare current count to initial count to detect NEW media
      const actualNewMediaCount = currentMediaCount - initialMediaCount;

      if (actualNewMediaCount > 0 && actualNewMediaCount > (lastMediaCount - initialMediaCount)) {
        lastMediaCount = currentMediaCount;
        noProgressTime = 0;
        hasSeenProcessing = true;
        hasStartedProcessing = true;
        logToPopup('info', `Phát hiện ${actualNewMediaCount} media MỚI (tổng: ${currentMediaCount}, ban đầu: ${initialMediaCount})`);
      }

      // Check for NEW media sources (sources that weren't there at start)
      const trulyNewSources = Array.from(newMediaSrcs).filter(src => !lastMediaSrcs.has(src));
      if (trulyNewSources.length > 0) {
        // Verify these are real media sources (not just icons or placeholders)
        const realSources = trulyNewSources.filter(src => {
          // Check if source URL looks like actual media (not icon, not placeholder)
          return src.length > 20 &&
            !src.includes('icon') &&
            !src.includes('placeholder') &&
            !src.includes('avatar') &&
            (src.includes('flow') || src.includes('veo') || src.includes('google') || src.includes('cdn'));
        });

        if (realSources.length > 0) {
          // Update lastMediaSrcs to include new sources
          trulyNewSources.forEach(src => lastMediaSrcs.add(src));
          noProgressTime = 0;
          hasSeenProcessing = true;
          hasStartedProcessing = true;
          logToPopup('info', `Phát hiện ${realSources.length} media source MỚI (đã verify)`);
        }
      } else if (!hasLoadedMedia) {
        // Only increment noProgressTime if we haven't seen any processing yet
        if (!hasSeenProcessing) {
          noProgressTime += checkInterval;
        }
      }
    }

    // Check for processing indicators (loading, generating, etc.)
    if (!completed) {
      const processingSelectors = [
        '[class*="loading" i]',
        '[class*="generating" i]',
        '[class*="processing" i]',
        '[class*="spinner" i]',
        '[class*="progress" i]',
        '[aria-busy="true"]',
        '[class*="pending" i]',
        '[class*="queue" i]',
        '[class*="waiting" i]'
      ];

      let isProcessing = false;
      for (const selector of processingSelectors) {
        const indicators = document.querySelectorAll(selector);
        for (const indicator of indicators) {
          if (isElementVisible(indicator)) {
            isProcessing = true;
            hasSeenProcessing = true;
            noProgressTime = 0; // Reset no progress timer if we see processing
            const status = indicator.textContent || indicator.getAttribute('aria-label') || indicator.getAttribute('title') || 'Đang xử lý...';
            if (status !== lastStatus && status.trim().length > 0) {
              logToPopup('info', `Status: ${status.substring(0, 50)} (${elapsed}s)`);
              lastStatus = status;
            }
            break;
          }
        }
        if (isProcessing) break;
      }

      // Check for changes in DOM (new elements appearing = progress)
      // Only count if NEW media appeared (not just existing media)
      const currentMediaCount = document.querySelectorAll('video, img[src*="flow"], img[src*="veo"], canvas, [class*="preview" i]').length;
      const actualNewCount = currentMediaCount - initialMediaCount;
      if (actualNewCount > 0 && currentMediaCount !== lastMediaCount) {
        hasSeenProcessing = true;
        noProgressTime = 0;
        lastMediaCount = currentMediaCount;
        logToPopup('info', `Phát hiện media mới: ${actualNewCount} (tổng: ${currentMediaCount}, ban đầu: ${initialMediaCount})`);
      }

      // Check for any text changes that might indicate progress
      const progressTexts = document.querySelectorAll('[class*="progress" i], [class*="status" i], [class*="time" i]');
      for (const textEl of progressTexts) {
        if (isElementVisible(textEl)) {
          const text = textEl.textContent || '';
          if (text.includes('%') || text.includes('giây') || text.includes('phút') || text.match(/\d+\/\d+/)) {
            hasSeenProcessing = true;
            noProgressTime = 0;
            if (text !== lastStatus) {
              logToPopup('info', `Progress: ${text.substring(0, 50)} (${elapsed}s)`);
              lastStatus = text;
            }
            break;
          }
        }
      }

      // Only skip if we've NEVER seen processing AND no progress for timeout
      // If we've seen processing (website is working), DON'T skip - wait for completion
      if (!hasStartedProcessing && !isProcessing && noProgressTime >= noProgressTimeout) {
        logToPopup('warning', `Không có dấu hiệu xử lý trong ${Math.round(noProgressTimeout / 1000)}s, có thể button chưa được click đúng. Tiếp tục với prompt tiếp theo...`);
        return; // Exit early only if never started processing
      }

      // If processing started, don't skip - wait for completion
      if (hasStartedProcessing && !isProcessing) {
        // Processing stopped but no completion yet - might be generating
        // Wait a bit more before checking completion
        if (elapsed % 30 === 0) {
          logToPopup('info', `Đã thấy processing trước đó, đang chờ completion... (${elapsed}s/${Math.round(maxWaitTime / 1000)}s)`);
        }
      }

      // Log progress every 15 seconds (more frequent if processing)
      if (elapsed % 15 === 0 && elapsed > 0) {
        if (hasSeenProcessing) {
          logToPopup('info', `Đang xử lý... (${elapsed}s/${Math.round(maxWaitTime / 1000)}s)`);
        } else {
          logToPopup('info', `Đang chờ... (${elapsed}s/${Math.round(maxWaitTime / 1000)}s)`);
        }
      }
    }

    if (completed) {
      // CRITICAL: Verify media is actually visible on page before reporting completion
      logToPopup('info', 'Đã phát hiện completion indicator, đang verify media thực sự...');

      // Scroll through page to find actual visible NEW media
      const originalScrollY = window.scrollY;
      let verifiedMedia = null;

      // Check current viewport - ONLY look for NEW media
      let mediaElements = document.querySelectorAll('video, img, canvas, [class*="preview" i], [class*="result" i], [class*="output" i]');
      for (const media of mediaElements) {
        if (isElementVisible(media)) {
          // CRITICAL: Verify this is NEW media (not existing)
          let isNew = false;
          if (media.tagName === 'VIDEO' || media.tagName === 'IMG') {
            const src = media.src || media.currentSrc || '';
            if (src && src.length > 20 && !initialMediaSrcs.has(src)) {
              isNew = true;
            }
          } else {
            // For canvas/elements, check if they're newly created
            // Assume it's new if it wasn't in initial count
            isNew = true; // Will verify by size/visibility
          }

          if (isNew || !initialMediaSrcs.size) { // If no initial media, accept any
            // STRICTER FILTERING: Ignore small icons (must be > 200px)
            if (media.tagName === 'IMG' && media.naturalWidth > 200 && media.naturalHeight > 200) {
              // Check aspect ratio to avoid banners
              const ratio = media.naturalWidth / media.naturalHeight;
              if (ratio > 0.2 && ratio < 5) {
                verifiedMedia = media;
                logToPopup('success', `Tìm thấy IMAGE MỚI thực sự (${media.naturalWidth}x${media.naturalHeight})`);
                break;
              }
            } else if (media.tagName === 'VIDEO' && media.duration > 0.5 && media.readyState >= 2) {
              verifiedMedia = media;
              logToPopup('success', `Tìm thấy VIDEO MỚI thực sự (duration: ${media.duration.toFixed(1)}s)`);
              break;
            } else if (media.offsetWidth > 300 && media.offsetHeight > 300) {
              // For other elements, ensure they are not just containers of icons
              verifiedMedia = media;
              logToPopup('success', `Tìm thấy media element MỚI lớn (${media.offsetWidth}x${media.offsetHeight})`);
              break;
            }
          }
        }
      }

      // If not found, scroll and search
      if (!verifiedMedia) {
        window.scrollTo(0, 0);
        await sleep(500);
        mediaElements = document.querySelectorAll('video, img, canvas, [class*="preview" i], [class*="result" i]');
        for (const media of mediaElements) {
          if (isElementVisible(media)) {
            if (media.tagName === 'IMG' && media.naturalWidth > 200) {
              verifiedMedia = media;
              logToPopup('success', 'Tìm thấy image ở đầu trang');
              break;
            } else if (media.tagName === 'VIDEO' && media.duration > 0.5) {
              verifiedMedia = media;
              logToPopup('success', 'Tìm thấy video ở đầu trang');
              break;
            }
          }
        }
      }

      if (!verifiedMedia) {
        window.scrollTo(0, document.body.scrollHeight / 2);
        await sleep(500);
        mediaElements = document.querySelectorAll('video, img, canvas, [class*="preview" i], [class*="result" i]');
        for (const media of mediaElements) {
          if (isElementVisible(media) && !verifiedMedia) {
            if (media.tagName === 'IMG' && media.naturalWidth > 200) {
              verifiedMedia = media;
              logToPopup('success', 'Tìm thấy image ở giữa trang');
              break;
            } else if (media.tagName === 'VIDEO' && media.duration > 0.5) {
              verifiedMedia = media;
              logToPopup('success', 'Tìm thấy video ở giữa trang');
              break;
            }
          }
        }
      }

      if (!verifiedMedia) {
        window.scrollTo(0, document.body.scrollHeight);
        await sleep(500);
        mediaElements = document.querySelectorAll('video, img, canvas, [class*="preview" i], [class*="result" i]');
        for (const media of mediaElements) {
          if (isElementVisible(media) && !verifiedMedia) {
            if (media.tagName === 'IMG' && media.naturalWidth > 200) {
              verifiedMedia = media;
              logToPopup('success', 'Tìm thấy image ở cuối trang');
              break;
            } else if (media.tagName === 'VIDEO' && media.duration > 0.5) {
              verifiedMedia = media;
              logToPopup('success', 'Tìm thấy video ở cuối trang');
              break;
            }
          }
        }
      }

      // Restore scroll
      window.scrollTo(0, originalScrollY);

      // Only report completion if we found actual visible media
      if (verifiedMedia) {
        // CRITICAL: Double-check size to avoid icons (must be > 100px)
        // For images, use naturalWidth/naturalHeight (actual image size)
        // For videos/other elements, use offsetWidth/offsetHeight (rendered size)
        let width, height;
        if (verifiedMedia.tagName === 'IMG') {
          width = verifiedMedia.naturalWidth;
          height = verifiedMedia.naturalHeight;
        } else {
          width = verifiedMedia.offsetWidth;
          height = verifiedMedia.offsetHeight;
        }

        if (width < 100 || height < 100) {
          logToPopup('warning', `Media quá nhỏ (${width}x${height}), có thể là icon. Tiếp tục chờ...`);
          verifiedMedia = null;
          completed = false; // Reset completion flag
        } else {
          verifiedMedia.scrollIntoView({ behavior: 'smooth', block: 'center' });
          await sleep(1000);
          logToPopup('success', `Đã verify media thực sự! Type: ${verifiedMedia.tagName}, Size: ${width}x${height}`);

          // Get media source for logging
          const mediaSrc = verifiedMedia.src || verifiedMedia.currentSrc || verifiedMedia.getAttribute('src') || '';
          if (mediaSrc) {
            logToPopup('info', `Media source: ${mediaSrc.substring(0, 100)}...`);
          }

          // CRITICAL: Wait a bit more to ensure ALL media are fully loaded before downloading
          // Sometimes multiple videos are created but not all are immediately visible
          logToPopup('info', 'Đang chờ thêm một chút để đảm bảo tất cả media đã được tạo...');
          await sleep(3000); // Wait 3 seconds for all media to appear

          logToPopup('info', 'Đang trigger download cho TẤT CẢ media mới...');
          await triggerDownload();
          await sleep(3000); // Wait longer to ensure all downloads started
          logToPopup('success', 'Đã hoàn thành và trigger download cho tất cả media! Kiểm tra thư mục Downloads...');
          return { mediaFound: true, media: verifiedMedia };
        }
      }

      if (!verifiedMedia) {
        logToPopup('warning', 'Phát hiện completion indicator nhưng không tìm thấy media thực sự. Tiếp tục chờ...');
        completed = false; // Reset completion flag, continue monitoring
      }
    }

    // Check for errors that would prevent completion
    const errorSelectors = [
      '[class*="error" i]:not([class*="Flow"])',
      '[role="alert"]',
      '[aria-invalid="true"]'
    ];

    for (const selector of errorSelectors) {
      const errors = document.querySelectorAll(selector);
      for (const err of errors) {
        if (isElementVisible(err)) {
          const errorText = err.textContent || err.innerText;
          if (errorText && errorText.trim().length > 0 &&
            !errorText.includes('Flow - SceneBuilder') &&
            !errorText.includes('Flow') &&
            (errorText.toLowerCase().includes('error') ||
              errorText.toLowerCase().includes('fail') ||
              errorText.toLowerCase().includes('invalid'))) {
            logToPopup('error', `Lỗi nghiêm trọng: ${errorText.substring(0, 150)}`);
            // Continue anyway, might be a false positive
          }
        }
      }
    }

    await sleep(checkInterval);
  }

  // Timeout - check one more time for media before giving up
  logToPopup('warning', `Đã chờ ${Math.round(maxWaitTime / 60000)} phút, kiểm tra lần cuối...`);

  // Final check: scroll through page to find any media that might have been created
  const originalScrollY = window.scrollY;
  window.scrollTo(0, 0);
  await sleep(1000);

  // Check for media at top
  let finalMedia = document.querySelectorAll('video, img[src*="flow"], img[src*="veo"], img[src*="google"], canvas, [class*="preview" i], [class*="result" i]');
  let foundMedia = false;

  for (const media of finalMedia) {
    if (isElementVisible(media)) {
      if (media.tagName === 'IMG' && media.naturalWidth > 100) {
        foundMedia = true;
        logToPopup('success', 'Tìm thấy image đã được tạo!');
        break;
      } else if (media.tagName === 'VIDEO' && media.duration > 0) {
        foundMedia = true;
        logToPopup('success', 'Tìm thấy video đã được tạo!');
        break;
      } else if (media.offsetWidth > 200 && media.offsetHeight > 200) {
        foundMedia = true;
        logToPopup('success', 'Tìm thấy media element lớn!');
        break;
      }
    }
  }

  // Scroll down to check more
  window.scrollTo(0, document.body.scrollHeight / 2);
  await sleep(1000);

  finalMedia = document.querySelectorAll('video, img, canvas, [class*="preview" i], [class*="result" i]');
  for (const media of finalMedia) {
    if (isElementVisible(media) && !foundMedia) {
      if (media.tagName === 'IMG' && media.naturalWidth > 100) {
        foundMedia = true;
        logToPopup('success', 'Tìm thấy image đã được tạo (ở giữa trang)!');
        break;
      } else if (media.tagName === 'VIDEO' && media.duration > 0) {
        foundMedia = true;
        logToPopup('success', 'Tìm thấy video đã được tạo (ở giữa trang)!');
        break;
      }
    }
  }

  // Scroll to bottom
  window.scrollTo(0, document.body.scrollHeight);
  await sleep(1000);

  finalMedia = document.querySelectorAll('video, img, canvas, [class*="preview" i], [class*="result" i]');
  for (const media of finalMedia) {
    if (isElementVisible(media) && !foundMedia) {
      if (media.tagName === 'IMG' && media.naturalWidth > 100) {
        foundMedia = true;
        logToPopup('success', 'Tìm thấy image đã được tạo (ở cuối trang)!');
        break;
      } else if (media.tagName === 'VIDEO' && media.duration > 0) {
        foundMedia = true;
        logToPopup('success', 'Tìm thấy video đã được tạo (ở cuối trang)!');
        break;
      }
    }
  }

  // Restore scroll position
  window.scrollTo(0, originalScrollY);

  if (foundMedia) {
    logToPopup('success', 'Đã tìm thấy media đã được tạo! Đang chờ thêm để đảm bảo tất cả media đã được tạo...');
    await sleep(3000); // Wait 3 seconds to ensure all media are created

    logToPopup('info', 'Đang trigger download cho TẤT CẢ media mới...');
    await triggerDownload();
    await sleep(3000); // Wait longer to ensure all downloads started
    logToPopup('info', 'Đã trigger download cho tất cả media, kiểm tra thư mục Downloads...');
    return { mediaFound: true };
  } else {
    logToPopup('error', `Không tìm thấy media sau ${Math.round(maxWaitTime / 60000)} phút. Có thể website chưa tạo xong hoặc có lỗi.`);
    logToPopup('warning', 'Media không được tạo thành công cho prompt này');
    return { mediaFound: false };
  }
}

// Function to select video resolution before download
// CRITICAL: This function should be called AFTER finding download button, not before
// Because download button click opens the resolution dropdown
async function selectVideoResolutionFromDownloadMenu() {
  if (currentType !== 'video') {
    return false; // Only for video
  }

  logToPopup('info', 'Đang tìm menu resolution sau khi click download button...');

  const menuSelectors = [
    '[role="menu"]',
    '[role="listbox"]',
    '[role="dialog"]',
    '[class*="menu" i]',
    '[class*="Menu" i]',
    '[class*="dropdown" i]',
    '[class*="Dropdown" i]',
    '[class*="popover" i]',
    '[class*="Popover" i]',
    '[class*="popup" i]',
    '[class*="Popup" i]',
    '[class*="options" i]',
    '[class*="Options" i]',
    '[class*="sheet" i]',
    '[class*="Sheet" i]',
    'cfc-dialog',
    'cfc-menu',
    'cfc-bottom-sheet',
    'div[data-testid*="resolution" i]',
    'div[data-testid*="quality" i]'
  ];

  const menuItemSelectors = [
    '[role="option"]',
    '[role="menuitem"]',
    '[role="listitem"]',
    'li',
    'button',
    'a',
    'div[class*="item" i]',
    'div[class*="option" i]',
    'span[class*="item" i]',
    'span[class*="option" i]',
    'div[tabindex]',
    '[class*="choice" i]'
  ];

  const keywordScore = (text) => {
    if (!text) return 0;
    if (text.includes('1080')) return 6;
    if (text.includes('4k')) return 5;
    if (text.includes('original') || text.includes('kích thước')) return 4;
    if (text.includes('720')) return 3;
    if (text.includes('480')) return 2;
    if (text.includes('mp4') || text.includes('webm')) return 2;
    if (text.includes('gif')) return -5;
    if (text.includes('270')) return -3;
    return 1;
  };

  const getItemText = (item) => {
    return (
      (item.textContent || '') + ' ' +
      (item.getAttribute('aria-label') || '') + ' ' +
      (item.getAttribute('title') || '') + ' ' +
      (item.getAttribute('data-label') || '') + ' ' +
      (item.getAttribute('data-value') || '') + ' ' +
      (item.getAttribute('data-text') || '')
    ).toLowerCase().replace(/\s+/g, ' ').trim();
  };

  const clickItem = async (item, desc) => {
    logToPopup('success', `Chọn option "${desc}": ${item.textContent.substring(0, 80)}`);
    item.scrollIntoView({ behavior: 'smooth', block: 'center' });
    await sleep(300);

    try {
      item.click();
      item.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));
      item.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, cancelable: true }));
      item.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    } catch (e) {
      try {
        item.click();
      } catch (err) {
        logToPopup('warning', `Không thể click option: ${err.message}`);
      }
    }

    await sleep(1000);
    return true;
  };

  const getPrioritizedOption = (items) => {
    const priorities = [
      { label: '1080p', test: text => text.includes('1080') && !text.includes('gif') },
      { label: '4K', test: text => text.includes('4k') && !text.includes('gif') },
      { label: 'Original/Gốc', test: text => (text.includes('original') || text.includes('kích thước gốc')) && !text.includes('gif') },
      { label: '720p', test: text => text.includes('720') && !text.includes('gif') },
      { label: '480p', test: text => text.includes('480') && !text.includes('gif') },
      { label: 'MP4', test: text => text.includes('mp4') && !text.includes('gif') },
      { label: 'Best Available', test: text => !text.includes('gif') && !text.includes('270') && text.length > 2 }
    ];

    for (const priority of priorities) {
      const candidate = items.find(item => priority.test(getItemText(item)));
      if (candidate) {
        return { item: candidate, label: priority.label };
      }
    }

    const fallback = items.find(item => getItemText(item).length === 0);
    if (fallback) {
      return { item: fallback, label: 'Fallback (no label)' };
    }

    return null;
  };

  const attemptDelays = [700, 900, 1100, 1400];
  let menuFound = false;

  for (let attempt = 0; attempt < attemptDelays.length; attempt++) {
    if (attempt > 0) {
      logToPopup('info', `Retry tìm resolution menu (${attempt + 1}/${attemptDelays.length})...`);
    }

    await sleep(attemptDelays[attempt]);

    const menus = querySelectorAllDeep(document, menuSelectors)
      .filter(menu => isElementVisible(menu) && menu.offsetWidth > 40 && menu.offsetHeight > 40);

    if (menus.length === 0) {
      continue;
    }

    for (const menu of menus) {
      const menuText = (menu.textContent || menu.getAttribute('aria-label') || '').toLowerCase();
      const hasKeyword = ['1080', '720', 'mp4', 'original', 'kích thước', 'quality', 'chất lượng', 'gif', '4k']
        .some(keyword => menuText.includes(keyword));

      const menuItems = querySelectorAllDeep(menu, menuItemSelectors)
        .filter(item => isElementVisible(item));

      if (!hasKeyword && menuItems.length === 0) {
        continue;
      }

      menuFound = true;
      logToPopup('info', `Tìm thấy resolution menu (attempt ${attempt + 1}) với ${menuItems.length} option`);

      if (menuItems.length === 0) {
        continue;
      }

      const prioritized = getPrioritizedOption(menuItems);
      if (prioritized) {
        return await clickItem(prioritized.item, prioritized.label);
      }

      // Scoring fallback - choose highest scoring item
      const sorted = menuItems
        .map(item => ({ item, text: getItemText(item), score: keywordScore(getItemText(item)) }))
        .sort((a, b) => b.score - a.score);

      if (sorted.length > 0 && sorted[0].score > -5) {
        return await clickItem(sorted[0].item, 'Scored Option');
      }

      logToPopup('warning', `Menu tìm thấy nhưng không có option phù hợp. Items: ${menuItems.map(i => getItemText(i).substring(0, 30)).join(', ')}`);
    }
  }

  if (!menuFound) {
    logToPopup('warning', 'Không tìm thấy resolution menu sau nhiều lần thử');
    logToPopup('info', 'Có thể download đã được trigger tự động với resolution mặc định');
    return true;
  }

  logToPopup('warning', 'Không tìm thấy option phù hợp trong menu');
  return false;
}

async function triggerDownload() {
  logToPopup('info', 'Đang tìm cách tải về...');
  // Reset download triggered flag for new download attempt
  downloadTriggeredForMedia = false;

  // NOTE: For video, we need to click download button FIRST to open resolution menu
  // Then select 720p from the menu, which will trigger the actual download
  // So we DON'T select resolution before finding download button

  // CRITICAL: For video, ALWAYS try to find and click download button first
  // Video URLs from video element are often streaming URLs, not download URLs
  // Strategy 0: First, try to find download button near the most recent video/image
  // This is often the most reliable method, ESPECIALLY for video
  // IMPORTANT: Find NEW media (not in initialMediaSrcs)
  const allRecentMedia = Array.from(document.querySelectorAll('video, img, canvas, [class*="preview" i], [class*="result" i], [class*="output" i]'));

  // Filter: Only NEW media (not in initialMediaSrcs) and not banner/background
  // STRICT FILTERING: Only accept real media, not icons/placeholders
  let recentMedia = allRecentMedia.filter(media => {
    if (!isElementVisible(media)) return false;

    const src = media.src || media.currentSrc || media.getAttribute('src') || '';
    const srcLower = src.toLowerCase();

    // Skip banner/background/icon/placeholder
    if (srcLower.includes('banner') ||
      srcLower.includes('background') ||
      srcLower.includes('flow31_bg') ||
      srcLower.includes('header') ||
      srcLower.includes('nav') ||
      srcLower.includes('icon') ||
      srcLower.includes('placeholder') ||
      srcLower.includes('avatar') ||
      srcLower.includes('logo')) {
      return false;
    }

    // CRITICAL: Skip if already downloaded globally (prevent duplicates across prompts)
    if (src && src.length > 20 && globalDownloadedMediaSrcs.has(src)) {
      return false; // Already downloaded, skip
    }

    // CRITICAL: Only accept NEW media (not in initialMediaSrcs)
    if (src && src.length > 20 && initialMediaSrcs.has(src)) {
      return false; // This is old media from before this prompt, skip it
    }

    // STRICT FILTERING: Only accept real media, not icons/placeholders
    if (media.tagName === 'IMG') {
      // Must be real image: natural size > 300px (stricter to avoid icons)
      if (media.naturalWidth < 300 || media.naturalHeight < 300) return false;
      if (media.offsetWidth < 300 || media.offsetHeight < 300) return false;
      // Check if it's complete (not loading)
      if (!media.complete) return false;
      // Additional check: image must have actual content (not transparent/empty)
      // Skip if it's too small or looks like an icon
      const aspectRatio = media.naturalWidth / media.naturalHeight;
      if (aspectRatio > 3 || aspectRatio < 0.33) return false; // Skip very wide/tall images (likely banners/icons)
      return true;
    } else if (media.tagName === 'VIDEO') {
      // STRICT: Video must be fully rendered and playable
      // Must have duration > 1s (real video, not placeholder or icon)
      if (media.duration > 0 && media.duration < 1.0) return false;
      // Must have readyState >= 3 (HAVE_FUTURE_DATA) - video has enough data to play
      if (media.readyState < 3) return false;
      // Must be visible and large enough (not icon/placeholder)
      if (media.offsetWidth < 300 || media.offsetHeight < 200) return false;
      // Must have valid source URL
      if (!src || src.length < 20) return false;
      // Check if video has actual video dimensions (not just placeholder)
      if (media.videoWidth < 200 || media.videoHeight < 200) return false;
      // Additional check: video must be loaded enough to play
      if (media.buffered.length === 0) return false;
      // Check if video has actual content (not just empty/placeholder)
      if (media.paused && media.currentTime === 0 && media.readyState < 4) return false;
      return true;
    } else {
      // For canvas/other elements, must be large enough and visible
      if (media.offsetWidth < 300 || media.offsetHeight < 300) return false;
      return true;
    }
  });

  logToPopup('info', `Tìm thấy ${recentMedia.length} media elements MỚI (sau khi filter chặt chẽ)`);

  // CRITICAL: Chỉ download 1 video/image mỗi kiểu để tránh duplicate
  // Flow có thể tạo nhiều video/image cùng kiểu, nhưng chỉ cần 1 cái
  const maxMediaPerPrompt = 1; // CHỈ DOWNLOAD 1 MEDIA MỖI PROMPT

  // CRITICAL: Download TẤT CẢ media mới, không chỉ media mới nhất
  // Track which media we've already tried to download in this session to avoid duplicates
  const downloadedMediaSrcs = new Set();

  // RETRY LOGIC: Nếu không tìm thấy video, thử lại vài lần
  // Tăng số lần retry để đợi video render đầy đủ
  const maxRetries = 5;
  let retryCount = 0;

  while (retryCount < maxRetries) {
    // Re-check for media on each retry (media might still be loading)
    if (retryCount > 0) {
      logToPopup('info', `Retry ${retryCount}/${maxRetries - 1}: Đang tìm lại video...`);
      // Tăng thời gian đợi cho các lần retry sau để video có thời gian render
      const retryDelay = retryCount <= 2 ? 2000 : 3000; // 2s cho retry đầu, 3s cho retry sau
      await sleep(retryDelay);

      // Re-query for media (might have loaded since last check)
      const retryAllMedia = Array.from(document.querySelectorAll('video, img, canvas, [class*="preview" i], [class*="result" i], [class*="output" i]'));
      const retryRecentMedia = retryAllMedia.filter(media => {
        if (!isElementVisible(media)) return false;
        const src = media.src || media.currentSrc || media.getAttribute('src') || '';
        const srcLower = src.toLowerCase();

        // Skip banner/background/icon/placeholder
        if (srcLower.includes('banner') || srcLower.includes('background') ||
          srcLower.includes('flow31_bg') || srcLower.includes('header') ||
          srcLower.includes('nav') || srcLower.includes('icon') ||
          srcLower.includes('placeholder') || srcLower.includes('avatar') ||
          srcLower.includes('logo')) {
          return false;
        }

        // Skip if already downloaded globally
        if (src && src.length > 20 && globalDownloadedMediaSrcs.has(src)) {
          return false;
        }

        // Skip if from before this prompt
        if (src && src.length > 20 && initialMediaSrcs.has(src)) {
          return false;
        }

        // STRICT: Only real media, not icons/placeholders
        if (media.tagName === 'IMG') {
          if (media.naturalWidth < 300 || media.naturalHeight < 300) return false;
          if (media.offsetWidth < 300 || media.offsetHeight < 300) return false;
          if (!media.complete) return false;
          const aspectRatio = media.naturalWidth / media.naturalHeight;
          if (aspectRatio > 3 || aspectRatio < 0.33) return false; // Skip banners/icons
          return true;
        } else if (media.tagName === 'VIDEO') {
          // STRICT: Video must be fully rendered and playable
          if (media.duration > 0 && media.duration < 1.0) return false;
          if (media.readyState < 3) return false; // HAVE_FUTURE_DATA
          if (media.offsetWidth < 300 || media.offsetHeight < 200) return false;
          if (!src || src.length < 20) return false;
          if (media.videoWidth < 200 || media.videoHeight < 200) return false;
          if (media.buffered.length === 0) return false;
          if (media.paused && media.currentTime === 0 && media.readyState < 4) return false;
          return true;
        } else {
          return media.offsetWidth >= 300 && media.offsetHeight >= 300;
        }
      });

      // Update recentMedia with retry results
      recentMedia.length = 0;
      recentMedia.push(...retryRecentMedia);
      logToPopup('info', `Retry ${retryCount}: Tìm thấy ${recentMedia.length} media mới`);
    }

    // Process media if found
    if (recentMedia.length > 0) {
      // Sort by position in DOM (newer elements are usually later)
      recentMedia.sort((a, b) => {
        const aPos = Array.from(document.querySelectorAll('*')).indexOf(a);
        const bPos = Array.from(document.querySelectorAll('*')).indexOf(b);
        return bPos - aPos; // Newer elements first
      });

      // CRITICAL: Chỉ lấy 1 media đầu tiên (mới nhất) để tránh download nhiều video/image cùng kiểu
      // Flow có thể tạo nhiều video/image giống nhau, nhưng chỉ cần 1 cái
      const targetMedia = recentMedia.slice(0, 1); // CHỈ DOWNLOAD 1 MEDIA

      logToPopup('info', `Bắt đầu download ${targetMedia.length}/${recentMedia.length} media mới (chỉ download 1 media mỗi prompt để tránh duplicate)...`);

      // Loop through target media and download each one
      for (let mediaIndex = 0; mediaIndex < targetMedia.length; mediaIndex++) {
        const media = targetMedia[mediaIndex];
        const mediaSrc = media.src || media.currentSrc || media.getAttribute('src') || '';

        // CRITICAL: Create unique identifier for this media element
        // Use combination of src, position, and size to ensure uniqueness
        const mediaRect = media.getBoundingClientRect();
        const mediaPosition = `${Math.round(mediaRect.left)}_${Math.round(mediaRect.top)}`;
        const mediaSize = `${media.offsetWidth}_${media.offsetHeight}`;
        const mediaUniqueId = mediaSrc && mediaSrc.length > 20
          ? mediaSrc
          : `${mediaPosition}_${mediaSize}_${media.tagName}`;

        // CRITICAL: Better duplicate prevention using Set() global tracking
        // Check by unique ID first (most reliable)
        if (downloadedMediaSrcs.has(mediaUniqueId) || globalDownloadedMediaIds.has(mediaUniqueId)) {
          logToPopup('info', `Bỏ qua media ${mediaIndex + 1}/${targetMedia.length} (đã download trong session này - ID)`);
          continue;
        }

        // Check if this media element has already triggered download
        if (downloadedMediaElements.has(mediaUniqueId)) {
          logToPopup('info', `Bỏ qua media ${mediaIndex + 1}/${targetMedia.length} (đã trigger download cho element này)`);
          continue;
        }

        // Check by src URL if available (for additional safety)
        if (mediaSrc && mediaSrc.length > 20) {
          if (downloadedMediaSrcs.has(mediaSrc) || globalDownloadedMediaSrcs.has(mediaSrc)) {
            logToPopup('info', `Bỏ qua media ${mediaIndex + 1}/${targetMedia.length} (đã download trước đó - URL)`);
            continue;
          }
        }

        // Also check by position + size combination (for cases where src might change)
        const positionSizeId = `${mediaPosition}_${mediaSize}_${media.tagName}`;
        if (globalDownloadedMediaIds.has(positionSizeId)) {
          logToPopup('info', `Bỏ qua media ${mediaIndex + 1}/${targetMedia.length} (đã download - position/size)`);
          continue;
        }

        // CRITICAL: Rate limiting - prevent rapid duplicate download attempts
        const now = Date.now();
        if (now - lastDownloadAttemptTime < MIN_DOWNLOAD_INTERVAL) {
          logToPopup('warning', `Đợi ${Math.round((MIN_DOWNLOAD_INTERVAL - (now - lastDownloadAttemptTime)) / 1000)}s để tránh duplicate download...`);
          await sleep(MIN_DOWNLOAD_INTERVAL - (now - lastDownloadAttemptTime));
        }
        lastDownloadAttemptTime = Date.now();

        // DOUBLE CHECK: Verify video is still valid before downloading
        // Kiểm tra kỹ hơn xem có VIDEO thực sự chưa
        if (currentType === 'video' && media.tagName === 'VIDEO') {
          // Wait longer to ensure video is fully loaded and rendered
          await sleep(1000);

          // Re-check video properties with stricter criteria
          if (media.duration > 0 && media.duration < 1.0) {
            logToPopup('warning', `Video ${mediaIndex + 1} có duration quá ngắn (${media.duration.toFixed(2)}s), có thể là placeholder, bỏ qua`);
            continue;
          }
          if (media.readyState < 3) {
            logToPopup('warning', `Video ${mediaIndex + 1} chưa ready đầy đủ (readyState: ${media.readyState}, cần >= 3), bỏ qua`);
            continue;
          }
          if (media.videoWidth < 200 || media.videoHeight < 200) {
            logToPopup('warning', `Video ${mediaIndex + 1} quá nhỏ (${media.videoWidth}x${media.videoHeight}), có thể là icon, bỏ qua`);
            continue;
          }
          if (!mediaSrc || mediaSrc.length < 20) {
            logToPopup('warning', `Video ${mediaIndex + 1} không có src hợp lệ, bỏ qua`);
            continue;
          }
          if (media.buffered.length === 0) {
            logToPopup('warning', `Video ${mediaIndex + 1} chưa có buffered data, bỏ qua`);
            continue;
          }
          // Final check: video must be actually playable
          if (media.paused && media.currentTime === 0 && media.readyState < 4) {
            logToPopup('warning', `Video ${mediaIndex + 1} chưa load đủ để play, bỏ qua`);
            continue;
          }
          logToPopup('success', `Video ${mediaIndex + 1} đã được verify: duration=${media.duration.toFixed(1)}s, readyState=${media.readyState}, size=${media.videoWidth}x${media.videoHeight}`);
        }

        logToPopup('info', `Đang download media ${mediaIndex + 1}/${targetMedia.length}: ${media.tagName}, size: ${media.offsetWidth}x${media.offsetHeight}`);

        if (isElementVisible(media)) {
          // CRITICAL: For video, click on video element first to "activate" it
          // This might reveal download button or menu
          if (currentType === 'video' && media.tagName === 'VIDEO') {
            logToPopup('info', `Đang click vào video element ${mediaIndex + 1}/${targetMedia.length} để activate...`);
            media.scrollIntoView({ behavior: 'smooth', block: 'center' });
            await sleep(500);

            // Hover over video to reveal controls/download button
            try {
              media.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true, cancelable: true }));
              media.dispatchEvent(new MouseEvent('mouseover', { bubbles: true, cancelable: true }));
              await sleep(800); // Wait for hover effects

              // Click on video to activate it (might show controls or menu)
              media.click();
              await sleep(800);

              // Also try right-click to see if context menu appears
              media.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true }));
              await sleep(500);
            } catch (e) {
              logToPopup('warning', `Lỗi khi click video: ${e.message}`);
            }
          }

          logToPopup('info', `Tìm download button gần media element ${mediaIndex + 1}/${targetMedia.length}...`);

          // Look for download button in parent containers (wider search - up to 15 levels for video)
          const maxLevels = currentType === 'video' ? 15 : 8;
          let container = media.parentElement;
          for (let i = 0; i < maxLevels && container; i++) {
            // Try multiple selectors
            let downloadBtn = null;
            try {
              downloadBtn = container.querySelector(
                'button[aria-label*="download" i], ' +
                'button[aria-label*="tải" i], ' +
                'button[aria-label*="save" i], ' +
                'button[aria-label*="lưu" i], ' +
                'a[download], ' +
                'button[data-testid*="download" i], ' +
                '[class*="download" i][role="button"], ' +
                '[class*="save" i][role="button"], ' +
                'button[title*="download" i], ' +
                'button[title*="tải" i], ' +
                '[aria-label*="download" i][role="button"]'
              );
            } catch (selectorError) {
              logToPopup('warning', `Selector error khi tìm download button: ${selectorError.message}`);
            }

            if (!downloadBtn) {
              const candidateButtons = Array.from(container.querySelectorAll('button, [role="button"]'));
              const lowerText = (el) => (el.textContent || el.getAttribute('aria-label') || el.getAttribute('title') || '').toLowerCase();
              downloadBtn = candidateButtons.find(btn => {
                if (!isElementVisible(btn)) return false;
                const text = lowerText(btn);
                return text.includes('download') || text.includes('tải') || text.includes('save') || text.includes('lưu');
              }) || candidateButtons.find(btn => {
                if (!isElementVisible(btn)) return false;
                const text = lowerText(btn);
                return text.includes('more') || text.includes('thêm') || text.includes('menu') || text.includes('option');
              });
            }

            if (downloadBtn && isElementVisible(downloadBtn)) {
              // CRITICAL: Check if this button has already been clicked
              if (clickedDownloadButtons.has(downloadBtn)) {
                logToPopup('info', 'Download button đã được click trước đó, bỏ qua để tránh duplicate');
                continue;
              }

              // CRITICAL: Check if download has already been triggered for this media
              if (downloadTriggeredForMedia) {
                logToPopup('info', 'Download đã được trigger cho media này, bỏ qua');
                break; // Exit loop since we already triggered download
              }

              // CRITICAL: Rate limiting - prevent rapid button clicks
              const now = Date.now();
              if (now - lastButtonClickTime < MIN_BUTTON_CLICK_INTERVAL) {
                logToPopup('warning', `Đợi ${Math.round((MIN_BUTTON_CLICK_INTERVAL - (now - lastButtonClickTime)) / 1000)}s để tránh click quá nhanh...`);
                await sleep(MIN_BUTTON_CLICK_INTERVAL - (now - lastButtonClickTime));
              }
              lastButtonClickTime = Date.now();

              logToPopup('success', 'Tìm thấy download button gần media!');
              downloadBtn.scrollIntoView({ behavior: 'smooth', block: 'center' });
              await sleep(500);

              // Mark button as clicked BEFORE clicking
              clickedDownloadButtons.add(downloadBtn);

              // Check if this is a "More options" button
              const btnText = (downloadBtn.textContent || downloadBtn.getAttribute('aria-label') || '').toLowerCase();
              const isMoreBtn = btnText.includes('more') || btnText.includes('thêm') || btnText.includes('menu') || btnText.includes('option');

              if (isMoreBtn) {
                logToPopup('info', 'Click "More options" button để tìm nút download...');
                downloadBtn.click();
                await sleep(800);

                // Look for download option in the opened menu
                const menuItems = document.querySelectorAll('[role="menuitem"], [role="option"], li, button, a');
                let downloadOption = null;

                for (const item of menuItems) {
                  if (isElementVisible(item)) {
                    const itemText = (item.textContent || item.getAttribute('aria-label') || '').toLowerCase();
                    if (itemText.includes('download') || itemText.includes('tải') || itemText.includes('save') || itemText.includes('lưu')) {
                      downloadOption = item;
                      break;
                    }
                  }
                }

                if (downloadOption) {
                  logToPopup('success', 'Tìm thấy nút download trong menu!');
                  downloadOption.click();

                  // If video, wait for resolution menu
                  if (currentType === 'video') {
                    await sleep(800);
                    const resolutionSelected = await selectVideoResolutionFromDownloadMenu();
                    if (resolutionSelected) {
                      logToPopup('success', `Đã chọn resolution và trigger download`);
                      downloadTriggeredForMedia = true;
                      await sleep(2000);
                      retryCount = maxRetries;
                      break;
                    }
                  } else {
                    // Image
                    downloadTriggeredForMedia = true;
                    await sleep(2000);
                    retryCount = maxRetries;
                    break;
                  }
                } else {
                  logToPopup('warning', 'Không tìm thấy nút download trong menu, thử button khác...');
                  // Close menu by pressing Escape key (more reliable than clicking body)
                  try {
                    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', code: 'Escape', keyCode: 27, bubbles: true }));
                    document.dispatchEvent(new KeyboardEvent('keyup', { key: 'Escape', code: 'Escape', keyCode: 27, bubbles: true }));
                    await sleep(300);
                  } catch (e) {
                    // Fallback to clicking body
                    document.body.click();
                  }
                  continue; // Try next button
                }
              }

              // For video, click download button to open resolution menu, then select 720p
              if (currentType === 'video') {
                logToPopup('info', 'Click download button để mở resolution menu...');
                downloadBtn.click();
                await sleep(500);

                // CRITICAL: Mark as downloading BEFORE clicking to prevent duplicate clicks
                // Track by multiple identifiers for better duplicate prevention
                downloadedMediaSrcs.add(mediaUniqueId);
                downloadedMediaElements.add(mediaUniqueId); // Track this media element
                globalDownloadedMediaIds.add(mediaUniqueId);
                globalDownloadedMediaSrcs.add(mediaUniqueId);
                if (mediaSrc && mediaSrc.length > 20) {
                  downloadedMediaSrcs.add(mediaSrc);
                  globalDownloadedMediaSrcs.add(mediaSrc);
                }
                // Also track by position + size
                const positionSizeId = `${mediaPosition}_${mediaSize}_${media.tagName}`;
                globalDownloadedMediaIds.add(positionSizeId);

                // Now select 720p from the opened menu
                const resolutionSelected = await selectVideoResolutionFromDownloadMenu();
                if (resolutionSelected) {
                  logToPopup('success', `Đã chọn resolution 720p và download đã được trigger cho media ${mediaIndex + 1}/${targetMedia.length}`);
                  downloadTriggeredForMedia = true; // Mark as triggered
                  await sleep(2000);
                  // Exit retry loop since download was successful
                  retryCount = maxRetries;
                  break; // Break out of media loop
                } else {
                  logToPopup('warning', 'Không tìm thấy resolution menu, có thể download đã được trigger với resolution mặc định');
                  downloadTriggeredForMedia = true; // Still mark as triggered (might have downloaded)
                  await sleep(2000);
                  // Exit retry loop
                  retryCount = maxRetries;
                  break; // Break out of media loop
                }
              } else {
                // For image, just click download button
                // CRITICAL: Mark as downloading BEFORE clicking to prevent duplicate clicks
                // Track by multiple identifiers for better duplicate prevention
                downloadedMediaSrcs.add(mediaUniqueId);
                downloadedMediaElements.add(mediaUniqueId); // Track this media element
                globalDownloadedMediaIds.add(mediaUniqueId);
                globalDownloadedMediaSrcs.add(mediaUniqueId);
                if (mediaSrc && mediaSrc.length > 20) {
                  downloadedMediaSrcs.add(mediaSrc);
                  globalDownloadedMediaSrcs.add(mediaSrc);
                }
                // Also track by position + size
                const positionSizeId = `${mediaPosition}_${mediaSize}_${media.tagName}`;
                globalDownloadedMediaIds.add(positionSizeId);

                downloadBtn.click();
                downloadTriggeredForMedia = true; // Mark as triggered
                logToPopup('success', `Đã click download button cho media ${mediaIndex + 1}/${targetMedia.length}`);
                await sleep(2000);
                logToPopup('info', 'Đã click download button, file sẽ được tải về trong thư mục Downloads');
                // Exit retry loop since download was successful
                retryCount = maxRetries;
                break; // Break out of media loop
              }
            }
            container = container.parentElement;
          }

          // Also try to find download button by looking for icons (SVG)
          // For video, search more aggressively
          const maxIconSearchLevels = currentType === 'video' ? 15 : 8;
          container = media.parentElement;
          for (let i = 0; i < maxIconSearchLevels && container; i++) {
            const buttons = container.querySelectorAll('button, a, [role="button"]');
            logToPopup('info', `Tìm kiếm trong container level ${i + 1}, tìm thấy ${buttons.length} buttons...`);

            for (const btn of buttons) {
              if (isElementVisible(btn)) {
                // Check if button has download icon
                const hasDownloadIcon = btn.querySelector('svg[class*="download" i], svg[class*="arrow_down" i], svg[class*="save" i], svg[class*="file" i]');
                const text = (btn.textContent || btn.getAttribute('aria-label') || btn.getAttribute('title') || '').toLowerCase();
                const hasDownloadText = text.includes('download') || text.includes('tải') || text.includes('save') || text.includes('lưu') || text.includes('export');

                // Skip unwanted buttons
                if (text.includes('veo') || text.includes('model') || text.includes('settings') ||
                  text.includes('dropdown') || text === 'videos' || text === 'images') {
                  continue;
                }

                if (hasDownloadIcon || hasDownloadText) {
                  // CRITICAL: Check if this button has already been clicked
                  if (clickedDownloadButtons.has(btn)) {
                    logToPopup('info', 'Download button đã được click trước đó, bỏ qua');
                    continue;
                  }

                  // CRITICAL: Check if download has already been triggered
                  if (downloadTriggeredForMedia) {
                    logToPopup('info', 'Download đã được trigger, bỏ qua button này');
                    break; // Exit button search loop
                  }

                  // CRITICAL: Rate limiting - prevent rapid button clicks
                  const now = Date.now();
                  if (now - lastButtonClickTime < MIN_BUTTON_CLICK_INTERVAL) {
                    logToPopup('warning', `Đợi ${Math.round((MIN_BUTTON_CLICK_INTERVAL - (now - lastButtonClickTime)) / 1000)}s để tránh click quá nhanh...`);
                    await sleep(MIN_BUTTON_CLICK_INTERVAL - (now - lastButtonClickTime));
                  }
                  lastButtonClickTime = Date.now();

                  logToPopup('success', `Tìm thấy download button (có icon hoặc text)! Text: "${text.substring(0, 50)}"`);
                  btn.scrollIntoView({ behavior: 'smooth', block: 'center' });
                  await sleep(500);

                  // Mark button as clicked BEFORE clicking
                  clickedDownloadButtons.add(btn);

                  // For video, click to open menu, then select 720p
                  if (currentType === 'video') {
                    logToPopup('info', 'Click download button để mở resolution menu...');
                    btn.click();
                    await sleep(500);

                    // CRITICAL: Mark as downloading BEFORE clicking to prevent duplicate clicks
                    // Track by multiple identifiers for better duplicate prevention
                    downloadedMediaSrcs.add(mediaUniqueId);
                    globalDownloadedMediaIds.add(mediaUniqueId);
                    globalDownloadedMediaSrcs.add(mediaUniqueId);
                    if (mediaSrc && mediaSrc.length > 20) {
                      downloadedMediaSrcs.add(mediaSrc);
                      globalDownloadedMediaSrcs.add(mediaSrc);
                    }
                    // Also track by position + size
                    const positionSizeId = `${mediaPosition}_${mediaSize}_${media.tagName}`;
                    globalDownloadedMediaIds.add(positionSizeId);

                    // Select 720p from menu
                    const resolutionSelected = await selectVideoResolutionFromDownloadMenu();
                    if (resolutionSelected) {
                      logToPopup('success', `Đã chọn resolution 720p và download đã được trigger cho media ${mediaIndex + 1}/${targetMedia.length}`);
                      downloadTriggeredForMedia = true;
                      await sleep(2000);
                      // Exit retry loop
                      retryCount = maxRetries;
                      break; // Break out of button search loop
                    } else {
                      logToPopup('warning', 'Không tìm thấy resolution menu, có thể đã download');
                      downloadTriggeredForMedia = true; // Still mark as triggered
                      await sleep(2000);
                      // Exit retry loop
                      retryCount = maxRetries;
                      break;
                    }
                  } else {
                    // For image, just click
                    // CRITICAL: Mark as downloading BEFORE clicking to prevent duplicate clicks
                    // Track by multiple identifiers for better duplicate prevention
                    downloadedMediaSrcs.add(mediaUniqueId);
                    globalDownloadedMediaIds.add(mediaUniqueId);
                    globalDownloadedMediaSrcs.add(mediaUniqueId);
                    if (mediaSrc && mediaSrc.length > 20) {
                      downloadedMediaSrcs.add(mediaSrc);
                      globalDownloadedMediaSrcs.add(mediaSrc);
                    }
                    // Also track by position + size
                    const positionSizeId = `${mediaPosition}_${mediaSize}_${media.tagName}`;
                    globalDownloadedMediaIds.add(positionSizeId);

                    btn.click();
                    btn.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));
                    btn.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, cancelable: true }));
                    btn.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
                    downloadTriggeredForMedia = true; // Mark as triggered

                    logToPopup('success', `Đã click download button cho media ${mediaIndex + 1}/${targetMedia.length}`);
                    await sleep(2000);
                    logToPopup('info', 'Đã click download button, file sẽ được tải về trong thư mục Downloads');
                    // Exit retry loop
                    retryCount = maxRetries;
                    break; // Break out of button search loop
                  }
                }
              }
            }
            container = container.parentElement;
          }

          // For video, also try to find buttons by position (near video)
          if (currentType === 'video' && media.tagName === 'VIDEO') {
            logToPopup('info', `Đang tìm download button bằng vị trí (gần video ${mediaIndex + 1}/${targetMedia.length})...`);
            const videoRect = media.getBoundingClientRect();
            const allButtons = document.querySelectorAll('button, a, [role="button"]');

            for (const btn of allButtons) {
              if (isElementVisible(btn)) {
                const btnRect = btn.getBoundingClientRect();
                const text = (btn.textContent || btn.getAttribute('aria-label') || '').toLowerCase();

                // Skip unwanted buttons
                if (text.includes('veo') || text.includes('model') || text.includes('settings') ||
                  text.includes('dropdown') || text === 'videos' || text === 'images') {
                  continue;
                }

                // Check if button is near video (within 400px)
                const distance = Math.sqrt(
                  Math.pow(btnRect.left - videoRect.right, 2) +
                  Math.pow(btnRect.top - videoRect.bottom, 2)
                );

                if (distance < 400) {
                  // Check if it might be a download button (has icon or download-related text)
                  const hasDownloadIcon = btn.querySelector('svg');
                  const hasDownloadText = text.includes('download') || text.includes('tải') ||
                    text.includes('save') || text.includes('lưu') ||
                    text.length === 0; // Empty text might be icon button

                  if (hasDownloadIcon || hasDownloadText) {
                    // CRITICAL: Check if this button has already been clicked
                    if (clickedDownloadButtons.has(btn)) {
                      logToPopup('info', 'Download button đã được click trước đó, bỏ qua');
                      continue;
                    }

                    // CRITICAL: Check if download has already been triggered
                    if (downloadTriggeredForMedia) {
                      logToPopup('info', 'Download đã được trigger, bỏ qua button này');
                      break; // Exit button search loop
                    }

                    // CRITICAL: Rate limiting - prevent rapid button clicks
                    const now = Date.now();
                    if (now - lastButtonClickTime < MIN_BUTTON_CLICK_INTERVAL) {
                      logToPopup('warning', `Đợi ${Math.round((MIN_BUTTON_CLICK_INTERVAL - (now - lastButtonClickTime)) / 1000)}s để tránh click quá nhanh...`);
                      await sleep(MIN_BUTTON_CLICK_INTERVAL - (now - lastButtonClickTime));
                    }
                    lastButtonClickTime = Date.now();

                    // CRITICAL: Mark as downloading BEFORE clicking to prevent duplicate clicks
                    // Track by multiple identifiers for better duplicate prevention
                    downloadedMediaSrcs.add(mediaUniqueId);
                    globalDownloadedMediaIds.add(mediaUniqueId);
                    globalDownloadedMediaSrcs.add(mediaUniqueId);
                    if (mediaSrc && mediaSrc.length > 20) {
                      downloadedMediaSrcs.add(mediaSrc);
                      globalDownloadedMediaSrcs.add(mediaSrc);
                    }
                    // Also track by position + size
                    const positionSizeId = `${mediaPosition}_${mediaSize}_${media.tagName}`;
                    globalDownloadedMediaIds.add(positionSizeId);

                    // Mark button as clicked BEFORE clicking
                    clickedDownloadButtons.add(btn);

                    logToPopup('success', `Tìm thấy button gần video (distance: ${Math.round(distance)}px) cho media ${mediaIndex + 1}/${targetMedia.length}`);
                    btn.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    await sleep(500);
                    btn.click();
                    downloadTriggeredForMedia = true; // Mark as triggered
                    await sleep(4000);
                    logToPopup('info', 'Đã click button gần video, file sẽ được tải về');
                    // Exit retry loop
                    retryCount = maxRetries;
                    break; // Break out of button search loop
                  }
                }
              }
            }
          }

          // If we couldn't download this media, log it but continue to next
          if (!downloadedMediaSrcs.has(mediaUniqueId) && (!mediaSrc || !downloadedMediaSrcs.has(mediaSrc))) {
            logToPopup('warning', `Không tìm thấy download button cho media ${mediaIndex + 1}/${targetMedia.length}, sẽ thử các strategies khác sau...`);
          }
        } // Close if (isElementVisible(media))
      }

      // If download was triggered, exit retry loop
      if (downloadTriggeredForMedia) {
        logToPopup('success', `Đã trigger download thành công cho media`);
        retryCount = maxRetries; // Exit retry loop
        break; // Exit while loop
      }

      // If we downloaded all media, return success; otherwise continue with fallbacks
      if (downloadedMediaSrcs.size >= targetMedia.length && targetMedia.length > 0) {
        logToPopup('success', `Đã trigger download cho ${downloadedMediaSrcs.size}/${targetMedia.length} media mới`);
        retryCount = maxRetries; // Exit retry loop
        break; // Exit while loop
      } else if (downloadedMediaSrcs.size > 0) {
        logToPopup('warning', `Mới download được ${downloadedMediaSrcs.size}/${targetMedia.length} media. Tiếp tục tìm các media còn lại...`);
        // Continue to next retry if we haven't found all media
        retryCount++;
      } else {
        // No media downloaded, retry
        retryCount++;
      }
    } else {
      // No media found, retry
      retryCount++;
    }
  } // Close while (retryCount < maxRetries)

  // If we've exhausted retries and still have media, log warning
  if (retryCount >= maxRetries && downloadedMediaSrcs.size === 0) {
    logToPopup('warning', `Đã thử ${maxRetries} lần nhưng không tìm thấy video/image để download. Có thể media chưa render xong hoặc không có media mới được tạo.`);
    // Log thêm thông tin để debug
    const allMedia = document.querySelectorAll('video, img');
    logToPopup('info', `Tổng số media trên trang: ${allMedia.length} (có thể bao gồm icons/placeholders)`);
  }

  // If we downloaded some media or download was triggered, return (don't continue to fallback strategies)
  if (downloadedMediaSrcs.size > 0 || downloadTriggeredForMedia) {
    return;
  }

  // Strategy 1: Try to find and click download button (general search)
  // Expanded selectors to catch more variations
  const downloadSelectors = [
    'button[aria-label*="download" i]',
    'button[aria-label*="tải" i]',
    'button[aria-label*="save" i]',
    'button[aria-label*="lưu" i]',
    'button[aria-label*="export" i]',
    'button[aria-label*="xuất" i]',
    'a[download]',
    'a[href*="download" i]',
    'button[data-testid*="download" i]',
    '[class*="download" i][role="button"]',
    '[class*="save" i][role="button"]',
    'button[title*="download" i]',
    'button[title*="tải" i]',
    '[aria-label*="download" i][role="button"]',
    // Also try buttons with download icons
    'button:has(svg[class*="download" i])',
    'button:has(svg[class*="arrow_down" i])'
  ];

  for (const selector of downloadSelectors) {
    try {
      const elements = document.querySelectorAll(selector);
      for (const el of elements) {
        if (isElementVisible(el)) {
          // CRITICAL: Check if this button has already been clicked
          if (clickedDownloadButtons.has(el)) {
            continue;
          }

          // CRITICAL: Check if download has already been triggered
          if (downloadTriggeredForMedia) {
            return;
          }

          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          await sleep(300);

          // Mark button as clicked BEFORE clicking
          clickedDownloadButtons.add(el);

          // For video, click to open menu, then select 720p
          if (currentType === 'video') {
            logToPopup('info', 'Click download button để mở resolution menu...');
            el.click();
            await sleep(500);

            // Select 720p from menu
            const resolutionSelected = await selectVideoResolutionFromDownloadMenu();
            if (resolutionSelected) {
              logToPopup('success', 'Đã chọn resolution 720p và download đã được trigger');
              downloadTriggeredForMedia = true;
              await sleep(2000);
              return;
            } else {
              logToPopup('warning', 'Không tìm thấy resolution menu, có thể đã download');
              downloadTriggeredForMedia = true; // Still mark as triggered
              await sleep(2000);
              return;
            }
          } else {
            // For image, just click
            el.click();
            downloadTriggeredForMedia = true; // Mark as triggered
            logToPopup('success', 'Đã click nút tải về');
            await sleep(2000);
            logToPopup('info', 'Đã click download button, file sẽ được tải về trong thư mục Downloads');
            return;
          }
        }
      }
    } catch (e) {
      // Continue
    }
  }

  // Strategy 2: Use Chrome Downloads API directly
  // NOTE: For VIDEO, this should be LAST resort - video URLs are often streaming URLs
  // For IMAGE, this is more reliable
  // Find the most recent media element (newly created)
  // IMPORTANT: Filter out banner/background videos and OLD media

  // For video, try multiple times to find download button before using API
  if (currentType === 'video') {
    logToPopup('warning', 'Chưa tìm thấy download button, đang tìm lại với nhiều strategies...');

    // Retry multiple times with delays
    for (let retry = 0; retry < 3; retry++) {
      await sleep(1500); // Wait between retries
      logToPopup('info', `Retry tìm download button lần ${retry + 1}/3...`);

      // Strategy A: Find all buttons and check if any are download buttons
      const allButtons = document.querySelectorAll('button, a, [role="button"]');
      logToPopup('info', `Tìm thấy ${allButtons.length} buttons trên trang, đang kiểm tra...`);

      const videos = document.querySelectorAll('video');
      if (videos.length > 0) {
        const lastVideo = videos[videos.length - 1];
        const videoRect = lastVideo.getBoundingClientRect();

        for (const btn of allButtons) {
          if (isElementVisible(btn)) {
            const text = (btn.textContent || btn.getAttribute('aria-label') || btn.getAttribute('title') || '').toLowerCase();
            const btnRect = btn.getBoundingClientRect();

            // Skip unwanted buttons
            if (text.includes('veo') || text.includes('model') || text.includes('settings') ||
              text.includes('dropdown') || text === 'videos' || text === 'images' ||
              text.includes('create') || text.includes('tạo')) {
              continue;
            }

            // Check if button is near video
            const distance = Math.sqrt(
              Math.pow(btnRect.left - videoRect.right, 2) +
              Math.pow(btnRect.top - videoRect.bottom, 2)
            );

            // Check if it's a download button
            const hasDownloadText = text.includes('download') || text.includes('tải') ||
              text.includes('save') || text.includes('lưu') ||
              text.includes('export') || text.includes('xuất');
            const hasDownloadIcon = btn.querySelector('svg[class*="download" i], svg[class*="arrow_down" i], svg[class*="save" i], svg[class*="file" i]');

            if ((hasDownloadText || hasDownloadIcon || text.length === 0) && distance < 600) {
              // CRITICAL: Check if this button has already been clicked
              if (clickedDownloadButtons.has(btn)) {
                continue;
              }

              // CRITICAL: Check if download has already been triggered
              if (downloadTriggeredForMedia) {
                return;
              }

              logToPopup('success', `Tìm thấy download button (retry ${retry + 1}): distance=${Math.round(distance)}px, text="${text.substring(0, 30)}"`);
              btn.scrollIntoView({ behavior: 'smooth', block: 'center' });
              await sleep(500);

              // Mark button as clicked BEFORE clicking
              clickedDownloadButtons.add(btn);

              // For video, click to open menu, then select 720p
              if (currentType === 'video') {
                logToPopup('info', 'Click download button để mở resolution menu...');
                btn.click();
                await sleep(500);

                // Select 720p from menu
                const resolutionSelected = await selectVideoResolutionFromDownloadMenu();
                if (resolutionSelected) {
                  logToPopup('success', 'Đã chọn resolution 720p và download đã được trigger');
                  downloadTriggeredForMedia = true;
                  await sleep(2000);
                  return;
                } else {
                  logToPopup('warning', 'Không tìm thấy resolution menu, có thể đã download');
                  downloadTriggeredForMedia = true; // Still mark as triggered
                  await sleep(2000);
                  return;
                }
              } else {
                // For image, just click
                btn.click();
                btn.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));
                btn.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, cancelable: true }));
                btn.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
                downloadTriggeredForMedia = true; // Mark as triggered

                await sleep(2000);
                logToPopup('info', 'Đã click download button, file sẽ được tải về');
                return;
              }
            }
          }
        }
      }

      // Strategy B: Look for buttons with download-related classes
      const downloadClassButtons = document.querySelectorAll('[class*="download" i], [class*="save" i], [class*="export" i]');
      logToPopup('info', `Tìm thấy ${downloadClassButtons.length} buttons có class download/save/export...`);

      for (const btn of downloadClassButtons) {
        if (isElementVisible(btn) && (btn.tagName === 'BUTTON' || btn.tagName === 'A' || btn.getAttribute('role') === 'button')) {
          const text = (btn.textContent || btn.getAttribute('aria-label') || '').toLowerCase();

          if (!text.includes('veo') && !text.includes('model') && !text.includes('settings')) {
            logToPopup('success', `Tìm thấy button với class download: "${text.substring(0, 50)}"`);
            btn.scrollIntoView({ behavior: 'smooth', block: 'center' });
            await sleep(500);

            // For video, click to open menu, then select 720p
            if (currentType === 'video') {
              logToPopup('info', 'Click download button để mở resolution menu...');
              btn.click();
              await sleep(500);

              // Select 720p from menu
              const resolutionSelected = await selectVideoResolutionFromDownloadMenu();
              if (resolutionSelected) {
                logToPopup('success', 'Đã chọn resolution 720p và download đã được trigger');
                await sleep(2000);
                return;
              } else {
                logToPopup('warning', 'Không tìm thấy resolution menu');
                await sleep(2000);
                return;
              }
            } else {
              // For image, just click
              btn.click();
              await sleep(2000);
              logToPopup('info', 'Đã click button, file sẽ được tải về');
              return;
            }
          }
        }
      }
    }

    logToPopup('error', 'Không tìm thấy download button cho video sau nhiều lần thử');
    logToPopup('warning', 'Video có thể cần tải thủ công từ website');
  }

  const allMediaElements = Array.from(document.querySelectorAll('video, img, canvas, [class*="preview" i], [class*="result" i], [class*="output" i]'));

  // Filter out banner/background videos and images, and OLD media
  const mediaElements = allMediaElements.filter(media => {
    if (!isElementVisible(media)) return false;

    const src = media.src || media.currentSrc || media.getAttribute('src') || '';
    const srcLower = src.toLowerCase();

    // Skip banner/background media
    if (srcLower.includes('banner') ||
      srcLower.includes('background') ||
      srcLower.includes('flow31_bg') ||
      srcLower.includes('header') ||
      srcLower.includes('nav')) {
      return false;
    }

    // CRITICAL: Only accept NEW media (not in initialMediaSrcs)
    if (src && src.length > 20 && initialMediaSrcs.has(src)) {
      return false; // This is old media, skip it
    }

    // For video, check if it's in a project container (not banner)
    if (media.tagName === 'VIDEO') {
      // Check if video is in a project-related container
      let parent = media.parentElement;
      let isInProject = false;
      for (let i = 0; i < 10 && parent; i++) {
        const className = parent.className || '';
        const id = parent.id || '';
        if (className.toLowerCase().includes('project') ||
          className.toLowerCase().includes('result') ||
          className.toLowerCase().includes('output') ||
          className.toLowerCase().includes('media') ||
          className.toLowerCase().includes('video') ||
          id.toLowerCase().includes('project') ||
          id.toLowerCase().includes('result')) {
          isInProject = true;
          break;
        }
        parent = parent.parentElement;
      }

      // If video is very small (likely banner), skip it
      if (media.offsetWidth < 500 && media.offsetHeight < 300) {
        return false;
      }

      // Must be real video (has duration or readyState)
      return (isInProject || media.offsetWidth > 500) && (media.duration > 0.5 || media.readyState >= 2);
    } else if (media.tagName === 'IMG') {
      // For images, must be real image (not icon)
      return media.naturalWidth > 200 && media.naturalHeight > 200;
    } else {
      // For other elements, must be large enough
      return media.offsetWidth > 300 && media.offsetHeight > 300;
    }
  });

  // Sort by position in DOM (newer elements are usually later)
  mediaElements.sort((a, b) => {
    const aPos = Array.from(document.querySelectorAll('*')).indexOf(a);
    const bPos = Array.from(document.querySelectorAll('*')).indexOf(b);
    return bPos - aPos; // Newer elements first
  });

  logToPopup('info', `Tìm thấy ${mediaElements.length} media elements (sau khi filter banner)`);

  for (const media of mediaElements) {
    if (isElementVisible(media)) {
      // Check if it's a real media (not icon)
      const isRealMedia = (media.tagName === 'IMG' && media.naturalWidth > 200) ||
        (media.tagName === 'VIDEO' && (media.duration > 0.5 || media.readyState >= 2)) ||
        (media.offsetWidth > 300 && media.offsetHeight > 300);

      if (isRealMedia) {
        try {
          // Try to get download URL from media element (multiple sources)
          let downloadUrl = null;
          let downloadType = currentType;

          if (media.tagName === 'VIDEO') {
            // For video, try multiple sources
            downloadUrl = media.src ||
              media.currentSrc ||
              media.getAttribute('src') ||
              (media.querySelector('source') && media.querySelector('source').src);

            // If still no URL, try to get from video element's data
            if (!downloadUrl || downloadUrl === '') {
              // Try to get blob URL
              if (media.src && media.src.startsWith('blob:')) {
                downloadUrl = media.src;
                logToPopup('info', 'Tìm thấy blob URL, đang xử lý...');
              }
            }

            // If video has source element, try that
            if (!downloadUrl || downloadUrl === '') {
              const sourceElement = media.querySelector('source');
              if (sourceElement) {
                downloadUrl = sourceElement.src || sourceElement.getAttribute('src');
              }
            }

            downloadType = 'video';
          } else if (media.tagName === 'IMG') {
            downloadUrl = media.src ||
              media.currentSrc ||
              media.getAttribute('src') ||
              media.getAttribute('data-src');
            downloadType = 'image';
          }

          // Log what we found
          logToPopup('info', `Tìm thấy ${downloadType}: ${downloadUrl ? downloadUrl.substring(0, 80) : 'no URL'}...`);
          logToPopup('info', `Media element: ${media.tagName}, size: ${media.offsetWidth}x${media.offsetHeight}, visible: ${isElementVisible(media)}`);

          if (downloadUrl && downloadUrl.length > 10) {
            // CRITICAL: For video, prefer download button over direct URL download
            // Video URLs are often streaming URLs, not actual download URLs
            if (currentType === 'video' && !downloadUrl.startsWith('blob:')) {
              logToPopup('warning', 'Video URL tìm thấy có thể là streaming URL, không phải download URL');
              logToPopup('info', 'Đang tìm download button một lần nữa...');

              // Try to find download button near this video
              let parent = media.parentElement;
              for (let i = 0; i < 10 && parent; i++) {
                const downloadBtn = parent.querySelector('button[aria-label*="download" i], button[aria-label*="tải" i], a[download]');
                if (downloadBtn && isElementVisible(downloadBtn)) {
                  logToPopup('success', 'Tìm thấy download button! Sử dụng button thay vì URL trực tiếp');
                  downloadBtn.scrollIntoView({ behavior: 'smooth', block: 'center' });
                  await sleep(500);
                  downloadBtn.click();
                  await sleep(3000);
                  logToPopup('info', 'Đã click download button, file sẽ được tải về');
                  return;
                }
                parent = parent.parentElement;
              }

              logToPopup('warning', 'Không tìm thấy download button, sẽ thử download từ URL (có thể không hoạt động)');
            }

            // Handle blob URLs - need to convert to downloadable format
            if (downloadUrl.startsWith('blob:')) {
              logToPopup('info', 'Phát hiện blob URL, đang tìm cách download...');
              // Blob URLs can't be downloaded directly via Chrome API
              // Try to find download button on the page instead
              // Or try to fetch and convert blob
              try {
                // First, try to find download button near this video element
                let downloadBtn = null;
                let parent = media.parentElement;
                for (let i = 0; i < 5 && parent; i++) {
                  const btn = parent.querySelector('button[aria-label*="download" i], button[aria-label*="tải" i], a[download]');
                  if (btn && isElementVisible(btn)) {
                    downloadBtn = btn;
                    break;
                  }
                  parent = parent.parentElement;
                }

                if (downloadBtn) {
                  logToPopup('info', 'Tìm thấy download button, đang click...');
                  downloadBtn.scrollIntoView({ behavior: 'smooth', block: 'center' });
                  await sleep(500);
                  downloadBtn.click();
                  logToPopup('success', 'Đã click download button');
                  await sleep(2000);
                  return;
                }

                // If no button, try to fetch blob and create download link
                logToPopup('info', 'Không tìm thấy button, thử fetch blob...');
                const response = await fetch(downloadUrl);
                const blob = await response.blob();
                const blobUrl = URL.createObjectURL(blob);

                // Create temporary download link
                const link = document.createElement('a');
                link.href = blobUrl;
                link.download = `flow_${downloadType}_${Date.now()}.${downloadType === 'video' ? 'mp4' : 'png'}`;
                link.style.display = 'none';
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                URL.revokeObjectURL(blobUrl);

                logToPopup('success', 'Đã tạo download link từ blob');
                await sleep(2000);
                return;
              } catch (blobError) {
                logToPopup('warning', `Blob error: ${blobError.message}, thử tìm download button...`);
                // Continue to try other methods below
              }
            }

            // For HTTP/HTTPS URLs, use Chrome Downloads API
            // CRITICAL: For video, DO NOT use Chrome API with video.src - it's usually a streaming URL
            if (downloadUrl.startsWith('http://') || downloadUrl.startsWith('https://')) {
              if (currentType === 'video') {
                logToPopup('warning', 'Video URL tìm thấy có thể là streaming URL, nhưng sẽ thử download vì không tìm thấy button');
                // We used to block this, but as a fallback, we should try it
                // logToPopup('error', 'Video URL tìm thấy là streaming URL, không thể download trực tiếp');
                // return; 
              }

              logToPopup('info', `Đang tải về qua Chrome Downloads API... URL: ${downloadUrl.substring(0, 100)}`);
              try {
                const filename = `flow_${downloadType}_${Date.now()}.${downloadType === 'video' ? 'mp4' : 'png'}`;
                logToPopup('info', `Filename: ${filename}`);

                chrome.runtime.sendMessage({
                  action: 'downloadMedia',
                  url: downloadUrl,
                  filename: filename,
                  promptIndex: currentPrompt ? currentPrompt.substring(0, 30) : 'unknown'
                }, (response) => {
                  if (chrome.runtime.lastError) {
                    logToPopup('error', `Chrome API error: ${chrome.runtime.lastError.message}`);

                    if (downloadType !== 'video') {
                      logToPopup('info', 'Thử fallback direct download...');
                      fallbackDirectDownload(downloadUrl, downloadType);
                    } else {
                      logToPopup('warning', 'Video download failed via API. Skipping direct download fallback to avoid opening in new tab.');
                    }
                  } else if (response && response.success) {
                    logToPopup('success', `✓ Đã bắt đầu download ${downloadType} qua Chrome API: ${filename}`);
                  } else {
                    logToPopup('warning', 'Không nhận được response từ background.');

                    if (downloadType !== 'video') {
                      logToPopup('info', 'Thử fallback direct download...');
                      fallbackDirectDownload(downloadUrl, downloadType);
                    } else {
                      logToPopup('warning', 'Skipping direct download fallback for video.');
                    }
                  }
                });

                // Wait a bit to see if download started
                await sleep(2000);
                logToPopup('info', 'Đã gửi download request, kiểm tra thư mục Downloads...');
                return; // Exit after trying Chrome API
              } catch (apiError) {
                logToPopup('error', `API error: ${apiError.message}`);

                if (downloadType !== 'video') {
                  logToPopup('info', 'Thử fallback direct download...');
                  fallbackDirectDownload(downloadUrl, downloadType);
                } else {
                  logToPopup('warning', 'Skipping direct download fallback for video to avoid opening in new tab.');
                }

                await sleep(2000);
                return;
              }
            } else {
              // For other URLs (data:, etc.), try direct download
              logToPopup('info', 'URL không phải HTTP, thử direct download...');
              fallbackDirectDownload(downloadUrl, downloadType);
              await sleep(2000);
              return;
            }
          } else {
            logToPopup('warning', `Không tìm thấy URL từ ${media.tagName} element`);
          }

          // Try right-click context menu (if browser allows)
          try {
            media.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true }));
            await sleep(500);
            // Look for download option in context menu
            const downloadOption = document.querySelector('[role="menuitem"][aria-label*="download" i], [role="menuitem"][aria-label*="tải" i]');
            if (downloadOption) {
              downloadOption.click();
              logToPopup('success', 'Đã click download từ context menu');
              await sleep(2000);
              return;
            }
          } catch (e) {
            // Context menu might not be available
          }
        } catch (e) {
          logToPopup('warning', `Không thể download từ media: ${e.message}`);
        }
      }
    }
  }

  // Strategy 3: Search all buttons by text content
  const allButtons = document.querySelectorAll('button, a, [role="button"]');
  const downloadTerms = ['download', 'tải', 'save', 'lưu', 'export', 'xuất'];

  for (const btn of allButtons) {
    if (isElementVisible(btn)) {
      const text = btn.textContent.toLowerCase();
      const ariaLabel = (btn.getAttribute('aria-label') || '').toLowerCase();
      const combinedText = text + ' ' + ariaLabel;

      if (downloadTerms.some(term => combinedText.includes(term))) {
        btn.scrollIntoView({ behavior: 'smooth', block: 'center' });
        await sleep(300);
        btn.click();
        logToPopup('success', 'Đã click nút tải về (tìm thấy bằng text)');
        await sleep(2000);
        return;
      }
    }
  }

  // Strategy 4: Try to find download icon/button near media
  if (mediaElements.length > 0) {
    for (const media of mediaElements) {
      if (isElementVisible(media) && (media.naturalWidth > 200 || media.offsetWidth > 300)) {
        const mediaRect = media.getBoundingClientRect();

        // Look for buttons/icons near the media (multiple positions)
        const positions = [
          { x: mediaRect.right - 30, y: mediaRect.top + 30 }, // Top right
          { x: mediaRect.right - 30, y: mediaRect.bottom - 30 }, // Bottom right
          { x: mediaRect.left + 30, y: mediaRect.top + 30 }, // Top left
          { x: mediaRect.left + 30, y: mediaRect.bottom - 30 } // Bottom left
        ];

        for (const pos of positions) {
          try {
            const nearbyElements = document.elementsFromPoint(pos.x, pos.y);
            for (const el of nearbyElements) {
              if (el.tagName === 'BUTTON' || el.getAttribute('role') === 'button' || el.tagName === 'A') {
                const text = (el.textContent || el.getAttribute('aria-label') || '').toLowerCase();
                const hasDownloadIcon = el.querySelector('svg[class*="download" i], svg[class*="save" i], svg[class*="arrow_down" i]');

                if (downloadTerms.some(term => text.includes(term)) || hasDownloadIcon) {
                  el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                  await sleep(300);
                  el.click();
                  logToPopup('success', 'Đã click button gần media element');
                  await sleep(2000);
                  return;
                }
              }
            }
          } catch (e) {
            // Continue to next position
          }
        }
      }
    }
  }

  // Strategy 5: Try to find download button in parent container of media
  if (mediaElements.length > 0) {
    for (const media of mediaElements) {
      if (isElementVisible(media) && (media.naturalWidth > 200 || media.offsetWidth > 300)) {
        let container = media.parentElement;
        for (let i = 0; i < 5 && container; i++) {
          const downloadBtn = container.querySelector('button, a, [role="button"]');
          if (downloadBtn && isElementVisible(downloadBtn)) {
            const text = (downloadBtn.textContent || downloadBtn.getAttribute('aria-label') || '').toLowerCase();
            if (downloadTerms.some(term => text.includes(term))) {
              downloadBtn.scrollIntoView({ behavior: 'smooth', block: 'center' });
              await sleep(300);
              downloadBtn.click();
              logToPopup('success', 'Đã click download button trong container');
              await sleep(2000);
              return;
            }
          }
          container = container.parentElement;
        }
      }
    }
  }

  // Strategy 6: Final Desperate Fallback - Find ANY media URL and try to download it directly
  logToPopup('warning', 'Không tìm thấy button nào, thử fallback download trực tiếp từ URL...');

  if (mediaElements.length > 0) {
    // Sort by newest first
    mediaElements.sort((a, b) => {
      const aPos = Array.from(document.querySelectorAll('*')).indexOf(a);
      const bPos = Array.from(document.querySelectorAll('*')).indexOf(b);
      return bPos - aPos;
    });

    for (const media of mediaElements) {
      if (isElementVisible(media)) {
        let downloadUrl = null;
        let downloadType = currentType;

        if (media.tagName === 'VIDEO') {
          downloadUrl = media.src || media.currentSrc || media.getAttribute('src') || (media.querySelector('source') && media.querySelector('source').src);
          downloadType = 'video';
        } else if (media.tagName === 'IMG') {
          downloadUrl = media.src || media.currentSrc || media.getAttribute('src');
          downloadType = 'image';
        }

        if (downloadUrl && downloadUrl.length > 10 && !downloadUrl.startsWith('blob:')) {
          logToPopup('info', `Fallback: Tìm thấy URL ${downloadType}, thử download qua API...`);

          // Send to background
          chrome.runtime.sendMessage({
            action: 'downloadMedia',
            url: downloadUrl,
            filename: `flow_${downloadType}_${Date.now()}.${downloadType === 'video' ? 'mp4' : 'png'}`,
            promptIndex: currentPrompt ? currentPrompt.substring(0, 30) : 'unknown'
          });

          logToPopup('success', 'Đã trigger fallback download qua API');
          return;
        }
      }
    }
  }

  // If no download button found, log but continue
  logToPopup('warning', 'Không tìm thấy nút tải về. File có thể đã tự động tải hoặc cần tải thủ công.');
  logToPopup('info', 'Media đã được tạo, bạn có thể tải thủ công từ website');
}

// Helper function for fallback direct download
function querySelectorAllDeep(root, selectors) {
  const selectorList = Array.isArray(selectors) ? selectors : [selectors];
  const results = [];
  const seenElements = new Set();
  const visitedRoots = new Set();
  const queue = [root];

  while (queue.length > 0) {
    const currentRoot = queue.shift();
    if (!currentRoot || visitedRoots.has(currentRoot)) continue;
    visitedRoots.add(currentRoot);

    if (currentRoot.matches) {
      for (const selector of selectorList) {
        let matches = false;
        try {
          matches = currentRoot.matches(selector);
        } catch (e) {
          matches = false;
        }
        if (matches && !seenElements.has(currentRoot)) {
          results.push(currentRoot);
          seenElements.add(currentRoot);
          break;
        }
      }
    }

    if (currentRoot.querySelectorAll) {
      for (const selector of selectorList) {
        try {
          currentRoot.querySelectorAll(selector).forEach(el => {
            if (!seenElements.has(el)) {
              seenElements.add(el);
              results.push(el);
            }
          });
        } catch (e) {
          // Ignore invalid selectors
        }
      }

      try {
        currentRoot.querySelectorAll('*').forEach(descendant => {
          if (descendant.shadowRoot && !visitedRoots.has(descendant.shadowRoot)) {
            queue.push(descendant.shadowRoot);
          }
        });
      } catch (e) {
        // Ignore
      }
    }
  }

  return results;
}

function fallbackDirectDownload(src, type) {
  try {
    const link = document.createElement('a');
    link.href = src;
    link.download = `flow_${type}_${Date.now()}.${type === 'video' ? 'mp4' : 'png'}`;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    logToPopup('info', 'Đã trigger download fallback (direct link)');
  } catch (e) {
    logToPopup('error', `Fallback download failed: ${e.message}`);
  }
}

function isElementVisible(element) {
  if (!element) return false;

  const style = window.getComputedStyle(element);
  return (
    style.display !== 'none' &&
    style.visibility !== 'hidden' &&
    style.opacity !== '0' &&
    element.offsetWidth > 0 &&
    element.offsetHeight > 0
  );
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function logToPopup(type, message) {
  chrome.runtime.sendMessage({
    action: 'log',
    type: type,
    message: message
  }).catch(() => {
    // Ignore errors
  });
}

async function ensureAutoDownloadEnabled(force = false, retries = 5) {
  if (autoDownloadEnsured && !force) {
    // Send status to popup
    chrome.runtime.sendMessage({
      action: 'autoDownloadStatus',
      enabled: true
    }).catch(() => { });
    return true;
  }

  logToPopup('info', 'Đang kiểm tra cài đặt "Tự động tải video"...');

  for (let attempt = 0; attempt < retries; attempt++) {
    const control = findAutoDownloadControl();
    if (control) {
      control.scrollIntoView({ behavior: 'smooth', block: 'center' });
      await sleep(300);

      if (!isControlChecked(control)) {
        try {
          control.click();
        } catch (e) {
          const nestedCheckbox = control.querySelector('input[type="checkbox"]');
          if (nestedCheckbox) {
            nestedCheckbox.click();
          }
        }
        await sleep(500);
      }

      if (isControlChecked(control)) {
        autoDownloadEnsured = true;
        logToPopup('success', 'Đã bật "Tự động tải video" trên Flow');
        // Send status to popup
        chrome.runtime.sendMessage({
          action: 'autoDownloadStatus',
          enabled: true
        }).catch(() => { });
        return true;
      }
    }

    await sleep(600);
  }

  logToPopup('info', 'Không tìm thấy cài đặt "Tự động tải video". Vui lòng bật thủ công nếu cần.');
  // Send status to popup
  chrome.runtime.sendMessage({
    action: 'autoDownloadStatus',
    enabled: false
  }).catch(() => { });
  return false;
}

async function disableAutoDownload(retries = 5) {
  logToPopup('info', 'Đang tắt cài đặt "Tự động tải video"...');

  for (let attempt = 0; attempt < retries; attempt++) {
    const control = findAutoDownloadControl();
    if (control) {
      control.scrollIntoView({ behavior: 'smooth', block: 'center' });
      await sleep(300);

      if (isControlChecked(control)) {
        try {
          control.click();
        } catch (e) {
          const nestedCheckbox = control.querySelector('input[type="checkbox"]');
          if (nestedCheckbox) {
            nestedCheckbox.click();
          }
        }
        await sleep(500);
      }

      if (!isControlChecked(control)) {
        autoDownloadEnsured = false;
        logToPopup('success', 'Đã tắt "Tự động tải video" trên Flow');
        // Send status to popup
        chrome.runtime.sendMessage({
          action: 'autoDownloadStatus',
          enabled: false
        }).catch(() => { });
        return true;
      }
    }

    await sleep(600);
  }

  logToPopup('warning', 'Không tìm thấy cài đặt "Tự động tải video" để tắt.');
  // Send status to popup
  chrome.runtime.sendMessage({
    action: 'autoDownloadStatus',
    enabled: false
  }).catch(() => { });
  return false;
}

function findAutoDownloadControl() {
  const attrSelectors = [
    'input[type="checkbox"][aria-label*="tự động tải" i]',
    'input[type="checkbox"][aria-label*="auto download" i]',
    '[role="switch"][aria-label*="tự động tải" i]',
    '[role="switch"][aria-label*="auto download" i]'
  ];

  for (const selector of attrSelectors) {
    const el = document.querySelector(selector);
    if (el && isElementVisible(el)) {
      return el;
    }
  }

  const textMatches = [
    'tự động tải video',
    'tu dong tai video',
    'auto download video'
  ];

  const containers = document.querySelectorAll('label, div, span, button, section');
  for (const container of containers) {
    const text = (container.textContent || '').toLowerCase();
    if (textMatches.some(match => text.includes(match))) {
      if (container.matches('input[type="checkbox"], [role="switch"]')) {
        return container;
      }
      const checkbox = container.querySelector('input[type="checkbox"], [role="switch"], button[role="switch"]');
      if (checkbox) {
        return checkbox;
      }
    }
  }

  return null;
}

function isControlChecked(control) {
  if (!control) return false;
  if (control.tagName === 'INPUT' && control.type === 'checkbox') {
    return control.checked;
  }

  const ariaChecked = control.getAttribute('aria-checked');
  if (ariaChecked) {
    return ariaChecked === 'true';
  }

  const nestedCheckbox = control.querySelector?.('input[type="checkbox"]');
  if (nestedCheckbox) {
    return nestedCheckbox.checked;
  }

  if (control.classList.contains('is-checked') || control.classList.contains('checked')) {
    return true;
  }

  return false;
}

// Enhance prompt with character and scene description for consistency
function enhancePromptForConsistency(originalPrompt, characterDescription, sceneDescription) {
  // If no character/scene description, return original
  if (!characterDescription && !sceneDescription) {
    return originalPrompt;
  }

  // Build enhanced prompt
  let enhancedParts = [];

  // Add character description first (if provided)
  if (characterDescription && characterDescription.trim()) {
    enhancedParts.push(characterDescription.trim());
  }

  // Add scene description (if provided)
  if (sceneDescription && sceneDescription.trim()) {
    enhancedParts.push(sceneDescription.trim());
  }

  // Add original prompt
  enhancedParts.push(originalPrompt.trim());

  // Add consistency instruction
  if (characterDescription || sceneDescription) {
    enhancedParts.push('Maintain consistent character appearance and scene continuity throughout.');
  }

  const enhanced = enhancedParts.join('. ');

  // Log enhancement (only if changed)
  if (enhanced !== originalPrompt) {
    console.log('[Prompt Enhancement]', {
      original: originalPrompt.substring(0, 100),
      enhanced: enhanced.substring(0, 100),
      hasCharacter: !!characterDescription,
      hasScene: !!sceneDescription
    });
  }

  return enhanced;
}
