import { useMaintenanceMode } from '@/hooks/useMaintenanceMode';
import { Wrench, Clock } from 'lucide-react';

export default function MaintenancePage() {
  const { maintenanceMessage } = useMaintenanceMode();

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="max-w-lg w-full text-center space-y-8">
        {/* Animated Icon */}
        <div className="relative mx-auto w-24 h-24">
          <div className="absolute inset-0 bg-primary/20 rounded-full animate-ping" />
          <div className="relative flex items-center justify-center w-24 h-24 bg-primary/10 rounded-full border-2 border-primary/30">
            <Wrench className="w-12 h-12 text-primary animate-pulse" />
          </div>
        </div>

        {/* Title */}
        <div className="space-y-2">
          <h1 className="text-4xl font-bold text-foreground">
            Under Maintenance
          </h1>
          <p className="text-xl text-muted-foreground">
            We'll be back soon!
          </p>
        </div>

        {/* Message */}
        <div className="bg-card/50 backdrop-blur-sm rounded-xl p-6 border border-border">
          <p className="text-muted-foreground leading-relaxed">
            {maintenanceMessage || 'We are currently performing scheduled maintenance. Please check back soon.'}
          </p>
        </div>

        {/* Status indicator */}
        <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <Clock className="w-4 h-4" />
          <span>Scheduled maintenance in progress</span>
        </div>

        {/* Decorative elements */}
        <div className="flex justify-center gap-2">
          <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
          <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
          <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
        </div>
      </div>
    </div>
  );
}
