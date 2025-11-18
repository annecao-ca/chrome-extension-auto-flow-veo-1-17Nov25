// Popup script - Main UI logic

let state = {
  prompts: [],
  selectedType: null, // 'image' or 'video'
  isProcessing: false,
  isPaused: false,
  currentIndex: 0,
  totalTasks: 0,
  completedTasks: 0
};

// DOM Elements
const elements = {
  promptInput: null,
  fileInput: null,
  importBtn: null,
  imageBtn: null,
  videoBtn: null,
  selectedType: null,
  startBtn: null,
  pauseBtn: null,
  resumeBtn: null,
  stopBtn: null,
  progressText: null,
  progressPercent: null,
  progressBar: null,
  logArea: null,
  clearLogBtn: null,
  toggleSettings: null,
  settingsContent: null,
  statusMessage: null
};

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
  // Initialize toast manager
  if (typeof toastManager !== 'undefined') {
    toastManager.init();
  }
  
  initializeElements();
  attachEventListeners();
  
  // Show loading state while initializing
  setSectionLoading(document.querySelector('.container'), true);
  
  try {
    await loadSavedState();
    await loadAndApplySettings();
    await syncStateFromBackground();
    updateUI();
    checkEmptyStates(); // Check empty states after initialization
  } catch (error) {
    if (typeof toastManager !== 'undefined') {
      toastManager.error('Lỗi khi khởi tạo: ' + error.message);
    }
  } finally {
    setSectionLoading(document.querySelector('.container'), false);
  }
});

async function syncStateFromBackground() {
  // Request current state from background script with retry logic
  const maxRetries = 3;
  const retryDelay = 500; // 500ms between retries
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      // Check if runtime is available
      if (!chrome.runtime || !chrome.runtime.id) {
        console.log('Chrome runtime not available');
        break;
      }
      
      // Send message with promise wrapper
      const response = await new Promise((resolve, reject) => {
        chrome.runtime.sendMessage({ action: 'getState' }, (response) => {
          // Check for runtime errors
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
            return;
          }
          resolve(response);
        });
      });
      
      if (response && response.state) {
        // Update local state with background state
        if (response.state.isRunning !== undefined) {
          state.isProcessing = response.state.isRunning;
        }
        if (response.state.isPaused !== undefined) {
          state.isPaused = response.state.isPaused;
        }
        if (response.state.completedTasks !== undefined) {
          state.completedTasks = response.state.completedTasks;
        }
        if (response.state.totalTasks !== undefined) {
          state.totalTasks = response.state.totalTasks;
        }
        if (response.state.prompts && response.state.prompts.length > 0) {
          state.prompts = response.state.prompts;
          // Update textarea if prompts exist
          if (elements.promptInput && state.prompts.length > 0) {
            elements.promptInput.value = state.prompts.join('\n');
          }
        }
        if (response.state.type) {
          state.selectedType = response.state.type;
          selectType(response.state.type);
        }
        // Success - exit retry loop
        return;
      }
    } catch (error) {
      // Log error but continue with retry
      if (attempt < maxRetries - 1) {
        console.log(`Could not sync state from background (attempt ${attempt + 1}/${maxRetries}):`, error.message);
        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, retryDelay));
      } else {
        // Final attempt failed - log but don't throw
        console.log('Could not sync state from background after retries:', error.message);
        // This is not critical - extension can still work without syncing state
      }
    }
  }
}

function initializeElements() {
  elements.promptInput = document.getElementById('promptInput');
  elements.fileInput = document.getElementById('fileInput');
  elements.importBtn = document.getElementById('importBtn');
  elements.imageBtn = document.getElementById('imageBtn');
  elements.videoBtn = document.getElementById('videoBtn');
  elements.selectedType = document.getElementById('selectedType');
  elements.startBtn = document.getElementById('startBtn');
  elements.pauseBtn = document.getElementById('pauseBtn');
  elements.resumeBtn = document.getElementById('resumeBtn');
  elements.stopBtn = document.getElementById('stopBtn');
  elements.progressText = document.getElementById('progressText');
  elements.progressPercent = document.getElementById('progressPercent');
  elements.progressBar = document.getElementById('progressBar');
  elements.logArea = document.getElementById('logArea');
  elements.clearLogBtn = document.getElementById('clearLogBtn');
  elements.toggleSettings = document.getElementById('toggleSettings');
  elements.settingsContent = document.getElementById('settingsContent');
  elements.statusMessage = document.getElementById('statusMessage');
}

