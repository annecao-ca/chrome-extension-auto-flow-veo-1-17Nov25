// Constants - Centralized configuration
// Version: 1.0.1

// Delays (milliseconds)
const DELAYS = {
  MINIMAL: 100,        // Minimal wait (e.g., after focus)
  SHORT: 250,          // Short wait (e.g., after button click)
  MEDIUM: 500,         // Medium wait (e.g., after form submission)
  LONG: 1000,          // Long wait (e.g., for API response)
  PAGE_LOAD: 400,      // Wait for React/Vue components to render
  VERIFY: 150,         // Wait to verify actions
  RETRY: 200,          // Wait before retry
  SCROLL: 250          // Wait after scroll
};

// Timeouts (milliseconds)
const TIMEOUTS = {
  ELEMENT_WAIT: 10000,      // Wait for element to appear
  RETRY_WAIT: 5000,         // Wait before retry after error
  COMPLETION_MONITOR: 300000 // 5 minutes max for completion
};

// Retry configurations
const RETRY_CONFIG = {
  MAX_RETRIES: 3,
  VERIFY_ATTEMPTS: 3,
  FILL_INPUT_RETRIES: 5,
  EXPONENTIAL_BACKOFF: [2000, 4000, 8000, 16000] // for network requests
};

// Debug mode (set to false for production)
const DEBUG_MODE = false;

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { DELAYS, TIMEOUTS, RETRY_CONFIG, DEBUG_MODE };
}
