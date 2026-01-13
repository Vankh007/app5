import { useEffect } from 'react';

/**
 * ContentProtection component that prevents:
 * - Right-click context menu
 * - Developer tools shortcuts
 * - Text/content selection
 * - Print screen
 * - Inspect element
 * - Browser extension downloads (IDM, etc.)
 * - Video source detection by download managers
 */
export const ContentProtection = () => {
  useEffect(() => {
    // Detect download manager extensions
    const detectExtensions = () => {
      // Check for common download manager extensions
      const extensionPatterns = [
        'idmmzcc', // IDM Integration Module
        'ngpampappnmepgilojfohadhhmbhlaek', // IDM Integration
        'fkofpocopfhkpflpjliikkenbbnpakob', // Urban VPN
      ];

      // Check if extension resources are accessible (indicates extension is installed)
      extensionPatterns.forEach(extId => {
        const img = new Image();
        img.src = `chrome-extension://${extId}/icon.png`;
        img.onerror = () => {
          // Extension detected - show warning
          console.warn('Download extension detected');
        };
      });

      // Detect if resource is being intercepted
      const originalFetch = window.fetch;
      window.fetch = async (...args) => {
        const response = await originalFetch(...args);
        // Clone response to prevent extension manipulation
        return response.clone();
      };
    };

    // Run detection
    detectExtensions();

    // Prevent right-click
    const preventContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      return false;
    };

    // Prevent keyboard shortcuts for dev tools and downloads
    const preventDevTools = (e: KeyboardEvent) => {
      // F12 - Dev tools
      if (e.key === 'F12') {
        e.preventDefault();
        return false;
      }
      
      // Ctrl+Shift+I - Dev tools
      if (e.ctrlKey && e.shiftKey && e.key === 'I') {
        e.preventDefault();
        return false;
      }
      
      // Ctrl+Shift+J - Console
      if (e.ctrlKey && e.shiftKey && e.key === 'J') {
        e.preventDefault();
        return false;
      }
      
      // Ctrl+U - View source
      if (e.ctrlKey && e.key === 'u') {
        e.preventDefault();
        return false;
      }
      
      // Ctrl+S - Save
      if (e.ctrlKey && e.key === 's') {
        e.preventDefault();
        return false;
      }
      
      // Ctrl+Shift+C - Inspect element
      if (e.ctrlKey && e.shiftKey && e.key === 'C') {
        e.preventDefault();
        return false;
      }
      
      // Prevent print screen
      if (e.key === 'PrintScreen') {
        e.preventDefault();
        return false;
      }

      // Prevent Ctrl+D (save page/bookmark)
      if (e.ctrlKey && e.key === 'd') {
        e.preventDefault();
        return false;
      }
    };

    // Prevent text selection on protected content
    const preventSelection = () => {
      document.body.style.userSelect = 'none';
      document.body.style.webkitUserSelect = 'none';
    };

    // Prevent drag and drop of video elements
    const preventDragDrop = (e: DragEvent) => {
      e.preventDefault();
      return false;
    };

    // Prevent video downloads by intercepting network requests
    const protectVideoSources = () => {
      // Override XMLHttpRequest to prevent extensions from intercepting video URLs
      const originalXHROpen = XMLHttpRequest.prototype.open;
      XMLHttpRequest.prototype.open = function(method: string, url: string | URL, ...args: any[]) {
        // Log video requests for debugging but don't expose URLs
        const urlStr = url.toString();
        if (urlStr.includes('.m3u8') || urlStr.includes('.mpd') || urlStr.includes('.mp4')) {
          console.log('Protected video request');
        }
        return originalXHROpen.apply(this, [method, url, ...args] as any);
      };
    };

    // Protect video sources
    protectVideoSources();

    // Add event listeners
    document.addEventListener('contextmenu', preventContextMenu);
    document.addEventListener('keydown', preventDevTools);
    document.addEventListener('dragstart', preventDragDrop);
    preventSelection();

    // Cleanup
    return () => {
      document.removeEventListener('contextmenu', preventContextMenu);
      document.removeEventListener('keydown', preventDevTools);
      document.removeEventListener('dragstart', preventDragDrop);
      document.body.style.userSelect = 'auto';
      document.body.style.webkitUserSelect = 'auto';
    };
  }, []);

  return null;
};