function attachEventListeners() {
  // Import file
  elements.importBtn?.addEventListener('click', () => {
    elements.fileInput?.click();
  });
  
  elements.fileInput?.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (file) {
      // Set loading state
      setButtonLoading(elements.importBtn, true);
      setInputLoading(elements.promptInput, true);
      
      try {
        const prompts = await parsePromptsFromFile(file);
        elements.promptInput.value = prompts.join('\n');
        state.prompts = prompts;
        
        // Success feedback
        addLog('success', `Đã import ${prompts.length} prompt từ file`);
        if (typeof toastManager !== 'undefined') {
          toastManager.success(`Đã import ${prompts.length} prompt từ file`);
        }
        updateUI();
      } catch (error) {
        // Error feedback
        addLog('error', `Lỗi khi import file: ${error.message}`);
        if (typeof toastManager !== 'undefined') {
          toastManager.error(`Lỗi khi import file: ${error.message}`);
        }
      } finally {
        // Remove loading state
        setButtonLoading(elements.importBtn, false);
        setInputLoading(elements.promptInput, false);
        // Reset file input
        elements.fileInput.value = '';
      }
    }
  });
  
  // Type selection
  elements.imageBtn?.addEventListener('click', () => {
    selectType('image');
  });
  
  elements.videoBtn?.addEventListener('click', () => {
    selectType('video');
  });
  
  // Control buttons
  elements.startBtn?.addEventListener('click', handleStart);
  elements.pauseBtn?.addEventListener('click', handlePause);
  elements.resumeBtn?.addEventListener('click', handleResume);
  elements.stopBtn?.addEventListener('click', handleStop);
  
  // Clear log
  elements.clearLogBtn?.addEventListener('click', () => {
    elements.logArea.innerHTML = '';
  });
  
  // Toggle settings
  elements.toggleSettings?.addEventListener('click', () => {
    const isVisible = elements.settingsContent.style.display !== 'none';
    elements.settingsContent.style.display = isVisible ? 'none' : 'block';
    elements.toggleSettings.textContent = isVisible ? '▼' : '▲';
  });
  
  // Prompt input change
  elements.promptInput?.addEventListener('input', () => {
    const text = elements.promptInput.value;
    state.prompts = parsePrompts(text);
    updateUI();
    checkEmptyStates();
  });
}

// Check and show empty states
function checkEmptyStates() {
  // Check prompts
  if (typeof emptyStateManager !== 'undefined') {
    const promptSection = elements.promptInput?.closest('.section');
    if (promptSection && state.prompts.length === 0) {
      emptyStateManager.show(promptSection, EMPTY_STATE_TYPES.NO_PROMPTS, { compact: true });
    } else if (promptSection) {
      emptyStateManager.hide(promptSection);
    }

    // Check log area
    if (elements.logArea) {
      const hasLogs = elements.logArea.children.length > 0;
      if (!hasLogs) {
        emptyStateManager.show(elements.logArea, EMPTY_STATE_TYPES.NO_LOG, { compact: true });
      } else {
        emptyStateManager.hide(elements.logArea);
      }
    }

    // Check progress
    if (state.totalTasks === 0 && !state.isProcessing) {
      const progressSection = elements.progressBar?.closest('.section');
      if (progressSection) {
        emptyStateManager.show(progressSection, EMPTY_STATE_TYPES.NO_PROGRESS, { compact: true });
      }
    } else if (elements.progressBar?.closest('.section')) {
      emptyStateManager.hide(elements.progressBar.closest('.section'));
    }
  }
}

function selectType(type) {
  state.selectedType = type;
  
  // Update button states
  elements.imageBtn?.classList.toggle('active', type === 'image');
  elements.videoBtn?.classList.toggle('active', type === 'video');
  
  // Show selected type
  if (elements.selectedType) {
    elements.selectedType.style.display = 'block';
    const text = type === 'image' ? getText('selectedImage') : getText('selectedVideo');
    elements.selectedType.textContent = text;
  }
  
  updateUI();
}

