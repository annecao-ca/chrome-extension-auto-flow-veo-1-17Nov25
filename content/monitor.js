// Monitor Module
// Functions for monitoring completion and downloading results

// Import dependencies (will be injected via main.js)
// - DELAYS, TIMEOUTS, RETRY_CONFIG, DEBUG_MODE from constants.js
// - isElementVisible, sleep from dom-helpers.js
// - logToPopup, currentType, initialMediaCount, initialMediaSrcs from main.js

async function monitorCompletion() {
  // Monitor for completion indicators
  // Optimized for faster detection
  
  // Different timeout for image vs video - give more time for actual generation
  const isVideo = currentType === 'video';
  const maxWaitTime = isVideo ? TIMEOUTS.COMPLETION_MONITOR : 180000; // 5 min for video, 3 min for image (realistic times)
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
        await sleep(DELAYS.MEDIUM);
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
        await sleep(DELAYS.MEDIUM);
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
        await sleep(DELAYS.MEDIUM);
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
        await sleep(DELAYS.LONG);
        logToPopup('success', 'Đã verify media thực sự! Đang thử tải về...');
        await triggerDownload();
        await sleep(DELAYS.LONG);
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
  await sleep(DELAYS.LONG);
  
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
  await sleep(DELAYS.LONG);
  
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
  await sleep(DELAYS.LONG);
  
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
          await sleep(DELAYS.MEDIUM);
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
              await sleep(DELAYS.MEDIUM);
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
                  await sleep(DELAYS.MEDIUM);
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
            await sleep(DELAYS.MEDIUM);
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


// Export functions
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { monitorCompletion, triggerDownload, fallbackDirectDownload };
}
