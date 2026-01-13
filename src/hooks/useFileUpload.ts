import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

export type StorageLocation = 'storage1' | 'storage2';

interface UseFileUploadOptions {
  bucket: string;
  storage?: StorageLocation;
  onSuccess?: (url: string) => void;
  onError?: (error: Error) => void;
}

export const useFileUpload = ({ 
  bucket, 
  storage = 'storage1',
  onSuccess, 
  onError 
}: UseFileUploadOptions) => {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  const uploadFile = async (file: File): Promise<string | null> => {
    try {
      setUploading(true);
      setProgress(0);

      // Convert file to base64
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve, reject) => {
        reader.onload = () => {
          const base64 = reader.result as string;
          const base64Data = base64.split(',')[1];
          resolve(base64Data);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      const fileData = await base64Promise;

      // Generate unique filename
      const timestamp = Date.now();
      const randomString = Math.random().toString(36).substring(2, 15);
      const fileName = `${timestamp}-${randomString}-${file.name}`;

      // Call edge function to upload to iDrive E2
      const { data, error } = await supabase.functions.invoke('upload-to-idrive', {
        body: {
          fileName,
          fileData,
          bucket,
          contentType: file.type,
          storage,
        },
      });

      if (error) throw error;

      if (!data?.success) {
        throw new Error(data?.error || 'Upload failed');
      }

      setProgress(100);
      toast.success('File uploaded successfully');
      
      if (onSuccess) {
        onSuccess(data.url);
      }

      return data.url;
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to upload file');
      
      if (onError && error instanceof Error) {
        onError(error);
      }
      
      return null;
    } finally {
      setUploading(false);
      setProgress(0);
    }
  };

  return {
    uploadFile,
    uploading,
    progress,
  };
};
