import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Smartphone, Trash2 } from 'lucide-react';

interface DeviceSession {
  id: string;
  device_id: string;
  device_info: any;
  last_active: string;
}

interface DeviceLimitWarningProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  maxDevices: number;
  activeSessions: DeviceSession[];
  currentDeviceId: string;
  onSignOutDevice: (deviceId: string) => void;
  onSignOutAllDevices: () => void;
}

export const DeviceLimitWarning = ({
  open,
  onOpenChange,
  maxDevices,
  activeSessions,
  currentDeviceId,
  onSignOutDevice,
  onSignOutAllDevices
}: DeviceLimitWarningProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Smartphone className="h-5 w-5 text-destructive" />
            Device Limit Reached
          </DialogTitle>
          <DialogDescription>
            You've reached the maximum of {maxDevices} devices. Remove a device to continue watching.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 mt-4">
          {activeSessions.map((session) => (
            <div 
              key={session.id}
              className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
            >
              <div className="flex items-center gap-3">
                <Smartphone className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">
                    {session.device_info?.name || 'Unknown Device'}
                    {session.device_id === currentDeviceId && (
                      <span className="ml-2 text-xs text-primary">(This device)</span>
                    )}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Last active: {new Date(session.last_active).toLocaleDateString()}
                  </p>
                </div>
              </div>
              {session.device_id !== currentDeviceId && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-destructive hover:text-destructive"
                  onClick={() => onSignOutDevice(session.device_id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          ))}
        </div>

        <div className="flex gap-2 mt-4">
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            className="flex-1"
            onClick={onSignOutAllDevices}
          >
            Sign Out All
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
