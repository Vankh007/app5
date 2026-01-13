import { useState, useEffect } from 'react';
import { useAuth } from './useAuth';

interface DeviceSession {
  id: string;
  device_id: string;
  device_info: any;
  last_active: string;
}

export const useDeviceSession = (effectiveDeviceLimit?: number) => {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<DeviceSession[]>([]);
  const [currentDeviceId, setCurrentDeviceId] = useState<string>('');
  const [canStream, setCanStream] = useState(true);
  const [maxDevices, setMaxDevices] = useState(effectiveDeviceLimit || 3);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Generate or retrieve device ID
    let deviceId = localStorage.getItem('device_id');
    if (!deviceId) {
      deviceId = `device_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      localStorage.setItem('device_id', deviceId);
    }
    setCurrentDeviceId(deviceId);
    setLoading(false);
  }, [user]);

  const signOutDevice = async (deviceId: string) => {
    setSessions(prev => prev.filter(s => s.device_id !== deviceId));
  };

  const signOutAllDevices = async () => {
    setSessions([]);
  };

  return {
    sessions,
    currentDeviceId,
    canStream,
    maxDevices,
    loading,
    signOutDevice,
    signOutAllDevices
  };
};
