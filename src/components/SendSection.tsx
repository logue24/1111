import React, { useState, useRef } from 'react';
import { UploadCloud, File, Trash2, AlignLeft, Hash, Type, Sparkles, Check, AlertTriangle, ArrowRight } from 'lucide-react';
import { TransferFile } from '../types';
import { Translations } from '../locales/translations';
import { formatBytes, generateTransferCode, calculateTextStats, fileToDataUrl } from '../utils/transferUtils';
import { QrCodeDisplay } from './QrCodeDisplay';

interface SendSectionProps {
  t: Translations;
  onTransferCreated: (transferData: any) => void;
}

const MAX_TOTAL_BYTES = 1.2 * 1024 * 1024 * 1024; // 1.2 GB limit

export const SendSection: React.FC<SendSectionProps> = ({ t, onTransferCreated }) => {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [textContent, setTextContent] = useState<string>('');
  const [isDragging, setIsDragging] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [createdCode, setCreatedCode] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const textStats = calculateTextStats(textContent);
  const totalSizeBytes = selectedFiles.reduce((acc, f) => acc + f.size, 0);
  const isOverLimit = totalSizeBytes > MAX_TOTAL_BYTES;

  const handleFilesAdded = (files: FileList | null) => {
    if (!files) return;
    setErrorMsg(null);
    const newFiles = Array.from(files);
    setSelectedFiles((prev) => [...prev, ...newFiles]);
  };

  const removeFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files) {
      handleFilesAdded(e.dataTransfer.files);
    }
  };

  const handleCreateTransfer = async () => {
    if (selectedFiles.length === 0 && !textContent.trim()) {
      setErrorMsg('Vui lòng chọn ít nhất 1 tệp tin hoặc nhập văn bản để gửi.');
      return;
    }

    if (isOverLimit) {
      setErrorMsg(t.maxLimitWarning);
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);
    setUploadProgress(10);

    try {
      const code = generateTransferCode();
      const filesPayload: TransferFile[] = [];

      // Process files
      for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i];
        setUploadProgress(Math.min(85, Math.floor(15 + ((i + 1) / selectedFiles.length) * 70)));
        const dataUrl = await fileToDataUrl(file);
        filesPayload.push({
          id: `f_${Date.now()}_${i}`,
          name: file.name,
          size: file.size,
          type: file.type || 'application/octet-stream',
          dataUrl,
          lastModified: file.lastModified,
        });
      }

      setUploadProgress(90);

      // Save to server backend
      const payload = {
        code,
        text: textContent,
        files: filesPayload,
        expiresInHours: 24,
      };

      try {
        const res = await fetch('/api/transfers', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          console.warn('Backend transfer save status:', res.status);
        }
      } catch (backendErr) {
        console.warn('Backend not responding, persisting locally:', backendErr);
      }

      // Also persist to localStorage for cross-tab or offline access
      const localTransfers = JSON.parse(localStorage.getItem('reddrop_local_transfers') || '{}');
      localTransfers[code] = {
        code,
        createdAt: Date.now(),
        expiresAt: Date.now() + 24 * 3600 * 1000,
        text: textContent,
        files: filesPayload,
      };
      localStorage.setItem('reddrop_local_transfers', JSON.stringify(localTransfers));

      // Also update history list
      const history = JSON.parse(localStorage.getItem('reddrop_history') || '[]');
      history.unshift({
        code,
        type: 'send',
        timestamp: Date.now(),
        fileCount: filesPayload.length,
        totalSize: totalSizeBytes,
        hasText: !!textContent.trim(),
      });
      localStorage.setItem('reddrop_history', JSON.stringify(history.slice(0, 20)));

      setUploadProgress(100);
      setCreatedCode(code);
      onTransferCreated(payload);
    } catch (err: any) {
      console.error('Error generating transfer:', err);
      setErrorMsg('Không thể xử lý tệp: ' + (err?.message || 'Lỗi không xác định'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSendAnother = () => {
    setCreatedCode(null);
    setSelectedFiles([]);
    setTextContent('');
    setUploadProgress(0);
    setErrorMsg(null);
  };

  if (createdCode) {
    return (
      <div className="w-full max-w-2xl mx-auto py-4 animate-fade-in">
        <QrCodeDisplay
          code={createdCode}
          t={t}
          onSendAnother={handleSendAnother}
        />
      </div>
    );
  }

  return (
    <div className="w-full max-w-4xl mx-auto space-y-8 animate-fade-in">
      {/* Title & Intro */}
      <div className="text-center space-y-2">
        <h2 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
          {t.sendTitle}
        </h2>
        <p className="text-sm md:text-base text-stone-400 max-w-xl mx-auto leading-relaxed">
          {t.sendSubtitle}
        </p>
      </div>

      {errorMsg && (
        <div className="p-4 rounded-xl bg-red-950/80 border border-red-800 text-red-200 text-sm flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-red-400 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Main Send Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: File Dropzone & File List (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`relative rounded-2xl border-2 border-dashed p-8 text-center cursor-pointer transition-all duration-200 ${
              isDragging
                ? 'border-red-500 bg-red-950/30 shadow-[0_0_25px_rgba(239,68,68,0.2)]'
                : 'border-stone-800 hover:border-red-800/80 bg-stone-900/60 hover:bg-stone-900/90'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              multiple
              className="hidden"
              onChange={(e) => handleFilesAdded(e.target.files)}
            />

            <div className="flex flex-col items-center justify-center space-y-3">
              <div className="w-14 h-14 rounded-2xl bg-red-950/70 border border-red-800/50 flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform">
                <UploadCloud className="w-7 h-7 text-red-400" />
              </div>
              <div className="space-y-1">
                <p className="text-sm md:text-base font-semibold text-white">
                  {t.dropzoneTitle}
                </p>
                <p className="text-xs text-stone-400">
                  {t.dropzoneSubtitle}
                </p>
              </div>

              <div className="inline-flex items-center gap-2 px-3 py-1 bg-stone-800/80 border border-stone-700/60 rounded-full text-[11px] font-mono text-red-400 font-medium">
                <span>{t.dropzoneLimit}</span>
              </div>
            </div>
          </div>

          {/* Selected Files List */}
          {selectedFiles.length > 0 && (
            <div className="bg-stone-900/80 border border-stone-800 rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between text-xs text-stone-300 pb-2 border-b border-stone-800">
                <span className="font-semibold text-white">
                  {selectedFiles.length} {t.filesSelected}
                </span>
                <span className={`font-mono tabular-nums ${isOverLimit ? 'text-red-400 font-bold' : 'text-stone-400'}`}>
                  {t.totalSize}: {formatBytes(totalSizeBytes)} / 1.2 GB
                </span>
              </div>

              <div className="max-h-56 overflow-y-auto space-y-2 pr-1">
                {selectedFiles.map((file, idx) => (
                  <div
                    key={`${file.name}-${idx}`}
                    className="flex items-center justify-between gap-3 p-2.5 rounded-xl bg-stone-950/60 border border-stone-800/80 hover:border-red-900/40 text-xs transition-colors"
                  >
                    <div className="flex items-center gap-2.5 overflow-hidden">
                      <File className="w-4 h-4 text-red-400 shrink-0" />
                      <span className="text-stone-200 truncate font-medium">
                        {file.name}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-stone-400 font-mono tabular-nums">
                        {formatBytes(file.size)}
                      </span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeFile(idx);
                        }}
                        className="p-1 text-stone-500 hover:text-red-400 rounded transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Text Sharing Section with Line & Word Counters (5 cols) */}
        <div className="lg:col-span-5 flex flex-col space-y-4">
          <div className="bg-stone-900/80 border border-stone-800 rounded-2xl p-5 flex-1 flex flex-col">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <AlignLeft className="w-4 h-4 text-red-400" />
                <h3 className="text-sm font-semibold text-white">
                  {t.textSectionTitle}
                </h3>
              </div>

              {textContent && (
                <button
                  type="button"
                  onClick={() => setTextContent('')}
                  className="text-[11px] text-stone-400 hover:text-red-400 transition-colors"
                >
                  {t.clearText}
                </button>
              )}
            </div>

            {/* Textarea */}
            <textarea
              value={textContent}
              onChange={(e) => setTextContent(e.target.value)}
              placeholder={t.textPlaceholder}
              rows={8}
              className="w-full flex-1 p-3.5 bg-stone-950/80 border border-stone-800 rounded-xl text-xs md:text-sm text-stone-100 placeholder:text-stone-600 focus:outline-none focus:border-red-600 focus:ring-1 focus:ring-red-600 resize-none font-mono leading-relaxed"
            />

            {/* Line / Word / Character Counters */}
            <div className="mt-3 pt-3 border-t border-stone-800 flex items-center justify-between text-[11px] font-mono text-stone-400">
              <div className="flex items-center gap-1.5">
                <Hash className="w-3 h-3 text-red-400" />
                <span>{t.statLines}:</span>
                <span className="font-semibold text-stone-200 tabular-nums">
                  {textStats.lines}
                </span>
              </div>

              <div className="flex items-center gap-1.5">
                <Type className="w-3 h-3 text-red-400" />
                <span>{t.statWords}:</span>
                <span className="font-semibold text-stone-200 tabular-nums">
                  {textStats.words}
                </span>
              </div>

              <div className="flex items-center gap-1.5">
                <span>{t.statChars}:</span>
                <span className="font-semibold text-stone-200 tabular-nums">
                  {textStats.chars}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Progress Bar when uploading */}
      {isSubmitting && (
        <div className="w-full bg-stone-900 border border-red-900/60 rounded-2xl p-4 space-y-2">
          <div className="flex justify-between text-xs font-semibold text-stone-300">
            <span>{t.btnUploading}</span>
            <span className="font-mono tabular-nums text-red-400">{uploadProgress}%</span>
          </div>
          <div className="w-full h-2 bg-stone-950 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-red-600 to-red-500 rounded-full transition-all duration-300"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
        </div>
      )}

      {/* Primary Action Button */}
      <div className="flex justify-center pt-2">
        <button
          type="button"
          disabled={isSubmitting || (selectedFiles.length === 0 && !textContent.trim()) || isOverLimit}
          onClick={handleCreateTransfer}
          className={`flex items-center justify-center gap-2.5 px-8 py-4 rounded-xl text-sm font-bold text-white transition-all shadow-xl active:scale-98 cursor-pointer ${
            isSubmitting || (selectedFiles.length === 0 && !textContent.trim()) || isOverLimit
              ? 'bg-stone-800 text-stone-500 cursor-not-allowed border border-stone-700'
              : 'bg-red-600 hover:bg-red-500 shadow-red-950/60 hover:shadow-red-900/80 border border-red-500'
          }`}
        >
          {isSubmitting ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              <span>{t.btnUploading}</span>
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" />
              <span>{t.btnGenerateCode}</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </div>
    </div>
  );
};
