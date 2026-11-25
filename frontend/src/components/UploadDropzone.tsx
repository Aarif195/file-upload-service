import { useRef, useState, type DragEvent, type ChangeEvent } from 'react';

// UploadDropzoneProps
interface UploadDropzoneProps {
  selectedFiles: File[];
  onFilesAdded: (files: File[]) => void;
  onRemoveFile: (index: number) => void;
  onClearFiles: () => void;
  disabled?: boolean;
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

// UploadDropzone
export function UploadDropzone({
  selectedFiles,
  onFilesAdded,
  onRemoveFile,
  onClearFiles,
  disabled = false,
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
    if (!disabled) setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (disabled) return;
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
        } ${disabled ? 'opacity-60 pointer-events-none' : ''}`}
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
          disabled={disabled}
          className="mt-4 inline-flex items-center rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50 cursor-pointer"
        >
          Choose Files
        </button>
      </div>

      {selectedFiles.length > 0 && (
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-sm font-semibold text-slate-800">
              Queue Preview ({selectedFiles.length})
            </span>
            <button
              type="button"
              onClick={onClearFiles}
              disabled={disabled}
              className="text-xs font-medium text-red-600 hover:text-red-700 disabled:opacity-50 cursor-pointer"
            >
              Clear all
            </button>
          </div>

          <ul className="divide-y divide-slate-100">
            {selectedFiles.map((file, idx) => (
              <li
                key={`${file.name}-${file.size}-${idx}`}
                className="flex items-center justify-between py-2.5 text-sm"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-slate-100 text-xs font-bold text-slate-700">
                    {getTypeBadge(file.type)}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate font-medium text-slate-800">
                      {file.name}
                    </p>
                    <p className="text-xs text-slate-500">
                      {file.type || 'unknown'} · {formatBytes(file.size)}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => onRemoveFile(idx)}
                  disabled={disabled}
                  className="mcursor-pointer l-3 text-xs font-medium text-slate-500 hover:text-red-600 disabled:opacity-50 cursor-pointer"
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}