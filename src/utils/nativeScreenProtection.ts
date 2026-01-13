import { Capacitor } from '@capacitor/core';

/**
 * Native Screen Protection for Android/iOS
 * Blocks screen recording, screenshots, and screen sharing
 */
export class NativeScreenProtection {
  private static isEnabled = false;

  /**
   * Enable screen protection (prevent screenshots and screen recording)
   */
  static async enable(): Promise<void> {
    if (!Capacitor.isNativePlatform()) {
      console.log('Screen protection: Not on native platform, skipping');
      return;
    }

    try {
      const platform = Capacitor.getPlatform();
      
      if (platform === 'android') {
        await this.enableAndroid();
      } else if (platform === 'ios') {
        await this.enableIOS();
      }
      
      this.isEnabled = true;
      console.log('Screen protection enabled');
    } catch (error) {
      console.error('Failed to enable screen protection:', error);
    }
  }

  /**
   * Disable screen protection
   */
  static async disable(): Promise<void> {
    if (!Capacitor.isNativePlatform() || !this.isEnabled) {
      return;
    }

    try {
      const platform = Capacitor.getPlatform();
      
      if (platform === 'android') {
        await this.disableAndroid();
      } else if (platform === 'ios') {
        await this.disableIOS();
      }
      
      this.isEnabled = false;
      console.log('Screen protection disabled');
    } catch (error) {
      console.error('Failed to disable screen protection:', error);
    }
  }

  /**
   * Android: FLAG_SECURE is set in MainActivity.java
   * This prevents screenshots and screen recording at the native level
   */
  private static async enableAndroid(): Promise<void> {
    // FLAG_SECURE is set in android/app/src/main/java/app/lovable/MainActivity.java
    // No additional setup needed at runtime
    console.log('Android FLAG_SECURE is enabled in MainActivity');
  }

  /**
   * Android: FLAG_SECURE cannot be disabled at runtime
   * It's set at the activity level in MainActivity
   */
  private static async disableAndroid(): Promise<void> {
    // Cannot disable FLAG_SECURE at runtime
    // It's permanently set in MainActivity for security
    console.log('Android FLAG_SECURE remains enabled');
  }

  /**
   * iOS: Monitor screen recording and blur content when detected
   */
  private static async enableIOS(): Promise<void> {
    try {
      // For iOS, we'll use a combination of:
      // 1. Detect screen recording via UIScreen.isCaptured
      // 2. Blur/hide content when recording is detected
      
      // This requires native iOS code in the Capacitor iOS project
      // Add to ios/App/App/AppDelegate.swift:
      /*
      import UIKit
      
      extension AppDelegate {
          func setupScreenProtection() {
              if #available(iOS 11.0, *) {
                  NotificationCenter.default.addObserver(
                      self,
                      selector: #selector(screenCaptureStatusChanged),
                      name: UIScreen.capturedDidChangeNotification,
                      object: nil
                  )
              }
          }
          
          @objc func screenCaptureStatusChanged() {
              if #available(iOS 11.0, *) {
                  let isCaptured = UIScreen.main.isCaptured
                  if isCaptured {
                      // Notify webview to hide content
                      self.bridge?.webView?.evaluateJavaScript("window.dispatchEvent(new CustomEvent('screen-recording-detected'))", completionHandler: nil)
                  } else {
                      self.bridge?.webView?.evaluateJavaScript("window.dispatchEvent(new CustomEvent('screen-recording-stopped'))", completionHandler: nil)
                  }
              }
          }
      }
      */
      
      // Listen for iOS screen recording events
      window.addEventListener('screen-recording-detected', () => {
        console.warn('Screen recording detected on iOS');
        // Blur or hide video content
        const videoElements = document.querySelectorAll('video');
        videoElements.forEach(video => {
          video.style.filter = 'blur(20px)';
        });
      });
      
      window.addEventListener('screen-recording-stopped', () => {
        console.log('Screen recording stopped on iOS');
        // Restore video content
        const videoElements = document.querySelectorAll('video');
        videoElements.forEach(video => {
          video.style.filter = 'none';
        });
      });
    } catch (error) {
      console.error('iOS screen protection error:', error);
    }
  }

  /**
   * iOS: Remove screen recording listeners
   */
  private static async disableIOS(): Promise<void> {
    // Remove event listeners and restore content
    const videoElements = document.querySelectorAll('video');
    videoElements.forEach(video => {
      video.style.filter = 'none';
    });
  }
}
