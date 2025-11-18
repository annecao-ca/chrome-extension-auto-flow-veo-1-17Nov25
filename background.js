// Background service worker - Manages workflow and queue

let workflowState = {
  isRunning: false,
  isPaused: false,
  prompts: [],
  type: null, // 'image' or 'video'
  settings: null,
  currentIndex: 0,
  currentRepeat: 0,
  totalTasks: 0,
  completedTasks: 0,
  successfulTasks: 0, // Track tasks that actually created media
  queue: [],
  downloads: {} // Track active downloads
};

// Keep service worker alive by listening to events
chrome.runtime.onInstalled.addListener(() => {
  console.log('Background service worker installed/updated');
});

chrome.runtime.onStartup.addListener(() => {
  console.log('Background service worker started');
});

// Message handler - Must be synchronous for immediate response
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'start') {
    handleStart(message);
    sendResponse({ success: true });
  } else if (message.action === 'pause') {
    handlePause();
    sendResponse({ success: true });
  } else if (message.action === 'resume') {
    handleResume();
    sendResponse({ success: true });
  } else if (message.action === 'stop') {
    handleStop();
    sendResponse({ success: true });
  } else if (message.action === 'promptCompleted') {
    handlePromptCompleted(message.mediaFound || false);
    sendResponse({ success: true });
  } else if (message.action === 'updateProgress') {
    workflowState.completedTasks = message.completed || workflowState.completedTasks;
    notifyPopup('updateProgress', { completed: workflowState.completedTasks });
    sendResponse({ success: true });
  } else if (message.action === 'getState') {
    // Return current workflow state
    sendResponse({
      success: true,
      state: {
        isRunning: workflowState.isRunning,
        isPaused: workflowState.isPaused,
        prompts: workflowState.prompts,
        type: workflowState.type,
        completedTasks: workflowState.completedTasks,
        totalTasks: workflowState.totalTasks,
        currentIndex: workflowState.currentIndex
      }
    });
  } else if (message.action === 'downloadMedia') {
    handleDownloadMedia(message.url, message.filename, message.promptIndex);
    sendResponse({ success: true });
  }
  
  return true; // Keep channel open for async response
});

function handleStart(message) {
  workflowState.isRunning = true;
  workflowState.isPaused = false;
  workflowState.prompts = message.prompts || [];
  workflowState.type = message.type;
  workflowState.settings = message.settings || {};
  workflowState.currentIndex = Math.max(0, (workflowState.settings.startIndex || 1) - 1);
  workflowState.currentRepeat = 0;
  workflowState.completedTasks = 0;
  workflowState.successfulTasks = 0; // Reset successful tasks counter
  
  // Calculate total tasks
  const promptsToProcess = workflowState.prompts.slice(workflowState.currentIndex);
  const repeatCount = workflowState.settings.repeatCount || 1;
  workflowState.totalTasks = promptsToProcess.length * repeatCount;
  
  // Build queue
  buildQueue();
  
  // Update persistent UI - show badge
  updatePersistentUI('status', { 
    type: 'info', 
    message: `Bắt đầu xử lý ${workflowState.totalTasks} tasks` 
  });
  
  // Send notification
  sendNotification('info', `Bắt đầu xử lý ${workflowState.totalTasks} ${workflowState.type === 'video' ? 'video' : 'ảnh'}`);
  
  // Start processing
  processNext();
}

function buildQueue() {
  workflowState.queue = [];
  const startIndex = workflowState.currentIndex;
  const repeatCount = workflowState.settings.repeatCount || 1;
  
  for (let i = startIndex; i < workflowState.prompts.length; i++) {
    for (let r = 0; r < repeatCount; r++) {
      workflowState.queue.push({
        promptIndex: i,
        prompt: workflowState.prompts[i],
        repeatIndex: r
      });
    }
  }
}

function handlePause() {
  workflowState.isPaused = true;
  
  // Update badge to show paused
  chrome.action.setBadgeText({ text: '⏸' });
  chrome.action.setBadgeBackgroundColor({ color: '#f59e0b' });
  
  notifyPopup('log', { type: 'warning', message: 'Đã tạm dừng' });
  sendNotification('warning', 'Đã tạm dừng');
}

