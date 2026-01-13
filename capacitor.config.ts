import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.plexkhmerzoon',
  appName: 'Khmerzoon-Tv',
  webDir: 'dist',
  // Uses local dist folder - no server URL needed for production builds
  // For development/hot-reload, uncomment the server section below:
  // server: {
  //   url: 'https://khmerzoon.biz',
  //   cleartext: true,
  //   androidScheme: 'https'
  // },
  plugins: {
    ScreenOrientation: {
      // Allow orientation changes to be managed programmatically
    },
    StatusBar: {
      style: 'light',
      backgroundColor: '#00000000', // Fully transparent
      overlaysWebView: true // Content draws behind status bar
    },
    AdMob: {
      // AdMob settings are loaded from Supabase app_ad_settings
    },
    SplashScreen: {
      launchShowDuration: 2500,
      launchAutoHide: true,
      launchFadeOutDuration: 500,
      backgroundColor: '#000000',
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true
    },
    Browser: {
      // In-app browser for OAuth
    }
  },
  android: {
    allowMixedContent: true,
    backgroundColor: '#000000',
    // Edge-to-edge display enabled via StatusBar plugin
  },
  ios: {
    backgroundColor: '#000000',
    contentInset: 'automatic'
  }
};

export default config;