async function handleStart() {
  if (!state.selectedType) {
    if (typeof toastManager !== 'undefined') {
      toastManager.error('Vui lòng chọn loại tạo (Image hoặc Video)');
    } else {
      showStatus('error', 'Vui lòng chọn loại tạo (Image hoặc Video)');
    }
    return;
  }
  
  if (state.prompts.length === 0) {
    if (typeof toastManager !== 'undefined') {
      toastManager.error('Vui lòng nhập ít nhất một prompt');
    } else {
      showStatus('error', 'Vui lòng nhập ít nhất một prompt');
    }
    return;
  }
  
  // Get settings
  const settings = await getSettingsFromUI();
  const validation = validateSettings(settings);
  
  if (!validation.valid) {
    if (typeof toastManager !== 'undefined') {
      toastManager.error(validation.errors.join(', '));
    } else {
      showStatus('error', validation.errors.join(', '));
    }
    return;
  }
  
  // Set loading state
  setButtonLoading(elements.startBtn, true);
  
  try {
    // Calculate total tasks
    const startIndex = Math.max(1, settings.startIndex) - 1;
    const promptsToProcess = state.prompts.slice(startIndex);
    state.totalTasks = promptsToProcess.length * settings.repeatCount;
    state.completedTasks = 0;
    state.currentIndex = startIndex;
    state.isProcessing = true;
    state.isPaused = false;
    
    // Send message to background script with error handling
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
    
    addLog('info', getText('logStarting'));
    if (typeof toastManager !== 'undefined') {
      toastManager.info('Đang bắt đầu xử lý...', 'Bắt đầu');
    }
    updateUI();
  } catch (error) {
    if (typeof toastManager !== 'undefined') {
      toastManager.error('Lỗi khi bắt đầu: ' + error.message);
    }
  } finally {
    setButtonLoading(elements.startBtn, false);
  }
}

function handlePause() {
  setButtonLoading(elements.pauseBtn, true);
  
  state.isPaused = true;
  try {
    chrome.runtime.sendMessage({ action: 'pause' }, (response) => {
      if (chrome.runtime.lastError) {
        console.error('Error sending pause message:', chrome.runtime.lastError.message);
      }
    });
  } catch (error) {
    console.error('Error sending pause message:', error);
  }
  addLog('warning', getText('logPaused'));
  
  if (typeof toastManager !== 'undefined') {
    toastManager.warning('Đã tạm dừng', 'Tạm dừng');
  }
  
  setTimeout(() => {
    setButtonLoading(elements.pauseBtn, false);
    updateUI();
  }, 300);
}

function handleResume() {
  setButtonLoading(elements.resumeBtn, true);
  
  state.isPaused = false;
  try {
    chrome.runtime.sendMessage({ action: 'resume' }, (response) => {
      if (chrome.runtime.lastError) {
        console.error('Error sending resume message:', chrome.runtime.lastError.message);
      }
    });
  } catch (error) {
    console.error('Error sending resume message:', error);
  }
  addLog('info', getText('logResumed'));
  
  if (typeof toastManager !== 'undefined') {
    toastManager.info('Đã tiếp tục', 'Tiếp tục');
  }
  
  setTimeout(() => {
    setButtonLoading(elements.resumeBtn, false);
    updateUI();
  }, 300);
}

function handleStop() {
  setButtonLoading(elements.stopBtn, true);
  
  state.isProcessing = false;
  state.isPaused = false;
  try {
    chrome.runtime.sendMessage({ action: 'stop' }, (response) => {
      if (chrome.runtime.lastError) {
        console.error('Error sending stop message:', chrome.runtime.lastError.message);
      }
    });
  } catch (error) {
    console.error('Error sending stop message:', error);
  }
  addLog('warning', getText('logStopped'));
  
  if (typeof toastManager !== 'undefined') {
    toastManager.warning('Đã dừng xử lý', 'Dừng');
  }
  
  setTimeout(() => {
    setButtonLoading(elements.stopBtn, false);
    updateUI();
  }, 300);
}

