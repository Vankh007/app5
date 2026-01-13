const { contextBridge } = require('electron');

// Expose minimal safe APIs to renderer
contextBridge.exposeInMainWorld('electronAPI', {
  isElectron: true,
  platform: process.platform,
});

// Override and block download-related functions in the renderer
window.addEventListener('DOMContentLoaded', () => {
  // Prevent context menu (right-click download)
  document.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    return false;
  });

  // Block keyboard shortcuts for downloads
  document.addEventListener('keydown', (e) => {
    // Block Ctrl+S, Ctrl+Shift+S (Save)
    if ((e.ctrlKey || e.metaKey) && (e.key === 's' || e.key === 'S')) {
      e.preventDefault();
      return false;
    }
    // Block F12 (DevTools in production)
    if (e.key === 'F12' && process.env.NODE_ENV !== 'development') {
      e.preventDefault();
      return false;
    }
  });
});
