import { useState, useCallback, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Settings, Check, Volume2, Monitor, Subtitles, Moon, Gauge, SlidersHorizontal, ChevronRight, ChevronLeft } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';

interface VideoSettingsMenuProps {
  stableVolume: boolean;
  onStableVolumeChange: (enabled: boolean) => void;
  ambientMode?: boolean;
  onAmbientModeChange?: (enabled: boolean) => void;
  availableTextTracks: any[];
  currentTextTrack: string;
  onTextTrackChange: (language: string, role?: string) => void;
  sleepTimer: number;
  onSleepTimerChange: (minutes: number) => void;
  playbackSpeed: number;
  onPlaybackSpeedChange: (speed: number) => void;
  availableQualities: string[];
  currentQuality: string;
  autoQualityEnabled: boolean;
  onQualityChange: (quality: string) => void;
  onAutoQualityToggle: () => void;
  sourceType?: string;
  onOpenChange?: (isOpen: boolean) => void;
}

type MenuView = 'main' | 'subtitles' | 'sleepTimer' | 'playbackSpeed' | 'quality';

export const VideoSettingsMenu = ({
  stableVolume,
  onStableVolumeChange,
  ambientMode = false,
  onAmbientModeChange,
  availableTextTracks,
  currentTextTrack,
  onTextTrackChange,
  sleepTimer,
  onSleepTimerChange,
  playbackSpeed,
  onPlaybackSpeedChange,
  availableQualities,
  currentQuality,
  autoQualityEnabled,
  onQualityChange,
  onAutoQualityToggle,
  sourceType,
  onOpenChange
}: VideoSettingsMenuProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [currentView, setCurrentView] = useState<MenuView>('main');
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const closeTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  const speedOptions = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];
  const sleepOptions = [0, 15, 30, 45, 60, 90, 120];

  // Clean up timeout on unmount
  useEffect(() => {
    return () => {
      if (closeTimeoutRef.current) {
        clearTimeout(closeTimeoutRef.current);
      }
    };
  }, []);

  // Close menu when clicking/touching outside - improved for touch devices
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node;
      
      if (
        menuRef.current && 
        !menuRef.current.contains(target) &&
        buttonRef.current &&
        !buttonRef.current.contains(target)
      ) {
        setIsOpen(false);
        onOpenChange?.(false);
        if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
        closeTimeoutRef.current = setTimeout(() => setCurrentView('main'), 150);
      }
    };

    if (isOpen) {
      // Use capture phase for better touch handling
      document.addEventListener('mousedown', handleClickOutside, { capture: true });
      document.addEventListener('touchstart', handleClickOutside, { capture: true, passive: true });
      return () => {
        document.removeEventListener('mousedown', handleClickOutside, { capture: true });
        document.removeEventListener('touchstart', handleClickOutside, { capture: true });
      };
    }
  }, [isOpen, onOpenChange]);

  // Close on escape key
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        setIsOpen(false);
        onOpenChange?.(false);
        if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
        closeTimeoutRef.current = setTimeout(() => setCurrentView('main'), 150);
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onOpenChange]);

  const navigateToSubmenu = useCallback((view: MenuView) => {
    setCurrentView(view);
  }, []);

  const handleBack = useCallback(() => {
    setCurrentView('main');
  }, []);

  const toggleMenu = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Small delay for touch to prevent double-triggering
    const isTouchEvent = 'touches' in e;
    
    if (isTouchEvent) {
      // For touch events, use a small delay to prevent issues on iPad
      requestAnimationFrame(() => {
        setIsOpen(prev => {
          const newValue = !prev;
          onOpenChange?.(newValue);
          if (prev) {
            if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
            closeTimeoutRef.current = setTimeout(() => setCurrentView('main'), 150);
          }
          return newValue;
        });
      });
    } else {
      setIsOpen(prev => {
        const newValue = !prev;
        onOpenChange?.(newValue);
        if (prev) {
          if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
          closeTimeoutRef.current = setTimeout(() => setCurrentView('main'), 150);
        }
        return newValue;
      });
    }
  }, [onOpenChange]);

  const getQualityLabel = () => {
    if (autoQualityEnabled) {
      return `Auto (${currentQuality})`;
    }
    return currentQuality;
  };

  const getSpeedLabel = () => {
    return playbackSpeed === 1 ? 'Normal' : `${playbackSpeed}x`;
  };

  // Prevent event bubbling helper
  const stopPropagation = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const MenuItem = ({ 
    icon: Icon, 
    label, 
    value, 
    onClick, 
    hasSubmenu = false 
  }: { 
    icon: React.ComponentType<{ className?: string }>; 
    label: string; 
    value?: string; 
    onClick?: () => void;
    hasSubmenu?: boolean;
  }) => (
    <button
      onClick={(e) => {
        stopPropagation(e);
        onClick?.();
      }}
      onTouchEnd={(e) => {
        stopPropagation(e);
        onClick?.();
      }}
      className="w-full flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2.5 sm:py-3.5 hover:bg-white/10 active:bg-white/20 transition-colors text-left outline-none focus:bg-white/10 touch-manipulation select-none"
    >
      <Icon className="h-4 w-4 sm:h-5 sm:w-5 text-white/80 flex-shrink-0" />
      <span className="flex-1 text-xs sm:text-sm text-white truncate">{label}</span>
      {value && (
        <span className="text-xs sm:text-sm text-white/60 flex-shrink-0">{value}</span>
      )}
      {hasSubmenu && (
        <ChevronRight className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-white/60 flex-shrink-0" />
      )}
    </button>
  );

  const ToggleMenuItem = ({ 
    icon: Icon, 
    label, 
    checked, 
    onCheckedChange 
  }: { 
    icon: React.ComponentType<{ className?: string }>; 
    label: string; 
    checked: boolean; 
    onCheckedChange: (checked: boolean) => void;
  }) => (
    <div 
      className="w-full flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2.5 sm:py-3.5 hover:bg-white/10 transition-colors cursor-pointer touch-manipulation select-none"
      onClick={(e) => {
        stopPropagation(e);
        onCheckedChange(!checked);
      }}
      onTouchEnd={(e) => {
        stopPropagation(e);
        onCheckedChange(!checked);
      }}
    >
      <Icon className="h-4 w-4 sm:h-5 sm:w-5 text-white/80 flex-shrink-0" />
      <span className="flex-1 text-xs sm:text-sm text-white">{label}</span>
      <Switch 
        checked={checked} 
        onCheckedChange={onCheckedChange}
        onClick={stopPropagation}
        className="data-[state=checked]:bg-white data-[state=unchecked]:bg-white/30 pointer-events-none scale-90 sm:scale-100"
      />
    </div>
  );

  const SubMenuHeader = ({ title, onBack }: { title: string; onBack: () => void }) => (
    <button
      onClick={(e) => {
        stopPropagation(e);
        onBack();
      }}
      onTouchEnd={(e) => {
        stopPropagation(e);
        onBack();
      }}
      className="w-full flex items-center gap-2 px-3 sm:px-4 py-2.5 sm:py-3.5 border-b border-white/10 hover:bg-white/10 active:bg-white/20 transition-colors outline-none focus:bg-white/10 touch-manipulation select-none"
    >
      <ChevronLeft className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
      <span className="text-xs sm:text-sm font-medium text-white">{title}</span>
    </button>
  );

  const SubMenuItem = ({ 
    label, 
    isSelected, 
    onClick,
    badge
  }: { 
    label: string; 
    isSelected: boolean; 
    onClick: () => void;
    badge?: string;
  }) => (
    <button
      onClick={(e) => {
        stopPropagation(e);
        onClick();
      }}
      onTouchEnd={(e) => {
        stopPropagation(e);
        onClick();
      }}
      className={cn(
        "w-full flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2 sm:py-3 hover:bg-white/10 active:bg-white/20 transition-colors text-left outline-none focus:bg-white/10 touch-manipulation select-none",
        isSelected && "bg-white/5"
      )}
    >
      <div className="w-4 sm:w-5 flex justify-center flex-shrink-0">
        {isSelected && <Check className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-white" />}
      </div>
      <span className="flex-1 text-xs sm:text-sm text-white">{label}</span>
      {badge && (
        <span className="text-[10px] sm:text-xs bg-white/20 px-1 sm:px-1.5 py-0.5 rounded text-white/80">{badge}</span>
      )}
    </button>
  );

  const renderMainMenu = () => (
    <div className="py-1">
      <ToggleMenuItem
        icon={Volume2}
        label="Stable Volume"
        checked={stableVolume}
        onCheckedChange={onStableVolumeChange}
      />

      {onAmbientModeChange && (
        <ToggleMenuItem
          icon={Monitor}
          label="Ambient mode"
          checked={ambientMode}
          onCheckedChange={onAmbientModeChange}
        />
      )}

      {availableTextTracks.length > 0 && (
        <MenuItem
          icon={Subtitles}
          label={`Subtitles/CC (${availableTextTracks.length})`}
          value={currentTextTrack === 'off' ? 'Off' : currentTextTrack}
          onClick={() => navigateToSubmenu('subtitles')}
          hasSubmenu
        />
      )}

      <MenuItem
        icon={Moon}
        label="Sleep timer"
        value={sleepTimer === 0 ? 'Off' : `${sleepTimer}min`}
        onClick={() => navigateToSubmenu('sleepTimer')}
        hasSubmenu
      />

      <MenuItem
        icon={Gauge}
        label="Playback speed"
        value={getSpeedLabel()}
        onClick={() => navigateToSubmenu('playbackSpeed')}
        hasSubmenu
      />

      {availableQualities.length > 0 && (
        <MenuItem
          icon={SlidersHorizontal}
          label="Quality"
          value={getQualityLabel()}
          onClick={() => navigateToSubmenu('quality')}
          hasSubmenu
        />
      )}
    </div>
  );

  const renderSubtitlesMenu = () => (
    <div>
      <SubMenuHeader title="Subtitles/CC" onBack={handleBack} />
      <div className="py-1 max-h-[280px] overflow-y-auto overscroll-contain">
        <SubMenuItem
          label="Off"
          isSelected={currentTextTrack === 'off'}
          onClick={() => {
            onTextTrackChange('off');
            handleBack();
          }}
        />
        {availableTextTracks.map((track, idx) => (
          <SubMenuItem
            key={idx}
            label={track.language || `Track ${idx + 1}`}
            isSelected={currentTextTrack === track.language}
            onClick={() => {
              onTextTrackChange(track.language, track.role);
              handleBack();
            }}
          />
        ))}
      </div>
    </div>
  );

  const renderSleepTimerMenu = () => (
    <div>
      <SubMenuHeader title="Sleep timer" onBack={handleBack} />
      <div className="py-1">
        {sleepOptions.map((minutes) => (
          <SubMenuItem
            key={minutes}
            label={minutes === 0 ? 'Off' : `${minutes} minutes`}
            isSelected={sleepTimer === minutes}
            onClick={() => {
              onSleepTimerChange(minutes);
              handleBack();
            }}
          />
        ))}
      </div>
    </div>
  );

  const renderPlaybackSpeedMenu = () => (
    <div>
      <SubMenuHeader title="Playback speed" onBack={handleBack} />
      <div className="py-1 max-h-[280px] overflow-y-auto overscroll-contain">
        {speedOptions.map((speed) => (
          <SubMenuItem
            key={speed}
            label={speed === 1 ? 'Normal' : `${speed}x`}
            isSelected={playbackSpeed === speed}
            onClick={() => {
              onPlaybackSpeedChange(speed);
              handleBack();
            }}
          />
        ))}
      </div>
    </div>
  );

  const renderQualityMenu = () => (
    <div>
      <SubMenuHeader title="Quality" onBack={handleBack} />
      <div className="py-1 max-h-[280px] overflow-y-auto overscroll-contain">
        <SubMenuItem
          label="Auto"
          isSelected={autoQualityEnabled}
          onClick={() => {
            onAutoQualityToggle();
            handleBack();
          }}
          badge={autoQualityEnabled ? currentQuality : undefined}
        />
        {availableQualities.map((quality) => (
          <SubMenuItem
            key={quality}
            label={quality}
            isSelected={currentQuality === quality && !autoQualityEnabled}
            onClick={() => {
              onQualityChange(quality);
              handleBack();
            }}
            badge={quality.includes('1080') ? 'HD' : quality.includes('720') ? 'HD' : undefined}
          />
        ))}
      </div>
    </div>
  );

  const renderContent = () => {
    switch (currentView) {
      case 'subtitles':
        return renderSubtitlesMenu();
      case 'sleepTimer':
        return renderSleepTimerMenu();
      case 'playbackSpeed':
        return renderPlaybackSpeedMenu();
      case 'quality':
        return renderQualityMenu();
      default:
        return renderMainMenu();
    }
  };

  return (
    <div 
      className="relative pointer-events-auto" 
      onClick={stopPropagation} 
      onTouchStart={stopPropagation}
      onTouchEnd={stopPropagation}
      onMouseDown={stopPropagation}
    >
      <Button
        ref={buttonRef}
        variant="ghost"
        size="icon"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          toggleMenu(e);
        }}
        onTouchEnd={(e) => {
          // Prevent double-firing from both onClick and onTouchEnd
          e.preventDefault();
          e.stopPropagation();
          // Use slight delay to prevent touch ghost clicks on iPad
          setTimeout(() => {
            setIsOpen(prev => {
              const newValue = !prev;
              onOpenChange?.(newValue);
              if (prev) {
                if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
                closeTimeoutRef.current = setTimeout(() => setCurrentView('main'), 150);
              }
              return newValue;
            });
          }, 0);
        }}
        className={cn(
          "h-7 w-7 sm:h-9 sm:w-9 text-white hover:bg-white/10 hover:text-white active:bg-white/20 transition-colors touch-manipulation select-none",
          isOpen && "bg-white/10"
        )}
        style={{ 
          WebkitTapHighlightColor: 'transparent',
          WebkitTouchCallout: 'none',
          WebkitUserSelect: 'none'
        }}
      >
        <Settings className={cn("h-4 w-4 sm:h-5 sm:w-5 transition-transform duration-200 pointer-events-none", isOpen && "rotate-45")} />
      </Button>
      
      {/* Menu - Responsive width with full pointer events, landscape-aware positioning */}
      {isOpen && (
        <div
          ref={menuRef}
          className={cn(
            "absolute mb-2 bg-neutral-900 backdrop-blur-xl border border-white/20 rounded-lg sm:rounded-xl overflow-hidden shadow-2xl z-[9999] animate-in fade-in slide-in-from-bottom-2 duration-150 pointer-events-auto",
            // In landscape mode (wider screens), position from right edge with more width
            // In portrait, use standard bottom-right positioning
            "w-60 sm:w-72 max-h-[60vh] sm:max-h-[70vh]",
            // Ensure menu stays in viewport in landscape
            "bottom-full right-0",
            // For landscape iPad: ensure menu is fully visible
            "@supports (max-height: 100dvh) { max-h-[50dvh] }"
          )}
          onClick={stopPropagation}
          onTouchStart={stopPropagation}
          onTouchEnd={(e) => {
            stopPropagation(e);
            // Prevent any default touch end behavior
          }}
          onTouchMove={(e) => {
            e.stopPropagation();
            // Allow scrolling within the menu
          }}
          onMouseDown={stopPropagation}
          style={{ 
            WebkitTapHighlightColor: 'transparent',
            touchAction: 'pan-y',
            // Force GPU acceleration for smoother touch
            transform: 'translateZ(0)',
            WebkitOverflowScrolling: 'touch',
            overflowY: 'auto'
          }}
        >
          {renderContent()}
        </div>
      )}
    </div>
  );
};
