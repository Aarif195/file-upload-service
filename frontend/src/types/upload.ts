export interface FileMetadata {
  id: string;
  originalName: string;
  filename: string;
  mimetype: string;
  size: number;
  url: string;
  publicId: string;
  folderPath: string;
  batchId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface BatchQueuedJob {
  jobId: string;
  name: string;
}

export interface BatchEnqueueResponse {
  message: string;
  batchId: string;
  queuedJobs: BatchQueuedJob[];
}

export interface BatchFilesResponse {
  message: string;
  batchId: string;
  count: number;
  data: FileMetadata[];
}