function handleResume() {
  workflowState.isPaused = false;
  
  // Update badge to show running
  const remaining = workflowState.totalTasks - workflowState.completedTasks;
  chrome.action.setBadgeText({ text: remaining > 0 ? remaining.toString() : '' });
  chrome.action.setBadgeBackgroundColor({ color: '#06b6d4' });
  
  notifyPopup('log', { type: 'info', message: 'Đã tiếp tục' });
  sendNotification('info', 'Đã tiếp tục xử lý');
  processNext();
}

function handleStop() {
  workflowState.isRunning = false;
  workflowState.isPaused = false;
  workflowState.queue = [];
  
  // Clear badge
  chrome.action.setBadgeText({ text: '' });
  
  notifyPopup('log', { type: 'warning', message: 'Đã dừng' });
  sendNotification('warning', 'Đã dừng xử lý');
}

function handlePromptCompleted(mediaFound = false) {
  workflowState.completedTasks++;
  if (mediaFound) {
    workflowState.successfulTasks++;
  }
  notifyPopup('updateProgress', { completed: workflowState.completedTasks });
  
  // Update persistent UI
  updatePersistentUI('updateProgress', { completed: workflowState.completedTasks });
  
  // Check if all tasks are completed
  if (workflowState.completedTasks >= workflowState.totalTasks) {
    workflowState.isRunning = false;
    
    // Update badge to show completed
    chrome.action.setBadgeText({ text: '✓' });
    chrome.action.setBadgeBackgroundColor({ color: '#10b981' }); // Green
    
    if (workflowState.successfulTasks > 0) {
      const message = `✓ Hoàn thành tất cả! (${workflowState.successfulTasks}/${workflowState.totalTasks} có media)`;
      notifyPopup('log', { type: 'success', message: message });
      sendNotification('success', message);
    } else {
      const message = '⚠ Hoàn thành nhưng không có media nào được tạo!';
      notifyPopup('log', { type: 'error', message: message });
      sendNotification('error', message);
    }
    notifyPopup('status', { type: workflowState.successfulTasks > 0 ? 'success' : 'error', message: `Đã hoàn thành: ${workflowState.successfulTasks}/${workflowState.totalTasks} có media` });
  } else {
    processNext();
  }
}

