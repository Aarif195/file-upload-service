import { useRef, useState, type ChangeEvent, type DragEvent } from 'react';
import type { UploadItemStatus, UploadQueueItem } from '../types/upload';

// UploadDropzoneProps
interface UploadDropzoneProps {
  items: UploadQueueItem[];
  onFilesAdded: (files: File[]) => void;
  onRemoveItem: (id: string) => void;
  onCancelItem: (id: string) => void;
  onClearItems: () => void;
  isUploading?: boolean;
}

// formatBytes
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

// getTypeBadge
function getTypeBadge(mimetype: string): string {
  if (mimetype.startsWith('image/')) return 'IMG';
  if (mimetype === 'application/pdf') return 'PDF';
  if (mimetype.startsWith('video/')) return 'VID';
  if (mimetype.startsWith('audio/')) return 'AUD';
  return 'FILE';
}

function getStatusBadge(status: UploadItemStatus): {
  label: string;
  classes: string;
} {
  switch (status) {
    case 'pending':
      return { label: 'Pending', classes: 'bg-slate-100 text-slate-700' };
    case 'uploading':
      return { label: 'Uploading', classes: 'bg-blue-100 text-blue-700' };
    case 'success':
      return {
        label: 'Success',
        classes: 'bg-emerald-100 text-emerald-700',
      };
    case 'failed':
      return { label: 'Failed', classes: 'bg-red-100 text-red-700' };
    case 'cancelled':
      return { label: 'Cancelled', classes: 'bg-amber-100 text-amber-800' };
  }
}

export function UploadDropzone({
  items,
  onFilesAdded,
  onRemoveItem,
  onCancelItem,
  onClearItems,
  isUploading = false,
}: UploadDropzoneProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.length) {
      onFilesAdded(Array.from(e.target.files));
      e.target.value = '';
    }
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (!isUploading) setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (isUploading) return;
    if (e.dataTransfer.files?.length) {
      onFilesAdded(Array.from(e.dataTransfer.files));
    }
  };

  return (
    <div className="space-y-4">
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`rounded-xl border-2 border-dashed p-6 text-center transition ${
          isDragging
            ? 'border-blue-500 bg-blue-50'
            : 'border-slate-300 bg-slate-50 hover:border-slate-400'
        } ${isUploading ? 'pointer-events-none opacity-60' : ''}`}
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          onChange={handleInputChange}
          className="hidden"
        />

        <p className="text-sm font-medium text-slate-700">
          Drag and drop files here, or browse from your device
        </p>
        <p className="mt-1 text-xs text-slate-500">
          Supports single or multiple files
        </p>

        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={isUploading}
          className="mt-4 inline-flex items-center rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50 cursor-pointer"
        >
          Choose Files
        </button>
      </div>

      {items.length > 0 && (
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-sm font-semibold text-slate-800">
              Upload Queue ({items.length})
            </span>
            <button
              type="button"
              onClick={onClearItems}
              disabled={isUploading}
              className="text-xs font-medium text-red-600 hover:text-red-700 disabled:opacity-50"
            >
              Clear all
            </button>
          </div>

          <ul className="divide-y divide-slate-100">
            {items.map((item) => {
              const badge = getStatusBadge(item.status);
              const total = item.totalBytes || item.file.size;

              return (
                <li key={item.id} className="space-y-2 py-3 text-sm">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-slate-100 text-xs font-bold text-slate-700">
                        {getTypeBadge(item.file.type)}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate font-medium text-slate-800">
                          {item.file.name}
                        </p>
                        <p className="text-xs text-slate-500">
                          {formatBytes(item.loadedBytes)} / {formatBytes(total)} ·{' '}
                          {item.progress}%
                        </p>
                      </div>
                    </div>

                    <div className="flex shrink-0 items-center gap-2">
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${badge.classes}`}
                      >
                        {badge.label}
                      </span>

                      {item.status === 'uploading' ? (
                        <button
                          type="button"
                          onClick={() => onCancelItem(item.id)}
                          className="text-xs font-medium text-amber-700 hover:text-amber-900"
                        >
                          Cancel
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => onRemoveItem(item.id)}
                          disabled={isUploading}
                          className="text-xs font-medium text-slate-500 hover:text-red-600 disabled:opacity-50"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full bg-blue-600 transition-all duration-150"
                      style={{ width: `${item.progress}%` }}
                    />
                  </div>

                  {item.error && (
                    <p className="text-xs text-red-600">{item.error}</p>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}