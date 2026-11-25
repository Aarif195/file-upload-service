import { useState } from 'react';
import { UploadDropzone } from './components/UploadDropzone';
import { uploadMultipleFiles, uploadSingleFile } from './services/uploadApi';
import type { BatchEnqueueResponse, FileMetadata } from './types/upload';

export function App() {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [singleResult, setSingleResult] = useState<FileMetadata | null>(null);
  const [batchResult, setBatchResult] = useState<BatchEnqueueResponse | null>(
    null,
  );

  const handleFilesAdded = (files: File[]) => {
    setError(null);
    setSelectedFiles((prev) => [...prev, ...files]);
  };

  const handleRemoveFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleClearFiles = () => {
    setSelectedFiles([]);
  };

  const handleUpload = async () => {
    if (!selectedFiles.length) return;
    setIsUploading(true);
    setError(null);
    setSingleResult(null);
    setBatchResult(null);

    try {
      if (selectedFiles.length === 1) {
        const res = await uploadSingleFile(selectedFiles[0]);
        setSingleResult(res);
      } else {
        const res = await uploadMultipleFiles(selectedFiles);
        setBatchResult(res);
      }
      setSelectedFiles([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <main className="mx-auto max-w-2xl space-y-6 p-6">
      <h1 className="text-xl font-bold text-slate-900">File Upload Service</h1>

      <UploadDropzone
        selectedFiles={selectedFiles}
        onFilesAdded={handleFilesAdded}
        onRemoveFile={handleRemoveFile}
        onClearFiles={handleClearFiles}
        disabled={isUploading}
      />

      {selectedFiles.length > 0 && (
        <button
          type="button"
          onClick={handleUpload}
          disabled={isUploading}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 cursor-pointer"
        >
          {isUploading
            ? 'Uploading...'
            : selectedFiles.length === 1
              ? 'Upload Single File'
              : `Enqueue Batch (${selectedFiles.length} files)`}
        </button>
      )}

      {error && (
        <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>
      )}

      {singleResult && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">
          Uploaded: {singleResult.originalName} ({singleResult.id})
        </div>
      )}

      {batchResult && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-900">
          Batch queued: {batchResult.batchId} ({batchResult.queuedJobs.length}{' '}
          jobs)
        </div>
      )}
    </main>
  );
}

export default App;