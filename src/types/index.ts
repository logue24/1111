export type Language = 'vi' | 'en' | 'ko' | 'ja' | 'zh';

export interface TransferFile {
  id: string;
  name: string;
  size: number;
  type: string;
  dataUrl?: string;
  lastModified?: number;
}

export interface TransferData {
  code: string;
  createdAt: number;
  expiresAt: number;
  text?: string;
  files: TransferFile[];
  downloadCount?: number;
  senderName?: string;
}

export interface TextStats {
  lines: number;
  words: number;
  chars: number;
}
