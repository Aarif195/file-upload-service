import { type BatchEnqueueResponse, type BatchFilesResponse, type FileMetadata } from '../types/upload';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

async function parseError(res: Response): Promise<string> {
  try {
    const data = await res.json();
    return data?.message || `Request failed (${res.status})`;
  } catch {
    return `Request failed (${res.status})`;
  }
}

// uploadSingleFile
export async function uploadSingleFile(file: File): Promise<FileMetadata> {
  const formData = new FormData();
  formData.append('file', file);

  const res = await fetch(`${BASE_URL}/upload/single`, {
    method: 'POST',
    body: formData,
  });

  if (!res.ok) {
    throw new Error(await parseError(res));
  }

  return res.json();
}

// uploadMultipleFiles
export async function uploadMultipleFiles(
  files: File[],
): Promise<BatchEnqueueResponse> {
  const formData = new FormData();
  files.forEach((file) => {
    formData.append('files', file);
  });

  const res = await fetch(`${BASE_URL}/upload/multiple`, {
    method: 'POST',
    body: formData,
  });

  if (!res.ok) {
    throw new Error(await parseError(res));
  }

  return res.json();
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