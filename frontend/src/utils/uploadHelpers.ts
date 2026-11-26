import { type UploadProgressInfo } from '../types/upload';

export interface UploadRequestOptions {
    onProgress?: (info: UploadProgressInfo) => void;
    signal?: AbortSignal;
}

// parseErrorText
export function parseErrorText(rawText: string, status: number): string {
    try {
        const data = JSON.parse(rawText);
        return data?.message || `Request failed (${status})`;
    } catch {
        return rawText || `Request failed (${status})`;
    }
}

// parseError
export async function parseError(res: Response): Promise<string> {
    try {
        const data = await res.json();
        return data?.message || `Request failed (${res.status})`;
    } catch {
        return `Request failed (${res.status})`;
    }
}

export function sendFormDataWithProgress<T>(
    url: string,
    formData: FormData,
    options?: UploadRequestOptions,
): Promise<T> {
    return new Promise<T>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('POST', url);

        const handleAbort = () => {
            xhr.abort();
            reject(new DOMException('Upload cancelled', 'AbortError'));
        };

        if (options?.signal) {
            if (options.signal.aborted) {
                reject(new DOMException('Upload cancelled', 'AbortError'));
                return;
            }
            options.signal.addEventListener('abort', handleAbort, { once: true });
        }

        const cleanup = () => {
            if (options?.signal) {
                options.signal.removeEventListener('abort', handleAbort);
            }
        };

        xhr.upload.onprogress = (event) => {
            if (!options?.onProgress) return;
            const totalBytes = event.lengthComputable ? event.total : 0;
            const loadedBytes = event.loaded;
            const progress =
                totalBytes > 0 ? Math.min(100, Math.round((loadedBytes / totalBytes) * 100)) : 0;

            options.onProgress({
                progress,
                loadedBytes,
                totalBytes,
            });
        };

        xhr.onload = () => {
            cleanup();
            if (xhr.status >= 200 && xhr.status < 300) {
                try {
                    resolve(JSON.parse(xhr.responseText) as T);
                } catch {
                    reject(new Error('Invalid JSON response from server'));
                }
            } else {
                reject(new Error(parseErrorText(xhr.responseText, xhr.status)));
            }
        };

        xhr.onerror = () => {
            cleanup();
            reject(new Error('Network error during upload'));
        };

        xhr.onabort = () => {
            cleanup();
            reject(new DOMException('Upload cancelled', 'AbortError'));
        };

        xhr.send(formData);
    });
}