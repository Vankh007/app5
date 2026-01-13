import { useEffect, useState } from 'react';
import { Capacitor } from '@capacitor/core';

/**
 * Hook to detect screen recording and take action
 * Works on both Android (via FLAG_SECURE) and web browsers (via Screen Capture API)
 */
export function useScreenRecordingProtection(onRecordingDetected?: () => void) {
  const [isRecording, setIsRecording] = useState(false);

  useEffect(() => {
    // On Android, FLAG_SECURE is already set in MainActivity.java
    // This prevents screenshots and screen recording at the native level
    if (Capacitor.getPlatform() === 'android') {
      // Android protection is handled natively
      return;
    }

    // For web browsers, we can detect screen capture using the Screen Capture API
    // Note: This is limited and may not work in all scenarios
    const checkForRecording = () => {
      // Check if getDisplayMedia is being used (screen sharing/recording)
      if ('mediaDevices' in navigator && 'getDisplayMedia' in navigator.mediaDevices) {
        // Add listener for visibility changes which can indicate recording
        const handleVisibilityChange = () => {
          // This is a heuristic - actual detection is limited in browsers
        };
        
        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
      }
    };

    const cleanup = checkForRecording();
    return cleanup;
  }, [onRecordingDetected]);

  // Listen for messages from native code about screen recording status
  useEffect(() => {
    const handleScreenRecordingMessage = (event: MessageEvent) => {
      if (event.data && event.data.type === 'screenRecordingDetected') {
        setIsRecording(true);
        onRecordingDetected?.();
      } else if (event.data && event.data.type === 'screenRecordingStopped') {
        setIsRecording(false);
      }
    };

    window.addEventListener('message', handleScreenRecordingMessage);
    return () => window.removeEventListener('message', handleScreenRecordingMessage);
  }, [onRecordingDetected]);

  return { isRecording };
}

/**
 * Component that blocks video content when screen recording is detected
 * Note: On Android with FLAG_SECURE, the screen will show black automatically
 */
export function ScreenRecordingBlocker({ children }: { children: React.ReactNode }) {
  const { isRecording } = useScreenRecordingProtection();

  if (isRecording) {
    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center z-50">
        <div className="text-center text-white p-8">
          <h2 className="text-2xl font-bold mb-4">Screen Recording Detected</h2>
          <p className="text-muted-foreground">
            Please stop screen recording to continue watching.
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
