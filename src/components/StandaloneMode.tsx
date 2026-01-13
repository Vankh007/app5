import { useEffect, useState } from 'react';
import { AlertCircle, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

/**
 * StandaloneMode component that detects if app is running in standalone mode
 * (installed as PWA) and aggressively detects/blocks download extensions
 */
export const StandaloneMode = () => {
  const [isStandalone, setIsStandalone] = useState(false);
  const [extensionsDetected, setExtensionsDetected] = useState<string[]>([]);
  const [showWarning, setShowWarning] = useState(false);

  useEffect(() => {
    // Check if app is running in standalone mode
    const checkStandalone = () => {
      const isStandaloneMode = 
        window.matchMedia('(display-mode: standalone)').matches ||
        (window.navigator as any).standalone ||
        document.referrer.includes('android-app://');
      
      setIsStandalone(isStandaloneMode);

      if (isStandaloneMode) {
        // Add standalone class to body for specific styling
        document.body.classList.add('standalone-mode');
        
        // Prevent accidental back navigation
        window.history.pushState(null, '', window.location.href);
        window.addEventListener('popstate', preventBack);
        
        // Set app height to 100vh for true fullscreen
        document.documentElement.style.height = '100vh';
        document.body.style.height = '100vh';
        
        // Disable pull-to-refresh on mobile
        document.body.style.overscrollBehavior = 'none';

        // Aggressively detect download extensions in PWA mode
        detectDownloadExtensions();
      }
    };

    const detectDownloadExtensions = () => {
      const detectedExts: string[] = [];
      
      // Known download manager extension IDs
      const extensionChecks = [
        { id: 'ngpampappnmepgilojfohadhhmbhlaek', name: 'IDM Integration Module' },
        { id: 'fkofpocopfhkpflpjliikkenbbnpakob', name: 'IDM CC Module' },
        { id: 'npdkfjbmdjbdgplpehjgbkimgfnflinn', name: 'Urban VPN Proxy' },
        { id: 'lckmfbeahdgjppjbkjgbdmmhghnadaaj', name: 'Internet Download Manager' },
        { id: 'fkofpocopfhkpflpjliikkenbbnpakob', name: 'IDM Lite' },
      ];

      // Check each extension by trying to load a resource from it
      extensionChecks.forEach(({ id, name }) => {
        const img = new Image();
        img.onload = () => {
          detectedExts.push(name);
          setExtensionsDetected(prev => [...prev, name]);
          setShowWarning(true);
        };
        img.onerror = () => {
          // Extension not installed or blocked
        };
        img.src = `chrome-extension://${id}/icon.png`;
      });

      // Additional detection: Check for modified fetch/XMLHttpRequest
      const originalFetch = window.fetch;
      const fetchString = originalFetch.toString();
      if (fetchString.includes('[native code]') === false) {
        detectedExts.push('Download Manager (Modified Fetch)');
        setExtensionsDetected(prev => [...prev, 'Download Manager']);
        setShowWarning(true);
      }

      // Check for intercepted XMLHttpRequest
      const xhrString = XMLHttpRequest.toString();
      if (xhrString.includes('[native code]') === false) {
        detectedExts.push('Download Manager (Modified XHR)');
        setExtensionsDetected(prev => [...prev, 'Download Manager']);
        setShowWarning(true);
      }

      // Block video elements if extensions detected
      if (detectedExts.length > 0) {
        setTimeout(() => {
          blockVideoElements();
        }, 1000);
      }
    };

    const blockVideoElements = () => {
      // Find all video elements and add blocking overlay
      const videos = document.querySelectorAll('video');
      videos.forEach(video => {
        video.style.pointerEvents = 'none';
        video.pause();
      });
    };

    const preventBack = () => {
      window.history.pushState(null, '', window.location.href);
    };

    checkStandalone();

    return () => {
      window.removeEventListener('popstate', preventBack);
    };
  }, []);

  // Render warning overlay if extensions detected in PWA mode
  if (isStandalone && showWarning && extensionsDetected.length > 0) {
    return (
      <div className="fixed inset-0 bg-black/95 z-[9999] flex items-center justify-center p-4">
        <div className="bg-card border-2 border-destructive rounded-lg p-6 max-w-md w-full">
          <div className="flex items-start gap-4 mb-4">
            <AlertCircle className="w-8 h-8 text-destructive flex-shrink-0 mt-1" />
            <div>
              <h2 className="text-xl font-bold text-foreground mb-2">
                Download Extensions Detected
              </h2>
              <p className="text-muted-foreground mb-4">
                For content protection, please disable these browser extensions before using the app:
              </p>
              <ul className="list-disc list-inside space-y-1 mb-4 text-sm text-muted-foreground">
                {[...new Set(extensionsDetected)].map((ext, idx) => (
                  <li key={idx}>{ext}</li>
                ))}
              </ul>
              <p className="text-sm text-muted-foreground mb-4">
                To continue watching:
              </p>
              <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground mb-6">
                <li>Open your browser settings</li>
                <li>Go to Extensions</li>
                <li>Disable or remove download manager extensions</li>
                <li>Restart the app</li>
              </ol>
              <div className="flex gap-2">
                <Button 
                  onClick={() => window.location.reload()} 
                  className="flex-1"
                >
                  Reload App
                </Button>
                <Button 
                  onClick={() => setShowWarning(false)} 
                  variant="outline"
                  className="flex-1"
                >
                  Dismiss
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
};
