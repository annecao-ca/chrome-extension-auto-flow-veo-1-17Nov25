// Content script - Automates actions on Google Flow/Veo3 website

let isProcessing = false;
let currentPrompt = null;
let currentType = null;
let initialMediaCount = 0; // Track media count when starting a new prompt
let initialMediaSrcs = new Set(); // Track media sources when starting

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
  
  const actionTerms = ['create', 'tạo', 'generate', 'make', 'generate', 'bắt đầu'];
  
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
            
            if (isSubmit || actionTerms.some(term => btnText.includes(term))) {
              inputAreaButton = btn;
              logToPopup('info', 'Tìm thấy submit/action button trong input area');
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
    if (hasAction || inputAreaButton.type === 'submit') {
      button = inputAreaButton;
      logToPopup('success', 'Sử dụng button từ input area');
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
                                 combinedText.includes('cài đặt') || combinedText.includes('mở rộng');
            
            if (isTabButton || isDropdownButton || isModelButton) {
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
                score += 25; // High bonus for proximity to input
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
            
            // High score = use immediately (increased threshold to avoid tab buttons)
            if (score > 50) {
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
                               combinedText.includes('cài đặt') || combinedText.includes('mở rộng');
          
          if (isTabButton || isDropdownButton || isModelButton) {
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
              score += 25; // High bonus for proximity
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
          
          if (score > 50) {
          button = btn;
          break;
        }
      }
    }
    }
    
    if (button) break;
    
    // Use best button if found (increased threshold to avoid tab buttons)
    if (!button && bestButton && bestScore > 40) {
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
  
  // CRITICAL: Never accept button with score 0 - it's definitely wrong
  if (bestScore === 0 && button) {
    logToPopup('error', `Button có score 0 - không đáng tin cậy. Tìm lại arrow button...`);
    button = null; // Reset button
  }
  
  // Only use button if score is high enough (avoid false positives)
  // But if button came from inputAreaButton, it's already verified, so use it
  if (!button && bestScore < 50) {
    logToPopup('error', `Button có score quá thấp (${bestScore}), không đáng tin cậy. Tìm lại...`);
    // Try to find arrow button more aggressively
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
              logToPopup('success', 'Tìm thấy arrow button (fallback)');
              break;
            }
          }
        }
      }
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
  
  logToPopup('info', `Bắt đầu monitor completion (tối đa ${Math.round(maxWaitTime/60000)} phút cho ${currentType})...`);
  
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
              if (el.readyState >= 2 && el.duration > 0 && el.duration > 0.1) {
                completed = true;
                hasLoadedMedia = true;
                logToPopup('success', `Tìm thấy VIDEO MỚI đã load (duration: ${el.duration.toFixed(1)}s)`);
                break;
              }
            } else if (el.tagName === 'IMG') {
              if (el.complete && el.naturalWidth > 0 && el.naturalHeight > 0) {
                // Check if it's a real image (not just an icon) - require larger size
                if (el.naturalWidth > 200 && el.naturalHeight > 200 && isElementVisible(el)) {
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
        logToPopup('warning', `Không có dấu hiệu xử lý trong ${Math.round(noProgressTimeout/1000)}s, có thể button chưa được click đúng. Tiếp tục với prompt tiếp theo...`);
        return; // Exit early only if never started processing
      }
      
      // If processing started, don't skip - wait for completion
      if (hasStartedProcessing && !isProcessing) {
        // Processing stopped but no completion yet - might be generating
        // Wait a bit more before checking completion
        if (elapsed % 30 === 0) {
          logToPopup('info', `Đã thấy processing trước đó, đang chờ completion... (${elapsed}s/${Math.round(maxWaitTime/1000)}s)`);
        }
      }
      
      // Log progress every 15 seconds (more frequent if processing)
      if (elapsed % 15 === 0 && elapsed > 0) {
        if (hasSeenProcessing) {
          logToPopup('info', `Đang xử lý... (${elapsed}s/${Math.round(maxWaitTime/1000)}s)`);
        } else {
          logToPopup('info', `Đang chờ... (${elapsed}s/${Math.round(maxWaitTime/1000)}s)`);
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
            if (media.tagName === 'IMG' && media.naturalWidth > 200 && media.naturalHeight > 200) {
              verifiedMedia = media;
              logToPopup('success', `Tìm thấy IMAGE MỚI thực sự (${media.naturalWidth}x${media.naturalHeight})`);
              break;
            } else if (media.tagName === 'VIDEO' && media.duration > 0.5 && media.readyState >= 2) {
              verifiedMedia = media;
              logToPopup('success', `Tìm thấy VIDEO MỚI thực sự (duration: ${media.duration.toFixed(1)}s)`);
              break;
            } else if (media.offsetWidth > 300 && media.offsetHeight > 300) {
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
        verifiedMedia.scrollIntoView({ behavior: 'smooth', block: 'center' });
        await sleep(1000);
        logToPopup('success', 'Đã verify media thực sự! Đang thử tải về...');
        await triggerDownload();
        await sleep(1000);
        logToPopup('success', 'Đã hoàn thành và trigger download!');
        return { mediaFound: true, media: verifiedMedia };
      } else {
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
  logToPopup('warning', `Đã chờ ${Math.round(maxWaitTime/60000)} phút, kiểm tra lần cuối...`);
  
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
    logToPopup('success', 'Đã tìm thấy media đã được tạo! Đang thử tải về...');
    await triggerDownload();
    return { mediaFound: true };
  } else {
    logToPopup('error', `Không tìm thấy media sau ${Math.round(maxWaitTime/60000)} phút. Có thể website chưa tạo xong hoặc có lỗi.`);
    logToPopup('warning', 'Media không được tạo thành công cho prompt này');
    return { mediaFound: false };
  }
}

async function triggerDownload() {
  logToPopup('info', 'Đang tìm cách tải về...');
  
  // Strategy 0: First, try to find download button near the most recent video/image
  // This is often the most reliable method
  // Filter out banner videos
  const allRecentMedia = Array.from(document.querySelectorAll('video, img[src*="flow"], img[src*="veo"], img[src*="google"]'));
  const recentMedia = allRecentMedia.filter(media => {
    const src = media.src || media.currentSrc || media.getAttribute('src') || '';
    return !src.toLowerCase().includes('banner') && 
           !src.toLowerCase().includes('background') &&
           !src.toLowerCase().includes('flow31_bg');
  });
  
  if (recentMedia.length > 0) {
    // Get the last (most recent) media element
    const lastMedia = recentMedia[recentMedia.length - 1];
    if (isElementVisible(lastMedia)) {
      logToPopup('info', 'Tìm download button gần media element mới nhất...');
      
      // Look for download button in parent containers (wider search)
      let container = lastMedia.parentElement;
      for (let i = 0; i < 8 && container; i++) {
        // Try multiple selectors
        const downloadBtn = container.querySelector(
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
        
        if (downloadBtn && isElementVisible(downloadBtn)) {
          logToPopup('success', 'Tìm thấy download button gần media!');
          downloadBtn.scrollIntoView({ behavior: 'smooth', block: 'center' });
          await sleep(500);
          downloadBtn.click();
          logToPopup('success', 'Đã click download button');
          await sleep(2000);
          return;
        }
        container = container.parentElement;
      }
      
      // Also try to find download button by looking for icons (SVG)
      container = lastMedia.parentElement;
      for (let i = 0; i < 8 && container; i++) {
        const buttons = container.querySelectorAll('button, a, [role="button"]');
        for (const btn of buttons) {
          if (isElementVisible(btn)) {
            // Check if button has download icon
            const hasDownloadIcon = btn.querySelector('svg[class*="download" i], svg[class*="arrow_down" i], svg[class*="save" i]');
            const text = (btn.textContent || btn.getAttribute('aria-label') || '').toLowerCase();
            if (hasDownloadIcon || text.includes('download') || text.includes('tải')) {
              logToPopup('success', 'Tìm thấy download button (có icon)!');
              btn.scrollIntoView({ behavior: 'smooth', block: 'center' });
              await sleep(500);
              btn.click();
              logToPopup('success', 'Đã click download button');
              await sleep(2000);
              return;
            }
          }
        }
        container = container.parentElement;
      }
    }
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
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          await sleep(300);
          el.click();
          logToPopup('success', 'Đã click nút tải về');
          await sleep(2000);
          return;
        }
      }
    } catch (e) {
      // Continue
    }
  }
  
  // Strategy 2: Use Chrome Downloads API directly (NEW - Most reliable)
  // Find the most recent media element (newly created)
  // IMPORTANT: Filter out banner/background videos
  const allMediaElements = Array.from(document.querySelectorAll('video, img[src*="flow"], img[src*="veo"], img[src*="google"], canvas, [class*="preview" i], [class*="result" i], [class*="output" i]'));
  
  // Filter out banner/background videos and images
  const mediaElements = allMediaElements.filter(media => {
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
      
      return isInProject || media.offsetWidth > 500; // Only large videos or videos in project containers
    }
    
    return true;
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
          logToPopup('info', `Tìm thấy ${downloadType}: ${downloadUrl ? downloadUrl.substring(0, 50) : 'no URL'}...`);
          
          if (downloadUrl) {
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
            if (downloadUrl.startsWith('http')) {
              logToPopup('info', 'Đang tải về qua Chrome Downloads API...');
              try {
                chrome.runtime.sendMessage({
                  action: 'downloadMedia',
                  url: downloadUrl,
                  filename: `flow_${downloadType}_${Date.now()}.${downloadType === 'video' ? 'mp4' : 'png'}`,
                  promptIndex: currentPrompt ? currentPrompt.substring(0, 30) : 'unknown'
                }, (response) => {
                  if (chrome.runtime.lastError) {
                    logToPopup('warning', `Chrome API error: ${chrome.runtime.lastError.message}, thử cách khác...`);
                    // Fallback to direct link download
                    fallbackDirectDownload(downloadUrl, downloadType);
                  } else if (response && response.success) {
                    logToPopup('success', `Đã bắt đầu download ${downloadType} qua Chrome API`);
                  } else {
                    logToPopup('warning', 'Không nhận được response, thử cách khác...');
                    fallbackDirectDownload(downloadUrl, downloadType);
                  }
                });
                await sleep(1500);
                return; // Exit after trying Chrome API
              } catch (apiError) {
                logToPopup('warning', `API error: ${apiError.message}, thử cách khác...`);
                // Fallback to direct link download
                fallbackDirectDownload(downloadUrl, downloadType);
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
  
  // If no download button found, log but continue
  logToPopup('warning', 'Không tìm thấy nút tải về. File có thể đã tự động tải hoặc cần tải thủ công.');
  logToPopup('info', 'Media đã được tạo, bạn có thể tải thủ công từ website');
}

// Helper function for fallback direct download
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
