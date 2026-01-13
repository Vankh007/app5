/**
 * PWA Ad Service
 * Note: AdMob is not available in PWA mode. This service provides stub functions
 * that can be used with web-based ad solutions (Google AdSense, etc.)
 */

/**
 * Initialize ads - no-op for PWA
 */
export async function initializeAdMob(): Promise<boolean> {
  console.log('[PWA Ads] Web-based ads should use AdSense or similar web solutions');
  return false;
}

/**
 * Load a rewarded ad - not available in PWA
 */
export async function loadRewardedAd(_adUnitId: string, _isTesting = false): Promise<boolean> {
  console.log('[PWA Ads] Rewarded ads are not available in PWA mode');
  return false;
}

/**
 * Show a rewarded ad - not available in PWA
 */
export async function showRewardedAd(): Promise<{ shown: boolean; rewarded: boolean; amount?: number }> {
  console.log('[PWA Ads] Rewarded ads are not available in PWA mode');
  return { shown: false, rewarded: false };
}

/**
 * Check if AdMob is initialized - always false for PWA
 */
export function isAdMobInitialized(): boolean {
  return false;
}

/**
 * Check if AdMob is available - always false for PWA
 */
export function isAdMobAvailable(): boolean {
  return false;
}

/**
 * Show a banner ad - not available in PWA
 */
export async function showBannerAd(
  _adUnitId: string,
  _isTesting = false,
  _position: 'top' | 'bottom' = 'top'
): Promise<boolean> {
  console.log('[PWA Ads] Native banner ads are not available in PWA mode. Use web ad slots instead.');
  return false;
}

/**
 * Hide the current banner ad - no-op for PWA
 */
export async function hideBannerAd(): Promise<boolean> {
  return false;
}

/**
 * Remove the banner ad completely - no-op for PWA
 */
export async function removeBannerAd(): Promise<boolean> {
  return false;
}

/**
 * Check if banner is currently showing - always false for PWA
 */
export function isBannerShowing(): boolean {
  return false;
}

/**
 * Load an interstitial ad - not available in PWA
 */
export async function loadInterstitialAd(_adUnitId: string, _isTesting = false): Promise<boolean> {
  console.log('[PWA Ads] Interstitial ads are not available in PWA mode');
  return false;
}

/**
 * Show an interstitial ad - not available in PWA
 */
export async function showInterstitialAd(): Promise<boolean> {
  console.log('[PWA Ads] Interstitial ads are not available in PWA mode');
  return false;
}

/**
 * Get the AdMob plugin - returns null for PWA
 */
export function getAdMobPlugin(): null {
  return null;
}
