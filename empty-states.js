/**
 * Empty States Utility
 * Hệ thống quản lý empty states cho extension
 */

// ============================================
// EMPTY STATE TYPES
// ============================================

const EMPTY_STATE_TYPES = {
  NO_PROMPTS: 'no-prompts',
  NO_RESULTS: 'no-results',
  NO_TAB: 'no-tab',
  NO_API_KEY: 'no-api-key',
  NO_NETWORK: 'no-network',
  NO_LOG: 'no-log',
  NO_PROGRESS: 'no-progress',
  ERROR: 'error',
  WARNING: 'warning',
  INFO: 'info'
};

// ============================================
// EMPTY STATE CONFIGURATIONS
// ============================================

const EMPTY_STATE_CONFIGS = {
  [EMPTY_STATE_TYPES.NO_PROMPTS]: {
    icon: '📝',
    title: 'Chưa có prompt nào',
    message: 'Nhập hoặc import danh sách prompt để bắt đầu tạo hình ảnh và video.',
    suggestions: [
      'Nhập prompt trực tiếp vào ô textarea',
      'Import từ file .txt (mỗi dòng một prompt)',
      'Dán danh sách prompt từ clipboard'
    ],
    actions: [
      { text: 'Import từ file', action: 'import' }
    ]
  },
  
  [EMPTY_STATE_TYPES.NO_RESULTS]: {
    icon: '🔍',
    title: 'Không tìm thấy kết quả',
    message: 'Không có kết quả nào phù hợp với bộ lọc của bạn.',
    suggestions: [
      'Thử mở rộng tiêu chí tìm kiếm',
      'Xóa một số bộ lọc',
      'Kiểm tra lại từ khóa tìm kiếm'
    ],
    actions: [
      { text: 'Xóa bộ lọc', action: 'clear-filters' }
    ]
  },
  
  [EMPTY_STATE_TYPES.NO_TAB]: {
    icon: '🌐',
    title: 'Không tìm thấy tab Google Flow/Veo3',
    message: 'Extension cần tab Google Flow/Veo3 đang mở để hoạt động.',
    suggestions: [
      'Mở trang https://flow.google.com trong tab mới',
      'Hoặc mở https://labs.google trong tab mới',
      'Đảm bảo tab đang active và không bị đóng'
    ],
    actions: [
      { text: 'Mở Google Flow', action: 'open-flow', href: 'https://flow.google.com' }
    ]
  },
  
  [EMPTY_STATE_TYPES.NO_API_KEY]: {
    icon: '🔑',
    title: 'Chưa thiết lập khóa API',
    message: 'Bạn cần thiết lập khóa API để sử dụng tính năng này.',
    suggestions: [
      'Lấy khóa API từ trang quản trị',
      'Nhập khóa API vào phần cài đặt',
      'Kiểm tra quyền truy cập của khóa API'
    ],
    actions: [
      { text: 'Đi đến cài đặt', action: 'open-settings' }
    ]
  },
  
  [EMPTY_STATE_TYPES.NO_NETWORK]: {
    icon: '📡',
    title: 'Không có kết nối mạng',
    message: 'Vui lòng kiểm tra kết nối internet của bạn.',
    suggestions: [
      'Kiểm tra kết nối WiFi hoặc dữ liệu di động',
      'Thử tải lại trang',
      'Kiểm tra firewall hoặc proxy settings'
    ],
    actions: [
      { text: 'Thử lại', action: 'retry' }
    ]
  },
  
  [EMPTY_STATE_TYPES.NO_LOG]: {
    icon: '📋',
    title: 'Chưa có log nào',
    message: 'Log sẽ hiển thị ở đây khi bạn bắt đầu xử lý prompts.',
    suggestions: [
      'Nhập prompt và nhấn "Bắt đầu" để xem log',
      'Log sẽ hiển thị tiến trình xử lý',
      'Có thể xóa log bằng nút "Xóa log"'
    ]
  },
  
  [EMPTY_STATE_TYPES.NO_PROGRESS]: {
    icon: '📊',
    title: 'Chưa có tiến trình',
    message: 'Tiến trình sẽ hiển thị khi bạn bắt đầu xử lý prompts.',
    suggestions: [
      'Nhập prompt và chọn loại (Image/Video)',
      'Nhấn "Bắt đầu" để xem tiến trình',
      'Tiến trình sẽ cập nhật theo thời gian thực'
    ]
  },
  
  [EMPTY_STATE_TYPES.ERROR]: {
    icon: '❌',
    title: 'Đã xảy ra lỗi',
    message: 'Có vấn đề xảy ra. Vui lòng thử lại.',
    variant: 'error'
  },
  
  [EMPTY_STATE_TYPES.WARNING]: {
    icon: '⚠️',
    title: 'Cảnh báo',
    message: 'Có điều gì đó cần chú ý.',
    variant: 'warning'
  },
  
  [EMPTY_STATE_TYPES.INFO]: {
    icon: 'ℹ️',
    title: 'Thông tin',
    message: 'Thông tin hữu ích cho bạn.',
    variant: 'info'
  }
};

// ============================================
// EMPTY STATE MANAGER
// ============================================

class EmptyStateManager {
  constructor() {
    this.activeStates = new Map();
  }

