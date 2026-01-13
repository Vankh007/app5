import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';

export type StorageLocation = 'storage1' | 'storage2';

interface StorageConfig {
  endpoint: string;
  region?: string;
  accessKeyId: string;
  secretAccessKey: string;
}

// Get storage configuration from environment variables
const getStorageConfig = (location: StorageLocation): StorageConfig => {
  if (location === 'storage1') {
    return {
      endpoint: `https://${import.meta.env.VITE_IDRIVE_E2_STORAGE1_ENDPOINT || 'i5e2.sg01.idrivee2-77.com'}`,
      accessKeyId: import.meta.env.VITE_IDRIVE_E2_STORAGE1_ACCESS_KEY || '',
      secretAccessKey: import.meta.env.VITE_IDRIVE_E2_STORAGE1_SECRET_KEY || '',
    };
  } else {
    return {
      endpoint: `https://${import.meta.env.VITE_IDRIVE_E2_STORAGE2_ENDPOINT || 's3.ap-southeast-1.idrivee2.com'}`,
      region: import.meta.env.VITE_IDRIVE_E2_STORAGE2_REGION || 'ap-southeast-1',
      accessKeyId: import.meta.env.VITE_IDRIVE_E2_STORAGE2_ACCESS_KEY || '',
      secretAccessKey: import.meta.env.VITE_IDRIVE_E2_STORAGE2_SECRET_KEY || '',
    };
  }
};

// Create S3 client for specified storage location
const createS3Client = (location: StorageLocation): S3Client => {
  const config = getStorageConfig(location);
  
  return new S3Client({
    endpoint: config.endpoint,
    region: config.region || 'us-east-1',
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
    forcePathStyle: true,
  });
};

export interface UploadOptions {
  bucket: string;
  key: string;
  file: File | Blob;
  location?: StorageLocation;
  contentType?: string;
  metadata?: Record<string, string>;
  onProgress?: (progress: number) => void;
}

export const uploadToStorage = async ({
  bucket,
  key,
  file,
  location = 'storage1',
  contentType,
  metadata,
  onProgress,
}: UploadOptions): Promise<{ url: string; key: string }> => {
  const client = createS3Client(location);
  const config = getStorageConfig(location);

  const upload = new Upload({
    client,
    params: {
      Bucket: bucket,
      Key: key,
      Body: file,
      ContentType: contentType || file.type,
      Metadata: metadata,
    },
  });

  if (onProgress) {
    upload.on('httpUploadProgress', (progress) => {
      const percentage = progress.loaded && progress.total 
        ? (progress.loaded / progress.total) * 100 
        : 0;
      onProgress(percentage);
    });
  }

  await upload.done();

  const url = `${config.endpoint}/${bucket}/${key}`;
  return { url, key };
};

export const deleteFromStorage = async (
  bucket: string,
  key: string,
  location: StorageLocation = 'storage1'
): Promise<void> => {
  const client = createS3Client(location);
  
  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
  });

  await client.send(command);
};

export const getPublicUrl = (
  bucket: string,
  key: string,
  location: StorageLocation = 'storage1'
): string => {
  const config = getStorageConfig(location);
  return `${config.endpoint}/${bucket}/${key}`;
};