async function processNext() {
  if (!workflowState.isRunning || workflowState.isPaused) {
    return;
  }
  
  if (workflowState.queue.length === 0) {
    // All done
    workflowState.isRunning = false;
    
    // Update badge to show completed
    chrome.action.setBadgeText({ text: '✓' });
    chrome.action.setBadgeBackgroundColor({ color: '#10b981' });
    
    notifyPopup('log', { type: 'success', message: 'Hoàn thành tất cả!' });
    notifyPopup('status', { type: 'success', message: 'Đã hoàn thành tất cả prompts' });
    sendNotification('success', 'Hoàn thành tất cả prompts!');
    return;
  }
  
  const task = workflowState.queue.shift();
  const promptIndex = task.promptIndex;
  const isFirstPrompt = promptIndex === workflowState.currentIndex && task.repeatIndex === 0;
  const isEarlyStage = promptIndex < workflowState.currentIndex + 5;
  
  // Calculate delay based on stage
  let delay = 0;
  if (isFirstPrompt) {
    // Stage 1: Send immediately
    delay = 0;
  } else if (isEarlyStage) {
    // Stage 2: Random delay 10-15s (ultra-fast mode)
    const min = workflowState.settings.delayMin || 10;
    const max = workflowState.settings.delayMax || 15;
    delay = getRandomDelay(min, max);
  } else {
    // Stage 3: Monitor queue + random delay (ultra-fast mode)
    // Check if there are items in queue on the website
    const min = workflowState.settings.delayMin || 10;
    const max = workflowState.settings.delayMax || 15;
    delay = getRandomDelay(min, max);
  }
  
  if (delay > 0) {
    notifyPopup('log', { 
      type: 'info', 
      message: `Chờ ${Math.round(delay / 1000)}s trước khi gửi prompt tiếp theo...` 
    });
    await sleep(delay);
  }
  
  // Check if still running and not paused
  if (!workflowState.isRunning || workflowState.isPaused) {
    return;
  }
  
  // Helper function to check if URL is Google Flow/Veo3
  function isFlowUrl(url) {
    if (!url) return false;
    const urlLower = url.toLowerCase();
    // Check for flow.google.com
    if (urlLower.includes('flow.google.com')) return true;
    // Check for labs.google with /flow/ or /fx/vi/tools/flow/
    if (urlLower.includes('labs.google') && (urlLower.includes('/flow/') || urlLower.includes('/fx/') || urlLower.includes('/tools/flow'))) return true;
    // Check for any google.com with flow in path
    if (urlLower.includes('google.com') && urlLower.includes('/flow')) return true;
    return false;
  }
  
  // Find Google Flow/Veo3 tab
  let tab = null;
  
  // Strategy 1: Check active tab first
  let activeTabs = await chrome.tabs.query({ active: true, currentWindow: true });
  if (activeTabs.length > 0 && isFlowUrl(activeTabs[0].url)) {
    tab = activeTabs[0];
    logToPopup('info', 'Đã tìm thấy tab Google Flow/Veo3 (active tab)');
  } else {
    // Strategy 2: Search all tabs in current window
    let allTabs = await chrome.tabs.query({ currentWindow: true });
    for (const t of allTabs) {
      if (isFlowUrl(t.url)) {
        tab = t;
        logToPopup('info', 'Đã tìm thấy tab Google Flow/Veo3 trong cửa sổ hiện tại');
        break;
      }
    }
    
    // Strategy 3: Search all tabs in all windows
    if (!tab) {
      allTabs = await chrome.tabs.query({});
      for (const t of allTabs) {
        if (isFlowUrl(t.url)) {
          tab = t;
          logToPopup('info', 'Đã tìm thấy tab Google Flow/Veo3 trong tất cả cửa sổ');
          break;
        }
      }
    }
    
    // NOTE: KHÔNG tự động activate tab - để user có thể làm việc ở tab khác
    // Extension sẽ tiếp tục chạy trong background, không cần tab phải active
    if (tab && !tab.active) {
      logToPopup('info', `Tab Google Flow/Veo3 đang ở background (không active) - Extension vẫn tiếp tục chạy`);
      // Không activate tab - để user có thể làm việc ở tab khác
      // Chỉ cần đợi một chút để đảm bảo tab đã load (nếu cần)
      await sleep(200); // Minimal wait - không cần activate
    }
  }
  
  if (!tab) {
    notifyPopup('log', { 
      type: 'error', 
      message: 'Không tìm thấy tab Google Flow/Veo3. Vui lòng mở trang https://flow.google.com và thử lại' 
    });
    workflowState.isRunning = false;
    notifyPopup('status', { type: 'error', message: 'Đã dừng: Không tìm thấy tab Google Flow/Veo3' });
    return;
  }
  
  if (!tab.url || !isFlowUrl(tab.url)) {
    notifyPopup('log', { 
      type: 'error', 
      message: `Tab không phải là Google Flow/Veo3. URL: ${tab.url ? tab.url.substring(0, 50) : 'unknown'}` 
    });
    return;
  }
  
  logToPopup('info', `Đang gửi prompt đến tab: ${tab.url.substring(0, 50)}...`);
  
  // Try to inject content script if needed and verify it's ready
  let contentScriptReady = false;
  let needsInjection = false;
  
  // First, try to ping content script to check if it's loaded
  try {
    const pingResponse = await chrome.tabs.sendMessage(tab.id, { action: 'ping' });
    if (pingResponse && pingResponse.loaded) {
      contentScriptReady = true;
      logToPopup('info', 'Content script đã được load sẵn');
    }
  } catch (error) {
    // Content script might not be loaded
    if (error.message && error.message.includes('Could not establish connection')) {
      needsInjection = true;
      logToPopup('info', 'Content script chưa được load, đang inject...');
    } else {
      logToPopup('warning', `Lỗi khi ping content script: ${error.message}`);
      needsInjection = true;
    }
  }
  
  // Inject if needed
  if (needsInjection) {
    try {
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ['utils.js', 'content.js']
      });
      logToPopup('success', 'Đã inject content script');
      
      // Wait minimal time for script to initialize (optimized for speed)
      await sleep(150);
      
      // Verify content script is ready by pinging (minimal retries)
      let verified = false;
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          const verifyResponse = await chrome.tabs.sendMessage(tab.id, { action: 'ping' });
          if (verifyResponse && verifyResponse.loaded) {
            verified = true;
            contentScriptReady = true;
            logToPopup('success', `Đã verify content script sẵn sàng (lần ${attempt + 1})`);
            break;
          }
        } catch (e) {
          if (attempt < 2) {
            logToPopup('info', `Đang chờ content script... (lần ${attempt + 1}/3)`);
            await sleep(100); // Minimal wait between retries (optimized)
          }
        }
      }
      
      if (!verified) {
        logToPopup('error', 'Không thể verify content script sau khi inject');
        notifyPopup('log', { 
          type: 'error', 
          message: 'Content script đã được inject nhưng chưa sẵn sàng. Vui lòng refresh trang Google Flow/Veo3' 
        });
        setTimeout(() => {
          if (workflowState.isRunning && !workflowState.isPaused) {
            processNext();
          }
        }, 5000);
        return;
      }
    } catch (injectError) {
      logToPopup('error', `Không thể inject content script: ${injectError.message}`);
      notifyPopup('log', { 
        type: 'error', 
        message: 'Không thể inject content script. Vui lòng refresh trang Google Flow/Veo3' 
      });
      setTimeout(() => {
        if (workflowState.isRunning && !workflowState.isPaused) {
          processNext();
        }
      }, 5000);
      return;
    }
  }
  
  // Only send message if content script is ready
  if (!contentScriptReady) {
    logToPopup('error', 'Content script chưa sẵn sàng, không thể gửi prompt');
    notifyPopup('log', { type: 'error', message: 'Content script chưa sẵn sàng. Vui lòng refresh trang Google Flow/Veo3' });
    setTimeout(() => {
      if (workflowState.isRunning && !workflowState.isPaused) {
        processNext();
      }
    }, 5000);
    return;
  }
  
  // Send message to content script with enhanced settings
  try {
    await chrome.tabs.sendMessage(tab.id, {
      action: 'processPrompt',
      prompt: task.prompt,
      type: workflowState.type,
      promptIndex: promptIndex + 1,
      totalPrompts: workflowState.prompts.length,
      characterDescription: workflowState.settings?.characterDescription || '',
      sceneDescription: workflowState.settings?.sceneDescription || ''
    });
    logToPopup('success', 'Đã gửi prompt đến content script');
  } catch (error) {
    notifyPopup('log', { type: 'error', message: `Lỗi khi gửi prompt: ${error.message}` });
    // Check if content script is not injected
    if (error.message && error.message.includes('Could not establish connection')) {
      notifyPopup('log', { type: 'error', message: 'Content script mất kết nối. Vui lòng refresh trang Google Flow/Veo3' });
    }
    // Retry after delay
    setTimeout(() => {
      if (workflowState.isRunning && !workflowState.isPaused) {
        processNext();
      }
    }, 5000);
  }
}

