import React from 'react';
import { useSiteSettings } from '@/contexts/SiteSettingsContext';
import { useTheme } from '@/contexts/ThemeContext';
import { Button } from '@/components/ui/button';
import { Copy } from 'lucide-react';
import QRCode from 'react-qr-code';
import { toast } from 'sonner';
import { useIsMobile } from '@/hooks/use-mobile';
import { useIsTablet } from '@/hooks/use-tablet';
import { useIsTabletLandscape } from '@/hooks/use-tablet-landscape';

interface AppLockOverlayProps {
  type: 'mobile_only' | 'web_only';
  contentBackdrop?: string;
}

const AppLockOverlay: React.FC<AppLockOverlayProps> = ({ type, contentBackdrop }) => {
  const { settings, logos } = useSiteSettings();
  const { theme } = useTheme();
  const isMobile = useIsMobile();
  const isTablet = useIsTablet();
  const isTabletLandscape = useIsTabletLandscape();

  const qrUrl = type === 'mobile_only'
    ? (settings.mobile_qr_url || settings.play_store_url || settings.app_store_url || '')
    : (settings.web_browser_qr_url || window.location.href);

  const currentLogo = theme === 'dark' ? logos.dark_logo : logos.light_logo;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(qrUrl);
    toast.success('Link copied to clipboard!');
  };

  const lockMessage = type === 'mobile_only'
    ? 'Scan QR code to preview the app on your mobile device.'
    : 'Scan QR code to open this content in your web browser.';

  const lockSubMessage = type === 'mobile_only'
    ? "You'll need our mobile app for iOS or Android."
    : 'This content is only available on the web browser.';

  // Get scale based on device - landscape iPad uses smaller scale for better fit
  const getContentScale = () => {
    if (isTabletLandscape) return 0.6; // 40% smaller for landscape iPad
    if (isTablet) return 0.7; // 30% smaller for portrait tablet
    return 1.1; // 10% bigger for desktop
  };

  // Mobile layout - vertical centered
  if (isMobile) {
    return (
      <div 
        className="absolute inset-0 flex items-center justify-center z-[55] animate-fade-in"
        style={{
          backgroundImage: contentBackdrop ? `url(${contentBackdrop})` : 'none',
          backgroundSize: 'cover',
          backgroundPosition: 'center'
        }}
      >
        {/* Dark overlay */}
        <div className="absolute inset-0 bg-black/90" />
        
        {/* Content container - Mobile vertical layout */}
        <div className="relative z-10 flex flex-col items-center gap-5 p-4 w-full max-w-sm mx-auto animate-scale-in">
          
          {/* Logo and Site Name */}
          <div className="flex items-center gap-3">
            {currentLogo ? (
              <img 
                src={currentLogo} 
                alt={settings.site_title}
                className="w-14 h-14 object-contain rounded-lg bg-white/10 p-1.5"
              />
            ) : (
              <div className="w-14 h-14 rounded-lg bg-white/10 flex items-center justify-center">
                <span className="text-xl font-bold text-white">
                  {settings.site_title?.charAt(0) || 'A'}
                </span>
              </div>
            )}
            <h2 className="text-xl font-bold text-white">
              {settings.site_title || 'App'}
            </h2>
          </div>
          
          {/* Lock Details */}
          <div className="text-center space-y-1">
            <p className="text-white/90 text-sm">
              {lockMessage}
            </p>
            <p className="text-white/60 text-xs">
              {lockSubMessage}
            </p>
          </div>
          
          {/* Action Buttons */}
          <div className="flex flex-col gap-2 w-full">
            {type === 'mobile_only' ? (
              <>
                {settings.play_store_url && (
                  <Button 
                    className="w-full gap-2 bg-black hover:bg-gray-900 text-white border border-white/30 h-11 text-sm font-semibold"
                    onClick={() => window.open(settings.play_store_url, '_blank')}
                  >
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M3,20.5V3.5C3,2.91 3.34,2.39 3.84,2.15L13.69,12L3.84,21.85C3.34,21.6 3,21.09 3,20.5M16.81,15.12L6.05,21.34L14.54,12.85L16.81,15.12M20.16,10.81C20.5,11.08 20.75,11.5 20.75,12C20.75,12.5 20.53,12.9 20.18,13.18L17.89,14.5L15.39,12L17.89,9.5L20.16,10.81M6.05,2.66L16.81,8.88L14.54,11.15L6.05,2.66Z" />
                    </svg>
                    Play Store
                  </Button>
                )}
                {settings.app_store_url && (
                  <Button 
                    className="w-full gap-2 bg-black hover:bg-gray-900 text-white border border-white/30 h-11 text-sm font-semibold"
                    onClick={() => window.open(settings.app_store_url, '_blank')}
                  >
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M18.71,19.5C17.88,20.74 17,21.95 15.66,21.97C14.32,22 13.89,21.18 12.37,21.18C10.84,21.18 10.37,21.95 9.1,22C7.79,22.05 6.8,20.68 5.96,19.47C4.25,17 2.94,12.45 4.7,9.39C5.57,7.87 7.13,6.91 8.82,6.88C10.1,6.86 11.32,7.75 12.11,7.75C12.89,7.75 14.37,6.68 15.92,6.84C16.57,6.87 18.39,7.1 19.56,8.82C19.47,8.88 17.39,10.1 17.41,12.63C17.44,15.65 20.06,16.66 20.09,16.67C20.06,16.74 19.67,18.11 18.71,19.5M13,3.5C13.73,2.67 14.94,2.04 15.94,2C16.07,3.17 15.6,4.35 14.9,5.19C14.21,6.04 13.07,6.7 11.95,6.61C11.8,5.46 12.36,4.26 13,3.5Z" />
                    </svg>
                    App Store
                  </Button>
                )}
              </>
            ) : (
              <Button 
                className="w-full gap-2 bg-black hover:bg-gray-900 text-white border border-white/30 h-11 text-sm font-semibold"
                onClick={handleCopyLink}
              >
                <Copy className="w-4 h-4" />
                Copy link
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Desktop/Tablet layout - horizontal with QR code
  return (
    <div 
      className="absolute inset-0 flex items-center justify-center z-[55] animate-fade-in"
      style={{
        backgroundImage: contentBackdrop ? `url(${contentBackdrop})` : 'none',
        backgroundSize: 'cover',
        backgroundPosition: 'center'
      }}
    >
      {/* Dark overlay */}
      <div className="absolute inset-0 bg-black/90" />
      
      {/* Content container - Desktop/Tablet layout with dynamic scaling */}
      <div 
        className="relative z-10 flex flex-row items-center gap-12 p-6 max-w-4xl mx-auto animate-scale-in"
        style={{ 
          transform: `scale(${getContentScale()})`,
          transformOrigin: 'center center'
        }}
      >
        
        {/* Left side - Logo, Details, Buttons */}
        <div className="flex flex-col items-start gap-6 text-left">
          
          {/* Logo and Site Name */}
          <div className="flex items-center gap-4">
            {currentLogo ? (
              <img 
                src={currentLogo} 
                alt={settings.site_title}
                className="w-24 h-24 object-contain rounded-xl bg-white/10 p-2"
              />
            ) : (
              <div className="w-24 h-24 rounded-xl bg-white/10 flex items-center justify-center">
                <span className="text-2xl font-bold text-white">
                  {settings.site_title?.charAt(0) || 'A'}
                </span>
              </div>
            )}
            <h2 className="text-3xl font-bold text-white">
              {settings.site_title || 'App'}
            </h2>
          </div>
          
          {/* Lock Details */}
          <div className="space-y-1 max-w-md">
            <p className="text-white/90 text-lg">
              {lockMessage}
            </p>
            <p className="text-white/60 text-base">
              {lockSubMessage}
            </p>
          </div>
          
          {/* Action Buttons */}
          <div className="flex flex-row gap-3 w-full max-w-md">
            {type === 'mobile_only' ? (
              <>
                {settings.play_store_url && (
                  <Button 
                    className="flex-1 gap-2 bg-black hover:bg-gray-900 text-white border border-white/30 h-12 text-sm font-semibold"
                    onClick={() => window.open(settings.play_store_url, '_blank')}
                  >
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M3,20.5V3.5C3,2.91 3.34,2.39 3.84,2.15L13.69,12L3.84,21.85C3.34,21.6 3,21.09 3,20.5M16.81,15.12L6.05,21.34L14.54,12.85L16.81,15.12M20.16,10.81C20.5,11.08 20.75,11.5 20.75,12C20.75,12.5 20.53,12.9 20.18,13.18L17.89,14.5L15.39,12L17.89,9.5L20.16,10.81M6.05,2.66L16.81,8.88L14.54,11.15L6.05,2.66Z" />
                    </svg>
                    Play Store
                  </Button>
                )}
                {settings.app_store_url && (
                  <Button 
                    className="flex-1 gap-2 bg-black hover:bg-gray-900 text-white border border-white/30 h-12 text-sm font-semibold"
                    onClick={() => window.open(settings.app_store_url, '_blank')}
                  >
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M18.71,19.5C17.88,20.74 17,21.95 15.66,21.97C14.32,22 13.89,21.18 12.37,21.18C10.84,21.18 10.37,21.95 9.1,22C7.79,22.05 6.8,20.68 5.96,19.47C4.25,17 2.94,12.45 4.7,9.39C5.57,7.87 7.13,6.91 8.82,6.88C10.1,6.86 11.32,7.75 12.11,7.75C12.89,7.75 14.37,6.68 15.92,6.84C16.57,6.87 18.39,7.1 19.56,8.82C19.47,8.88 17.39,10.1 17.41,12.63C17.44,15.65 20.06,16.66 20.09,16.67C20.06,16.74 19.67,18.11 18.71,19.5M13,3.5C13.73,2.67 14.94,2.04 15.94,2C16.07,3.17 15.6,4.35 14.9,5.19C14.21,6.04 13.07,6.7 11.95,6.61C11.8,5.46 12.36,4.26 13,3.5Z" />
                    </svg>
                    App Store
                  </Button>
                )}
              </>
            ) : (
              <Button 
                className="gap-2 bg-black hover:bg-gray-900 text-white border border-white/30 h-12 text-sm font-semibold px-6"
                onClick={handleCopyLink}
              >
                <Copy className="w-4 h-4" />
                Copy link
              </Button>
            )}
          </div>
        </div>
        
        {/* Right side - QR Code */}
        {qrUrl && (
          <div className="flex flex-col items-center gap-4">
            <div className="bg-[#1a1a1a] p-6 rounded-xl border border-white/10">
              <QRCode 
                value={qrUrl}
                size={180}
                level="M"
                bgColor="#1a1a1a"
                fgColor="#ffffff"
              />
            </div>
            <p className="text-white/60 text-sm">
              Scan with your phone camera
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AppLockOverlay;
