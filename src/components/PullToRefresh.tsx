import { ReactNode } from 'react';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';
import { Loader2, RefreshCw } from 'lucide-react';

interface PullToRefreshProps {
  onRefresh: () => Promise<void>;
  children: ReactNode;
}

export const PullToRefresh = ({ onRefresh, children }: PullToRefreshProps) => {
  const { pullDistance, isRefreshing, isEnabled } = usePullToRefresh({ onRefresh });

  if (!isEnabled) {
    return <>{children}</>;
  }

  const rotation = Math.min((pullDistance / 100) * 360, 360);
  const opacity = Math.min(pullDistance / 80, 1);
  const scale = Math.min(0.5 + (pullDistance / 200), 1);
  const threshold = 100;
  const isReadyToRefresh = pullDistance >= threshold;

  return (
    <div className="relative">
      {/* Pull to refresh indicator */}
      <div
        className="fixed left-0 right-0 flex justify-center z-50 pointer-events-none transition-all duration-200"
        style={{
          top: 'calc(env(safe-area-inset-top, 0px) + 56px)',
          opacity: isRefreshing ? 1 : opacity,
          transform: `translateY(${isRefreshing ? 0 : Math.min(pullDistance * 0.4, 50)}px) scale(${isRefreshing ? 1 : scale})`,
        }}
      >
        <div className={`rounded-full p-3 shadow-lg border transition-colors duration-200 ${
          isReadyToRefresh || isRefreshing 
            ? 'bg-primary/10 border-primary/30' 
            : 'bg-background/90 border-border'
        } backdrop-blur-sm`}>
          {isRefreshing ? (
            <Loader2 className="w-5 h-5 text-primary animate-spin" />
          ) : (
            <RefreshCw
              className={`w-5 h-5 transition-colors duration-200 ${
                isReadyToRefresh ? 'text-primary' : 'text-muted-foreground'
              }`}
              style={{
                transform: `rotate(${rotation}deg)`,
                transition: 'transform 0.1s ease-out',
              }}
            />
          )}
        </div>
      </div>

      {/* Content */}
      <div
        style={{
          transform: isRefreshing ? 'none' : `translateY(${Math.min(pullDistance * 0.3, 30)}px)`,
          transition: isRefreshing || pullDistance === 0 ? 'transform 0.3s ease-out' : 'none',
        }}
      >
        {children}
      </div>
    </div>
  );
};