function getRandomDelay(min, max) {
  const delaySeconds = Math.floor(Math.random() * (max - min + 1)) + min;
  return delaySeconds * 1000;
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function notifyPopup(action, data) {
  // Try to notify popup (if open)
  try {
    chrome.runtime.sendMessage({
      action: action,
      ...data
    }, (response) => {
      // Check for errors (popup might be closed)
      if (chrome.runtime.lastError) {
        // Popup is closed or not available - this is normal, use persistent UI instead
        console.log('Popup not available, using persistent UI:', chrome.runtime.lastError.message);
      }
    });
  } catch (error) {
    // Ignore errors when popup is not available
    console.log('Error notifying popup:', error.message);
  }
  
  // PERSISTENT UI: Always update badge and send notifications (even when popup is closed)
  updatePersistentUI(action, data);
}

// Update persistent UI (badge + notifications) - works even when popup is closed
function updatePersistentUI(action, data) {
  // Update badge based on workflow state
  if (workflowState.isRunning && !workflowState.isPaused) {
    const remaining = workflowState.totalTasks - workflowState.completedTasks;
    if (remaining > 0) {
      // Show remaining tasks on badge
      chrome.action.setBadgeText({ text: remaining.toString() });
      chrome.action.setBadgeBackgroundColor({ color: '#06b6d4' }); // Cyan color
    } else {
      chrome.action.setBadgeText({ text: '✓' });
      chrome.action.setBadgeBackgroundColor({ color: '#10b981' }); // Green for completed
    }
  } else if (workflowState.isPaused) {
    chrome.action.setBadgeText({ text: '⏸' });
    chrome.action.setBadgeBackgroundColor({ color: '#f59e0b' }); // Orange for paused
  } else {
    // Not running - clear badge
    chrome.action.setBadgeText({ text: '' });
  }
  
  // Send notifications for important events
  if (action === 'log' && data.type) {
    const message = data.message || '';
    
    // Only notify for important events (not every log)
    const shouldNotify = 
      data.type === 'success' && (
        message.includes('Hoàn thành') || 
        message.includes('thành công') ||
        message.includes('tải về')
      ) ||
      data.type === 'error' && (
        message.includes('Lỗi') ||
        message.includes('Error') ||
        message.includes('thất bại')
      ) ||
      data.type === 'status' ||
      (action === 'updateProgress' && workflowState.completedTasks > 0 && 
       workflowState.completedTasks % 5 === 0); // Notify every 5 completed tasks
    
    if (shouldNotify) {
      sendNotification(data.type, message);
    }
  } else if (action === 'updateProgress') {
    // Notify progress milestones
    const percent = Math.round((workflowState.completedTasks / workflowState.totalTasks) * 100);
    if (percent > 0 && (percent % 25 === 0 || percent === 100)) {
      // Notify at 25%, 50%, 75%, 100%
      sendNotification('info', `Tiến trình: ${workflowState.completedTasks}/${workflowState.totalTasks} (${percent}%)`);
    }
  } else if (action === 'status') {
    // Always notify status changes
    sendNotification(data.type || 'info', data.message || '');
  }
}

// Send Chrome notification
function sendNotification(type, message) {
  // Map log types to notification icons
  const iconMap = {
    'success': 'icons/icon48.png',
    'error': 'icons/icon48.png',
    'warning': 'icons/icon48.png',
    'info': 'icons/icon48.png'
  };
  
  const title = 'Auto Flow Veo';
  const iconUrl = iconMap[type] || 'icons/icon48.png';
  
  // Truncate message if too long
  const notificationMessage = message.length > 100 
    ? message.substring(0, 97) + '...' 
    : message;
  
  chrome.notifications.create({
    type: 'basic',
    iconUrl: iconUrl,
    title: title,
    message: notificationMessage,
    priority: type === 'error' ? 2 : (type === 'success' ? 1 : 0)
  }, (notificationId) => {
    if (chrome.runtime.lastError) {
      console.log('Notification error:', chrome.runtime.lastError.message);
    } else {
      // Auto-close notification after 5 seconds (except errors)
      if (type !== 'error') {
        setTimeout(() => {
          chrome.notifications.clear(notificationId);
        }, 5000);
      }
    }
  });
}

function logToPopup(type, message) {
  notifyPopup('log', { type: type, message: message });
}

function handleDownloadMedia(url, filename, promptIndex) {
  try {
    chrome.downloads.download({
      url: url,
      filename: filename,
      saveAs: false // Auto save to Downloads folder
    }, (downloadId) => {
      if (chrome.runtime.lastError) {
        logToPopup('error', `Download failed: ${chrome.runtime.lastError.message}`);
        notifyPopup('log', { 
          type: 'error', 
          message: `Lỗi download: ${chrome.runtime.lastError.message}` 
        });
      } else {
        logToPopup('success', `Đã bắt đầu download: ${filename}`);
        notifyPopup('log', { 
          type: 'success', 
          message: `Đang tải về: ${filename}` 
        });
        
        // Track download ID for completion notification
        if (downloadId) {
          // Store download info for tracking
          if (!workflowState.downloads) {
            workflowState.downloads = {};
          }
          workflowState.downloads[downloadId] = {
            filename: filename,
            promptIndex: promptIndex,
            startTime: Date.now()
          };
        }
      }
    });
  } catch (error) {
    logToPopup('error', `Download error: ${error.message}`);
    notifyPopup('log', { 
      type: 'error', 
      message: `Lỗi khi download: ${error.message}` 
    });
  }
}

// Listen for download completion
chrome.downloads.onChanged.addListener((downloadDelta) => {
  if (downloadDelta.state && downloadDelta.state.current === 'complete') {
    const downloadId = downloadDelta.id;
    
    // Get download info if tracked
    if (workflowState.downloads && workflowState.downloads[downloadId]) {
      const downloadInfo = workflowState.downloads[downloadId];
      const duration = Math.round((Date.now() - downloadInfo.startTime) / 1000);
      
      notifyPopup('log', { 
        type: 'success', 
        message: `✓ Đã tải về thành công: ${downloadInfo.filename} (${duration}s)` 
      });
      
      // Clean up
      delete workflowState.downloads[downloadId];
    } else {
      // Generic notification if not tracked
      notifyPopup('log', { type: 'success', message: '✓ Đã tải về thành công' });
    }
  } else if (downloadDelta.state && downloadDelta.state.current === 'interrupted') {
    notifyPopup('log', { 
      type: 'error', 
      message: '⚠ Download bị gián đoạn' 
    });
  }
});