function updateUI() {
  // Update start button
  const canStart = state.prompts.length > 0 && state.selectedType && !state.isProcessing;
  elements.startBtn.disabled = !canStart;
  
  // Update control buttons visibility
  if (state.isProcessing) {
    elements.startBtn.style.display = 'none';
    elements.pauseBtn.style.display = state.isPaused ? 'none' : 'inline-block';
    elements.resumeBtn.style.display = state.isPaused ? 'inline-block' : 'none';
    elements.stopBtn.style.display = 'inline-block';
    elements.pauseBtn.disabled = false;
    elements.resumeBtn.disabled = false;
    elements.stopBtn.disabled = false;
  } else {
    elements.startBtn.style.display = 'inline-block';
    elements.pauseBtn.style.display = 'none';
    elements.resumeBtn.style.display = 'none';
    elements.stopBtn.style.display = 'none';
  }
  
  // Update progress
  const percent = state.totalTasks > 0 
    ? Math.round((state.completedTasks / state.totalTasks) * 100) 
    : 0;
  elements.progressText.textContent = `${state.completedTasks} / ${state.totalTasks}`;
  elements.progressPercent.textContent = `(${percent}%)`;
  elements.progressBar.style.width = `${percent}%`;
  
  // Add active class to progress bar when processing
  if (state.isProcessing && !state.isPaused) {
    elements.progressBar.classList.add('active');
  } else {
    elements.progressBar.classList.remove('active');
  }

  // Check empty states
  checkEmptyStates();
}

function addLog(type, message) {
  if (!elements.logArea) return;
  
  const entry = document.createElement('div');
  entry.className = `log-entry ${type}`;
  
  const icon = type === 'success' ? '✓' : 
                type === 'error' ? '✗' : 
                type === 'warning' ? '⚠' : 'ℹ';
  
  entry.innerHTML = `
    <span class="timestamp">[${getTimestamp()}]</span>
    <span class="icon">${icon}</span>
    <span>${message}</span>
  `;
  
  elements.logArea.appendChild(entry);
  elements.logArea.scrollTop = elements.logArea.scrollHeight;
}

function showStatus(type, message) {
  if (!elements.statusMessage) return;
  
  elements.statusMessage.className = `status-message ${type}`;
  elements.statusMessage.textContent = message;
  elements.statusMessage.style.display = 'block';
  
  setTimeout(() => {
    elements.statusMessage.style.display = 'none';
  }, 3000);
}

async function loadSavedState() {
  return new Promise((resolve) => {
    chrome.storage.local.get(['state'], (result) => {
      if (result.state) {
        Object.assign(state, result.state);
      }
      resolve();
    });
  });
}

async function loadAndApplySettings() {
  const settings = await loadSettings();
  await applySettingsToUI(settings);
}

// Listen for messages from background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'updateProgress') {
    state.completedTasks = message.completed || state.completedTasks;
    updateUI();
  } else if (message.action === 'log') {
    addLog(message.type || 'info', message.message);
    checkEmptyStates(); // Update empty states after adding log
  } else if (message.action === 'status') {
    // Use toast instead of old status message
    if (typeof toastManager !== 'undefined') {
      const type = message.type || 'info';
      const msg = message.message || '';
      if (type === 'success') {
        toastManager.success(msg);
      } else if (type === 'error') {
        toastManager.error(msg);
        // Show empty state for errors if needed
        if (msg.includes('Không tìm thấy tab')) {
          if (typeof emptyStateManager !== 'undefined') {
            const container = document.querySelector('.container');
            emptyStateManager.show(container, EMPTY_STATE_TYPES.NO_TAB);
          }
        }
      } else if (type === 'warning') {
        toastManager.warning(msg);
      } else {
        toastManager.info(msg);
      }
    } else {
      // Fallback to old method
      showStatus(message.type, message.message);
    }
  }
});

// Check network connection
function checkNetworkConnection() {
  if (!navigator.onLine && typeof emptyStateManager !== 'undefined') {
    const container = document.querySelector('.container');
    emptyStateManager.show(container, EMPTY_STATE_TYPES.NO_NETWORK);
  }
}

// Listen for online/offline events
window.addEventListener('online', () => {
  if (typeof emptyStateManager !== 'undefined') {
    const container = document.querySelector('.container');
    emptyStateManager.hide(container);
  }
});

window.addEventListener('offline', () => {
  checkNetworkConnection();
});

// Initial check
checkNetworkConnection();
