import { type BatchEnqueueResponse, type BatchFilesResponse, type FileMetadata } from '../types/upload';
import {
  parseError,
  sendFormDataWithProgress,
  type UploadRequestOptions,
} from '../utils/uploadHelpers';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export type { UploadRequestOptions };

// uploadSingleFile
export async function uploadSingleFile(
  file: File,
  options?: UploadRequestOptions,
): Promise<FileMetadata> {
  const formData = new FormData();
  formData.append('file', file);

  return sendFormDataWithProgress<FileMetadata>(
    `${BASE_URL}/upload/single`,
    formData,
    options,
  );
}

// uploadMultipleFiles
export async function uploadMultipleFiles(
  files: File[],
  options?: UploadRequestOptions,
): Promise<BatchEnqueueResponse> {
  const formData = new FormData();
  files.forEach((file) => {
    formData.append('files', file);
  });

  return sendFormDataWithProgress<BatchEnqueueResponse>(
    `${BASE_URL}/upload/multiple`,
    formData,
    options,
  );
}

// fetchAllFiles
export async function fetchAllFiles(): Promise<FileMetadata[]> {
  const res = await fetch(`${BASE_URL}/upload/files`);
  if (!res.ok) {
    throw new Error(await parseError(res));
  }
  return res.json();
}

// fetchFileById
export async function fetchFileById(id: string): Promise<FileMetadata> {
  const res = await fetch(`${BASE_URL}/upload/files/${id}`);
  if (!res.ok) {
    throw new Error(await parseError(res));
  }
  return res.json();
}

// fetchBatchFiles
export async function fetchBatchFiles(batchId: string): Promise<BatchFilesResponse> {
  const res = await fetch(`${BASE_URL}/upload/batch/${batchId}`);
  if (!res.ok) {
    throw new Error(await parseError(res));
  }
  return res.json();
}