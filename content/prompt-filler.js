// Prompt Filler Module
// Functions for filling prompt input and clicking create button

// Import dependencies (will be injected via main.js)
// - DELAYS, TIMEOUTS, RETRY_CONFIG from constants.js
// - isElementVisible, sleep from dom-helpers.js
// - logToPopup from main.js

async function fillPromptInput(prompt, retries = RETRY_CONFIG.FILL_INPUT_RETRIES) {
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
      await sleep(DELAYS.LONG);
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
    await sleep(DELAYS.MINIMAL);
    
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
    await sleep(DELAYS.MEDIUM);
    
    // Verify the value was set
    const currentValue = input.value || input.textContent || input.innerText || '';
    if (!currentValue.includes(prompt.substring(0, Math.min(10, prompt.length)))) {
      logToPopup('warning', 'Có thể prompt chưa được điền đúng, thử lại...');
  await sleep(DELAYS.SHORT);
  
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
      
      await sleep(DELAYS.SHORT);
    }
    
    logToPopup('info', `Đã điền prompt (${prompt.length} ký tự)`);
  return true;
  } catch (error) {
    logToPopup('error', `Lỗi khi điền prompt: ${error.message}`);
    return false;
  }
}
async function clickCreateButton(type, retries = RETRY_CONFIG.FILL_INPUT_RETRIES) {
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
    await sleep(DELAYS.VERIFY);
    
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
      await sleep(DELAYS.LONG);
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
      await sleep(DELAYS.LONG);
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
  
  await sleep(DELAYS.MINIMAL); // Minimal wait for request to be sent (optimized)
  
  // Verify that click actually triggered something (optimized)
  await sleep(DELAYS.SHORT);
  
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
    await sleep(DELAYS.RETRY);
    try {
      // Focus input first (sometimes needed)
      if (inputField) {
        inputField.focus();
        await sleep(DELAYS.MINIMAL);
      }
      
      // Try Enter key first (sometimes works better than click)
      if (inputField) {
        inputField.focus();
        await sleep(50);
        inputField.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', keyCode: 13, bubbles: true }));
        inputField.dispatchEvent(new KeyboardEvent('keypress', { key: 'Enter', code: 'Enter', keyCode: 13, bubbles: true }));
        inputField.dispatchEvent(new KeyboardEvent('keyup', { key: 'Enter', code: 'Enter', keyCode: 13, bubbles: true }));
        await sleep(DELAYS.MINIMAL);
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
      
      await sleep(DELAYS.SHORT); // Wait for processing to start (optimized)
      
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

// Export functions
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { fillPromptInput, clickCreateButton };
}
