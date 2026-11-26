import { useRef, useState } from 'react';
import { UploadDropzone } from './components/UploadDropzone';
import { uploadMultipleFiles, uploadSingleFile } from './services/uploadApi';
import type {
  BatchEnqueueResponse,
  FileMetadata,
  UploadQueueItem,
} from './types/upload';

function createQueueItem(file: File): UploadQueueItem {
  const id =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

  return {
    id,
    file,
    status: 'pending',
    progress: 0,
    loadedBytes: 0,
    totalBytes: file.size,
  };
}

export function App() {
  const [items, setItems] = useState<UploadQueueItem[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [singleResults, setSingleResults] = useState<FileMetadata[]>([]);
  const [batchResults, setBatchResults] = useState<BatchEnqueueResponse[]>([]);

  const controllersRef = useRef(new Map<string, AbortController>());

  // updateItem
  const updateItem = (
    id: string,
    updater: (item: UploadQueueItem) => UploadQueueItem,
  ) => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? updater(item) : item)),
    );
  };

  // syncAfterItemRemoval
  const syncAfterItemRemoval = (removed: UploadQueueItem[]) => {
    const removedFileIds = new Set(
      removed
        .map((item) => item.fileId)
        .filter((fileId): fileId is string => Boolean(fileId)),
    );

    if (removedFileIds.size > 0) {
      setSingleResults((prev) =>
        prev.filter((res) => !removedFileIds.has(res.id)),
      );
    }

    const removedBatchCounts = new Map<string, number>();
    removed.forEach((item) => {
      if (item.batchId) {
        removedBatchCounts.set(
          item.batchId,
          (removedBatchCounts.get(item.batchId) ?? 0) + 1,
        );
      }
    });

    if (removedBatchCounts.size > 0) {
      setBatchResults((prev) =>
        prev.flatMap((batch) => {
          const countToRemove = removedBatchCounts.get(batch.batchId) ?? 0;
          if (countToRemove === 0) return [batch];
          const remainingJobs = batch.queuedJobs.slice(
            0,
            Math.max(0, batch.queuedJobs.length - countToRemove),
          );
          if (remainingJobs.length === 0) return [];
          return [{ ...batch, queuedJobs: remainingJobs }];
        }),
      );
    }
  };

  // handleFilesAdded
  const handleFilesAdded = (files: File[]) => {
    setError(null);
    const nextItems = files.map(createQueueItem);
    setItems((prev) => [...prev, ...nextItems]);
  };

  // handleRemoveItem
  const handleRemoveItem = (id: string) => {
    controllersRef.current.get(id)?.abort();
    controllersRef.current.delete(id);

    setItems((prev) => {
      const target = prev.find((item) => item.id === id);
      if (target) {
        syncAfterItemRemoval([target]);
      }
      const next = prev.filter((item) => item.id !== id);
      if (next.length === 0) {
        setError(null);
      }
      return next;
    });
  };

  // handleCancelItem
  const handleCancelItem = (id: string) => {
    const controller = controllersRef.current.get(id);
    if (controller) {
      controller.abort();
      controllersRef.current.delete(id);
    }
    updateItem(id, (item) => ({
      ...item,
      status: 'cancelled',
      error: 'Upload cancelled by user',
    }));
  };

  // handleClearItems
  const handleClearItems = () => {
    controllersRef.current.forEach((controller) => controller.abort());
    controllersRef.current.clear();

    setItems((prev) => {
      syncAfterItemRemoval(prev);
      return [];
    });
    setError(null);
  };

  // runSingleItemUpload
  const runSingleItemUpload = async (item: UploadQueueItem) => {
    const controller = new AbortController();
    controllersRef.current.set(item.id, controller);

    updateItem(item.id, (curr) => ({
      ...curr,
      status: 'uploading',
      progress: 0,
      loadedBytes: 0,
      totalBytes: curr.file.size,
      error: undefined,
    }));

    try {
      const result = await uploadSingleFile(item.file, {
        signal: controller.signal,
        onProgress: ({ progress, loadedBytes, totalBytes }) => {
          updateItem(item.id, (curr) => ({
            ...curr,
            status: 'uploading',
            progress,
            loadedBytes,
            totalBytes: totalBytes || curr.file.size,
          }));
        },
      });

      updateItem(item.id, (curr) => ({
        ...curr,
        status: 'success',
        progress: 100,
        loadedBytes: curr.totalBytes || curr.file.size,
        fileId: result.id,
      }));
      setSingleResults((prev) => [result, ...prev]);
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        updateItem(item.id, (curr) => ({
          ...curr,
          status: 'cancelled',
          error: curr.error || 'Upload cancelled',
        }));
      } else {
        const message = err instanceof Error ? err.message : 'Upload failed';
        updateItem(item.id, (curr) => ({
          ...curr,
          status: 'failed',
          error: message,
        }));
        setError(message);
      }
    } finally {
      controllersRef.current.delete(item.id);
    }
  };

  // runBatchUpload
  const runBatchUpload = async (batchItems: UploadQueueItem[]) => {
    const totalBatchBytes = batchItems.reduce(
      (sum, item) => sum + item.file.size,
      0,
    );
    const batchController = new AbortController();

    batchItems.forEach((item) => {
      controllersRef.current.set(item.id, batchController);
    });

    setItems((prev) =>
      prev.map((item) =>
        batchItems.some((b) => b.id === item.id)
          ? {
              ...item,
              status: 'uploading',
              progress: 0,
              loadedBytes: 0,
              totalBytes: item.file.size,
              error: undefined,
            }
          : item,
      ),
    );

    try {
      const result = await uploadMultipleFiles(
        batchItems.map((b) => b.file),
        {
          signal: batchController.signal,
          onProgress: ({ progress, loadedBytes }) => {
            setItems((prev) =>
              prev.map((item) => {
                if (!batchItems.some((b) => b.id === item.id)) return item;
                if (item.status === 'cancelled') return item;
                const share =
                  totalBatchBytes > 0
                    ? item.file.size / totalBatchBytes
                    : 1 / batchItems.length;
                const itemLoaded = Math.min(
                  item.file.size,
                  Math.round(loadedBytes * share),
                );
                return {
                  ...item,
                  status: 'uploading',
                  progress,
                  loadedBytes: itemLoaded,
                  totalBytes: item.file.size,
                };
              }),
            );
          },
        },
      );

      setItems((prev) =>
        prev.map((item) =>
          batchItems.some((b) => b.id === item.id) &&
          item.status !== 'cancelled'
            ? {
                ...item,
                status: 'success',
                progress: 100,
                loadedBytes: item.file.size,
                batchId: result.batchId,
              }
            : item,
        ),
      );
      setBatchResults((prev) => [result, ...prev]);
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        setItems((prev) =>
          prev.map((item) =>
            batchItems.some((b) => b.id === item.id) &&
            item.status === 'uploading'
              ? {
                  ...item,
                  status: 'cancelled',
                  error: 'Batch upload cancelled',
                }
              : item,
          ),
        );
      } else {
        const message =
          err instanceof Error ? err.message : 'Batch upload failed';
        setItems((prev) =>
          prev.map((item) =>
            batchItems.some((b) => b.id === item.id) &&
            item.status === 'uploading'
              ? {
                  ...item,
                  status: 'failed',
                  error: message,
                }
              : item,
          ),
        );
        setError(message);
      }
    } finally {
      batchItems.forEach((item) => controllersRef.current.delete(item.id));
    }
  };

  // handleUpload
  const handleUpload = async () => {
    const pendingItems = items.filter((item) => item.status === 'pending');
    if (!pendingItems.length || isUploading) return;

    setIsUploading(true);
    setError(null);

    try {
      if (pendingItems.length === 1) {
        await runSingleItemUpload(pendingItems[0]);
      } else {
        await runBatchUpload(pendingItems);
      }
    } finally {
      setIsUploading(false);
    }
  };

  const pendingCount = items.filter((item) => item.status === 'pending').length;

  return (
    <main className="mx-auto max-w-2xl space-y-6 p-6">
      <h1 className="text-xl font-bold text-slate-900">File Upload Service</h1>

      <UploadDropzone
        items={items}
        onFilesAdded={handleFilesAdded}
        onRemoveItem={handleRemoveItem}
        onCancelItem={handleCancelItem}
        onClearItems={handleClearItems}
        isUploading={isUploading}
      />

      {pendingCount > 0 && (
        <button
          type="button"
          onClick={handleUpload}
          disabled={isUploading}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {isUploading
            ? 'Uploading...'
            : pendingCount === 1
              ? 'Upload Single File'
              : `Enqueue Batch (${pendingCount} files)`}
        </button>
      )}

      {error && (
        <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>
      )}

      {singleResults.length > 0 && (
        <div className="space-y-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">
          <p className="font-semibold">Uploaded Files</p>
          <ul className="space-y-1">
            {singleResults.map((res) => (
              <li key={res.id}>
                {res.originalName} ({res.id})
              </li>
            ))}
          </ul>
        </div>
      )}

      {batchResults.length > 0 && (
        <div className="space-y-2 rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-900">
          <p className="font-semibold">Queued Batches</p>
          <ul className="space-y-1">
            {batchResults.map((res) => (
              <li key={res.batchId}>
                Batch {res.batchId} ({res.queuedJobs.length} jobs)
              </li>
            ))}
          </ul>
        </div>
      )}
    </main>
  );
}

export default App;