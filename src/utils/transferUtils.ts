import JSZip from 'jszip';
import { TextStats, TransferFile } from '../types';

export function formatBytes(bytes: number, decimals = 2): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

export function generateTransferCode(): string {
  // Generates clean 6-character code e.g. RED-924 or 6-digit alphanumeric
  const prefix = 'RED';
  const num = Math.floor(100 + Math.random() * 900); // 3 digits
  const suffix = Math.floor(10 + Math.random() * 90); // 2 digits
  return `${prefix}-${num}${suffix}`;
}

export function calculateTextStats(text: string): TextStats {
  if (!text) {
    return { lines: 0, words: 0, chars: 0 };
  }
  const lines = text.length > 0 ? text.split(/\r\n|\r|\n/).length : 0;
  const words = text.trim() ? text.trim().split(/\s+/).filter(Boolean).length : 0;
  const chars = text.length;
  return { lines, words, chars };
}

export function extractCodeFromUrl(urlOrHash: string): string | null {
  if (!urlOrHash) return null;

  // Check hash #code=... or #CODE
  const hashMatch = urlOrHash.match(/#code=([A-Za-z0-9-_]+)/i);
  if (hashMatch && hashMatch[1]) {
    return hashMatch[1].toUpperCase();
  }

  // Check query param ?code=...
  const queryMatch = urlOrHash.match(/[?&]code=([A-Za-z0-9-_]+)/i);
  if (queryMatch && queryMatch[1]) {
    return queryMatch[1].toUpperCase();
  }

  // If raw string starts with #
  if (urlOrHash.startsWith('#')) {
    const raw = urlOrHash.slice(1).trim();
    if (raw && !raw.includes('/')) return raw.toUpperCase();
  }

  // If matches code format directly
  const directMatch = urlOrHash.trim().match(/^(RED-[0-9A-Z]{4,6}|[0-9A-Z]{6})$/i);
  if (directMatch) {
    return directMatch[0].toUpperCase();
  }

  return null;
}

export async function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
}

export function triggerDownload(url: string, filename: string) {
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

export async function downloadFilesAsZip(files: TransferFile[], zipName = 'RedDrop_Files.zip') {
  const zip = new JSZip();

  for (const file of files) {
    if (file.dataUrl) {
      // Extract base64 part
      const base64Index = file.dataUrl.indexOf('base64,');
      if (base64Index !== -1) {
        const base64Data = file.dataUrl.substring(base64Index + 7);
        zip.file(file.name, base64Data, { base64: true });
      } else {
        zip.file(file.name, file.dataUrl);
      }
    }
  }

  const content = await zip.generateAsync({ type: 'blob' });
  const blobUrl = URL.createObjectURL(content);
  triggerDownload(blobUrl, zipName);
  setTimeout(() => URL.revokeObjectURL(blobUrl), 10000);
}

export function getFileCategory(mimeType: string, filename: string): 'image' | 'video' | 'audio' | 'text' | 'archive' | 'pdf' | 'other' {
  const lowerName = filename.toLowerCase();
  const lowerMime = mimeType.toLowerCase();

  if (lowerMime.startsWith('image/') || /\.(jpg|jpeg|png|gif|webp|svg|bmp|ico)$/.test(lowerName)) {
    return 'image';
  }
  if (lowerMime.startsWith('video/') || /\.(mp4|webm|mov|mkv|avi|wmv)$/.test(lowerName)) {
    return 'video';
  }
  if (lowerMime.startsWith('audio/') || /\.(mp3|wav|ogg|m4a|aac|flac)$/.test(lowerName)) {
    return 'audio';
  }
  if (lowerMime === 'application/pdf' || lowerName.endsWith('.pdf')) {
    return 'pdf';
  }
  if (
    lowerMime.startsWith('text/') ||
    lowerMime.includes('json') ||
    lowerMime.includes('javascript') ||
    /\.(txt|md|csv|json|js|ts|tsx|jsx|html|css|xml|yaml|yml|log|py|go|rs|c|cpp|h|java)$/.test(lowerName)
  ) {
    return 'text';
  }
  if (/\.(zip|rar|7z|tar|gz|bz2)$/.test(lowerName) || lowerMime.includes('zip') || lowerMime.includes('compressed')) {
    return 'archive';
  }

  return 'other';
}