  /**
   * Hiển thị empty state
   * @param {HTMLElement} container - Container element
   * @param {string} type - Empty state type
   * @param {Object} options - Custom options
   * @returns {HTMLElement} Empty state element
   */
  show(container, type, options = {}) {
    if (!container) {
      console.warn('Empty state container not found');
      return null;
    }

    // Remove existing empty state if any
    this.hide(container);

    // Get config
    const config = { ...EMPTY_STATE_CONFIGS[type], ...options };
    if (!config) {
      console.warn(`Empty state config not found for type: ${type}`);
      return null;
    }

    // Create empty state element
    const emptyState = document.createElement('div');
    emptyState.className = `empty-state ${type} ${config.variant || ''} ${options.compact ? 'compact' : ''}`;
    emptyState.setAttribute('data-empty-type', type);

    // Icon
    const icon = document.createElement('div');
    icon.className = 'empty-state-icon';
    icon.textContent = config.icon || '📭';
    emptyState.appendChild(icon);

    // Title
    if (config.title) {
      const title = document.createElement('div');
      title.className = 'empty-state-title';
      title.textContent = config.title;
      emptyState.appendChild(title);
    }

    // Message
    if (config.message) {
      const message = document.createElement('div');
      message.className = 'empty-state-message';
      message.textContent = config.message;
      emptyState.appendChild(message);
    }

    // Suggestions
    if (config.suggestions && config.suggestions.length > 0) {
      const suggestion = document.createElement('div');
      suggestion.className = 'empty-state-suggestion';
      
      const suggestionTitle = document.createElement('div');
      suggestionTitle.className = 'empty-state-suggestion-title';
      suggestionTitle.textContent = 'Gợi ý:';
      suggestion.appendChild(suggestionTitle);

      const suggestionList = document.createElement('ul');
      suggestionList.className = 'empty-state-suggestion-list';
      config.suggestions.forEach(suggestionText => {
        const li = document.createElement('li');
        li.textContent = suggestionText;
        suggestionList.appendChild(li);
      });
      suggestion.appendChild(suggestionList);
      
      emptyState.appendChild(suggestion);
    }

    // Actions
    if (config.actions && config.actions.length > 0) {
      const actions = document.createElement('div');
      actions.className = `empty-state-actions ${options.horizontal ? 'horizontal' : ''}`;
      
      config.actions.forEach(actionConfig => {
        const button = document.createElement('button');
        button.className = 'btn btn-secondary';
        button.textContent = actionConfig.text;
        
        if (actionConfig.action) {
          button.addEventListener('click', () => {
            this.handleAction(actionConfig.action, actionConfig.href);
          });
        }
        
        actions.appendChild(button);
      });
      
      emptyState.appendChild(actions);
    }

    // Link (if provided)
    if (config.link) {
      const link = document.createElement('a');
      link.className = 'empty-state-link';
      link.href = config.link.href || '#';
      link.textContent = config.link.text;
      if (config.link.action) {
        link.addEventListener('click', (e) => {
          e.preventDefault();
          this.handleAction(config.link.action);
        });
      }
      emptyState.appendChild(link);
    }

    // Add to container
    container.appendChild(emptyState);
    
    // Store reference
    this.activeStates.set(container, emptyState);

    return emptyState;
  }

  /**
   * Ẩn empty state
   * @param {HTMLElement} container - Container element
   */
  hide(container) {
    if (!container) return;

    const existing = container.querySelector('.empty-state');
    if (existing) {
      existing.classList.add('fade-out');
      setTimeout(() => {
        if (existing.parentNode) {
          existing.parentNode.removeChild(existing);
        }
        this.activeStates.delete(container);
      }, 300);
    }
  }

  /**
   * Xử lý action từ empty state
   * @param {string} action - Action type
   * @param {string} href - Optional href
   */
  handleAction(action, href = null) {
    switch (action) {
      case 'import': {
        // Trigger file import
        const fileInput = document.getElementById('fileInput');
        if (fileInput) {
          fileInput.click();
        }
        break;
      }

      case 'open-flow':
        // Open Google Flow in new tab
        if (href) {
          chrome.tabs.create({ url: href });
        } else {
          chrome.tabs.create({ url: 'https://flow.google.com' });
        }
        break;

      case 'open-settings': {
        // Scroll to settings or open settings page
        const settingsSection = document.querySelector('.settings-section');
        if (settingsSection) {
          const toggleBtn = document.getElementById('toggleSettings');
          if (toggleBtn) {
            const isVisible = document.getElementById('settingsContent').style.display !== 'none';
            if (!isVisible) {
              toggleBtn.click();
            }
            settingsSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }
        break;
      }

      case 'clear-filters':
        // Clear filters (implement based on your app)
        if (typeof toastManager !== 'undefined') {
          toastManager.info('Đã xóa bộ lọc');
        }
        break;

      case 'retry':
        // Retry action
        window.location.reload();
        break;

      default:
        console.log('Unknown action:', action);
    }
  }

  /**
   * Kiểm tra và hiển thị empty state tự động
   * @param {HTMLElement} container - Container element
   * @param {Array} items - Items to check
   * @param {string} type - Empty state type if empty
   */
  checkAndShow(container, items, type) {
    if (!items || items.length === 0) {
      this.show(container, type);
    } else {
      this.hide(container);
    }
  }
}

// Global instance
const emptyStateManager = new EmptyStateManager();

// Export
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    emptyStateManager,
    EMPTY_STATE_TYPES,
    EMPTY_STATE_CONFIGS
  };
}

