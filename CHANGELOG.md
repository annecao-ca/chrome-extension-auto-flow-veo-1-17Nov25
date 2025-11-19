# Changelog

All notable changes to Auto Flow Veo Chrome Extension will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.0.1] - 2025-11-19

### 🔧 **Fixed**

#### Code Quality & Maintainability
- **Refactored content.js into modular structure**
  - Split 2,288-line monolithic file into 4 focused modules:
    - `content/dom-helpers.js` (225 lines) - DOM utility functions
    - `content/prompt-filler.js` (800 lines) - Prompt input logic
    - `content/monitor.js` (973 lines) - Completion monitoring
    - `content/main.js` (368 lines) - Main entry point
  - Improved code organization and maintainability
  - Easier to debug and test individual components

#### Constants & Configuration
- **Centralized configuration in constants.js**
  - Created `DELAYS` object for all timing values
  - Created `TIMEOUTS` object for timeout configurations
  - Created `RETRY_CONFIG` for retry strategies
  - Replaced ~50+ magic numbers throughout codebase
  - Added `DEBUG_MODE` flag for production/development switching

#### Error Handling
- **Enhanced error handling in background.js**
  - Added try-catch to `isFlowUrl()` function
  - Added type checking for URL parameter
  - Added error handling for `chrome.tabs.query()` calls
  - Improved error messages for better debugging

- **Fixed storage error handling in popup.js**
  - Added `chrome.runtime.lastError` checks in `loadSavedState()`
  - Added fallback for failed state loading
  - Wrapped state parsing in try-catch
  - App now gracefully handles storage quota exceeded

#### Security
- **Added Content Security Policy (CSP)**
  - Added CSP to manifest.json
  - Restricted script sources to 'self' only
  - Improved security against XSS attacks
  - Meets Chrome Web Store security requirements

#### Debug Mode
- **Wrapped all debug code in DEBUG_MODE checks**
  - 7+ console.log statements wrapped
  - Debug helper functions (`debugFindInputs`, `debugFindButtons`) only run when enabled
  - Reduces console noise in production
  - Easy to toggle for development

### 📝 **Changed**

#### Manifest
- **Updated manifest.json version to 1.0.1**
- **Updated content_scripts to load new modular structure**
  - Load order: constants.js → utils.js → dom-helpers.js → prompt-filler.js → monitor.js → main.js
- **Added content_security_policy**

#### Documentation
- Created detailed module documentation in `content/README.md`
- Created refactoring summary in `REFACTORING_SUMMARY.txt`
- Created this CHANGELOG.md

### 🎯 **Performance**

- Improved code splitting allows for better memory management
- Debug code can be disabled for production (slight performance gain)
- No functional changes - all existing features work as before

### 📦 **Files Added**

- `constants.js` - Centralized configuration
- `content/dom-helpers.js` - DOM utilities
- `content/prompt-filler.js` - Prompt filling logic
- `content/monitor.js` - Monitoring logic
- `content/main.js` - Main entry point
- `content/README.md` - Module documentation
- `REFACTORING_SUMMARY.txt` - Refactoring details
- `CHANGELOG.md` - This file

### ⚠️ **Deprecated**

- `content.js` (original file) - Will be removed in next version
  - **Action required**: Backup if needed, will be deleted after verification

---

## [1.0.0] - 2025-11-17

### ✨ **Initial Release**

#### Features
- Batch image/video creation automation for Google Flow/Veo3
- Import prompts from .txt files
- Support for both Image and Video generation
- Repeat prompts with configurable count
- Start from specific prompt index
- Character and scene consistency descriptions
- Random delay between prompts (anti-bot detection)
- Auto-download generated media
- Dual language support (Vietnamese/English)
- Real-time progress tracking
- Pause/Resume/Stop controls
- Smart 3-stage waiting logic
- Toast notifications
- Loading states
- Empty states
- Glassmorphism design system
- Futuristic theme with glow effects

#### Technical
- Chrome Extension Manifest V3
- Service Worker background script
- Content script automation
- Chrome Storage API integration
- Chrome Downloads API integration
- Chrome Notifications API integration

#### Design
- Modern glassmorphism UI
- Responsive layout
- Accessibility features
- Dark futuristic theme
- Custom animations and transitions

---

## 📋 **Version History**

- **1.0.1** (2025-11-19) - Code quality improvements, refactoring, security enhancements
- **1.0.0** (2025-11-17) - Initial release with core features

---

## 🔮 **Upcoming in Future Versions**

### Planned for v1.1.0
- [ ] TypeScript migration for type safety
- [ ] Unit tests for core functions
- [ ] Rate limiting to prevent API abuse
- [ ] Prompt templates library
- [ ] Export log to file feature
- [ ] Dark/Light mode toggle
- [ ] Keyboard shortcuts (Ctrl+Enter to start, etc.)
- [ ] CSS module refactoring

### Under Consideration
- [ ] Queue visualization
- [ ] Batch prompt editing UI
- [ ] Custom delay per prompt
- [ ] Integration with other AI image/video tools
- [ ] Prompt history and favorites
- [ ] Analytics dashboard

---

## 📞 **Support**

For issues, feature requests, or questions:
- GitHub Issues: [Report an issue](#)
- Documentation: See README.md
- Version: Check manifest.json

---

**Note**: This extension is for educational and productivity purposes. Always comply with Google Flow/Veo3 Terms of Service.