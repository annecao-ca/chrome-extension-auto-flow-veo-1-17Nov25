// Script để tìm video thực sự được tạo (không phải banner)
// Chạy script này trong Console của trang project detail

console.log('=== Tìm Video Thực Sự ===');

// 1. Tìm tất cả video elements
const allVideos = Array.from(document.querySelectorAll('video'));
console.log(`Tổng số video: ${allVideos.length}`);

// 2. Filter ra banner videos
const realVideos = allVideos.filter(video => {
  const src = video.src || video.currentSrc || video.getAttribute('src') || '';
  const srcLower = src.toLowerCase();
  
  // Skip banner
  if (srcLower.includes('banner') || 
      srcLower.includes('background') || 
      srcLower.includes('flow31_bg') ||
      srcLower.includes('header')) {
    return false;
  }
  
  // Check size (banner thường nhỏ)
  if (video.offsetWidth < 500 && video.offsetHeight < 300) {
    return false;
  }
  
  // Check if in project container
  let parent = video.parentElement;
  let isInProject = false;
  for (let i = 0; i < 10 && parent; i++) {
    const className = (parent.className || '').toLowerCase();
    const id = (parent.id || '').toLowerCase();
    if (className.includes('project') ||
        className.includes('result') ||
        className.includes('output') ||
        className.includes('media') ||
        id.includes('project') ||
        id.includes('result')) {
      isInProject = true;
      break;
    }
    parent = parent.parentElement;
  }
  
  return isInProject || video.offsetWidth > 500;
});

console.log(`Video thực sự (sau filter): ${realVideos.length}`);

// 3. Log thông tin video thực sự
realVideos.forEach((video, i) => {
  console.log(`\n--- Video ${i + 1} ---`);
  console.log('  src:', video.src);
  console.log('  currentSrc:', video.currentSrc);
  console.log('  size:', `${video.offsetWidth}x${video.offsetHeight}`);
  console.log('  duration:', video.duration);
  console.log('  readyState:', video.readyState);
  
  // Check parent containers
  let parent = video.parentElement;
  console.log('  Parent containers:');
  for (let j = 0; j < 5 && parent; j++) {
    console.log(`    Level ${j}:`, parent.className, parent.id);
    parent = parent.parentElement;
  }
});

// 4. Tìm download buttons
console.log('\n=== Tìm Download Buttons ===');

// Tìm trong toàn bộ trang
const allButtons = Array.from(document.querySelectorAll('button, a, [role="button"]'));
console.log(`Tổng số buttons: ${allButtons.length}`);

const downloadButtons = allButtons.filter(btn => {
  const text = (btn.textContent || btn.getAttribute('aria-label') || btn.getAttribute('title') || '').toLowerCase();
  const hasDownloadIcon = btn.querySelector('svg[class*="download" i], svg[class*="arrow_down" i], svg[class*="save" i]');
  
  return text.includes('download') || 
         text.includes('tải') || 
         text.includes('save') || 
         text.includes('lưu') ||
         text.includes('export') ||
         text.includes('xuất') ||
         hasDownloadIcon;
});

console.log(`Download buttons tìm thấy: ${downloadButtons.length}`);

downloadButtons.forEach((btn, i) => {
  console.log(`\n--- Download Button ${i + 1} ---`);
  console.log('  text:', btn.textContent);
  console.log('  aria-label:', btn.getAttribute('aria-label'));
  console.log('  title:', btn.getAttribute('title'));
  console.log('  visible:', btn.offsetWidth > 0 && btn.offsetHeight > 0);
  console.log('  has icon:', !!btn.querySelector('svg'));
  
  // Check if near a video
  let parent = btn.parentElement;
  let nearVideo = false;
  for (let j = 0; j < 8 && parent; j++) {
    if (parent.querySelector('video')) {
      nearVideo = true;
      break;
    }
    parent = parent.parentElement;
  }
  console.log('  near video:', nearVideo);
});

// 5. Tìm buttons gần video thực sự
if (realVideos.length > 0) {
  console.log('\n=== Buttons Gần Video Thực Sự ===');
  const lastVideo = realVideos[realVideos.length - 1];
  let container = lastVideo.parentElement;
  
  for (let i = 0; i < 8 && container; i++) {
    const buttons = container.querySelectorAll('button, a, [role="button"]');
    console.log(`\nContainer level ${i} (${container.className || container.id}): ${buttons.length} buttons`);
    
    buttons.forEach(btn => {
      const text = (btn.textContent || btn.getAttribute('aria-label') || '').toLowerCase();
      console.log(`  - "${text.substring(0, 50)}" (visible: ${btn.offsetWidth > 0})`);
    });
    
    container = container.parentElement;
  }
}

console.log('\n=== Hoàn thành ===');

