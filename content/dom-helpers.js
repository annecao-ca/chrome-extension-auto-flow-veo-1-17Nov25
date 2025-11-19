// DOM Helper Functions
// Helper functions for DOM manipulation and element detection

// Import constants
// Import from parent directory's constants.js

/**
 * Check if an element is visible on the page
 * @param {HTMLElement} element - Element to check
 * @returns {boolean} - True if element is visible
 */
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

/**
 * Sleep/delay helper function
 * @param {number} ms - Milliseconds to sleep
 * @returns {Promise} - Promise that resolves after delay
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

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

// Wait for element to appear with MutationObserver
async function waitForElement(selector, timeout = TIMEOUTS.ELEMENT_WAIT) {
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
    }, DELAYS.MEDIUM);
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
  if (DEBUG_MODE && enhanced !== originalPrompt) {
    console.log('[Prompt Enhancement]', {
      original: originalPrompt.substring(0, 100),
      enhanced: enhanced.substring(0, 100),
      hasCharacter: !!characterDescription,
      hasScene: !!sceneDescription
    });
  }

  return enhanced;
}

// Export functions
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    isElementVisible,
    sleep,
    debugFindInputs,
    debugFindButtons,
    waitForElement,
    enhancePromptForConsistency
  };
}
