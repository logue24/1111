import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import { Camera, Search, Download, Archive, CheckSquare, Square, Eye, Copy, Check, File, FileText, AlertCircle, Sparkles } from 'lucide-react';
import { TransferData, TransferFile } from '../types';
import { Translations } from '../locales/translations';
import { formatBytes, downloadFilesAsZip, triggerDownload, getFileCategory, calculateTextStats } from '../utils/transferUtils';
import { CameraScanner } from './CameraScanner';
import { FilePreviewModal } from './FilePreviewModal';

interface ReceiveSectionProps {
  t: Translations;
  initialCode?: string | null;
  onReceiveSuccess?: (data: TransferData) => void;
}

export const ReceiveSection: React.FC<ReceiveSectionProps> = ({
  t,
  initialCode,
  onReceiveSuccess,
}) => {
  const [codeInput, setCodeInput] = useState<string>(initialCode || '');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isCameraOpen, setIsCameraOpen] = useState<boolean>(false);
  const [transferData, setTransferData] = useState<TransferData | null>(null);
  const [selectedFileIds, setSelectedFileIds] = useState<Set<string>>(new Set());
  const [previewFile, setPreviewFile] = useState<TransferFile | null>(null);
  const [copiedText, setCopiedText] = useState<boolean>(false);
  const [isZipping, setIsZipping] = useState<boolean>(false);
  const [errorStatus, setErrorStatus] = useState<string | null>(null);

  // If initial code passed via url hash/query, auto-fetch
  useEffect(() => {
    if (initialCode) {
      setCodeInput(initialCode);
      fetchTransferData(initialCode);
    }
  }, [initialCode]);

  const fetchTransferData = async (codeToSearch: string) => {
    const code = codeToSearch.trim().toUpperCase();
    if (!code) return;

    setIsLoading(true);
    setErrorStatus(null);
    setTransferData(null);
    setSelectedFileIds(new Set());

    try {
      let data: TransferData | null = null;

      // 1. Try server endpoint
      try {
        const res = await fetch(`/api/transfers/${encodeURIComponent(code)}`);
        if (res.ok) {
          const json = await res.json();
          if (json.success && json.transfer) {
            data = json.transfer;
            // Acknowledge receive
            fetch(`/api/transfers/${encodeURIComponent(code)}/ack`, { method: 'POST' }).catch(() => {});
          }
        } else if (res.status === 410) {
          setErrorStatus(t.statusExpired);
          setIsLoading(false);
          return;
        }
      } catch (e) {
        console.warn('Backend fetch failed, checking localStorage fallback:', e);
      }

      // 2. If not found on backend or backend offline, check local storage
      if (!data) {
        const localTransfers = JSON.parse(localStorage.getItem('reddrop_local_transfers') || '{}');
        if (localTransfers[code]) {
          data = localTransfers[code];
        }
      }

      if (data) {
        setTransferData(data);
        // Pre-select all files by default
        const allIds = new Set(data.files.map((f) => f.id));
        setSelectedFileIds(allIds);

        // Record history
        const history = JSON.parse(localStorage.getItem('reddrop_history') || '[]');
        history.unshift({
          code,
          type: 'receive',
          timestamp: Date.now(),
          fileCount: data.files.length,
          totalSize: data.files.reduce((a, b) => a + b.size, 0),
          hasText: !!data.text,
        });
        localStorage.setItem('reddrop_history', JSON.stringify(history.slice(0, 20)));

        // Trigger confetti celebration!
        try {
          confetti({
            particleCount: 50,
            spread: 60,
            origin: { y: 0.6 },
            colors: ['#ef4444', '#dc2626', '#b91c1c', '#ffffff'],
          });
        } catch (_) {}

        if (onReceiveSuccess) onReceiveSuccess(data);
      } else {
        setErrorStatus(t.statusNotFound);
      }
    } catch (err: any) {
      console.error('Error fetching transfer:', err);
      setErrorStatus(t.statusError);
    } finally {
      setIsLoading(false);
    }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (codeInput.trim()) {
      fetchTransferData(codeInput);
    }
  };

  const handleCameraScanSuccess = (scannedCode: string) => {
    setIsCameraOpen(false);
    setCodeInput(scannedCode);
    fetchTransferData(scannedCode);
  };

  const toggleSelectAll = () => {
    if (!transferData) return;
    if (selectedFileIds.size === transferData.files.length) {
      setSelectedFileIds(new Set());
    } else {
      setSelectedFileIds(new Set(transferData.files.map((f) => f.id)));
    }
  };

  const toggleFileSelect = (id: string) => {
    setSelectedFileIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleDownloadSelected = async () => {
    if (!transferData) return;
    const filesToDownload = transferData.files.filter((f) => selectedFileIds.has(f.id));
    if (filesToDownload.length === 0) return;

    if (filesToDownload.length === 1 && filesToDownload[0].dataUrl) {
      triggerDownload(filesToDownload[0].dataUrl, filesToDownload[0].name);
    } else {
      setIsZipping(true);
      try {
        await downloadFilesAsZip(filesToDownload, `RedDrop_${transferData.code}_Selected.zip`);
      } catch (err) {
        console.error('ZIP download failed', err);
      } finally {
        setIsZipping(false);
      }
    }
  };

  const handleDownloadAllZip = async () => {
    if (!transferData || transferData.files.length === 0) return;
    setIsZipping(true);
    try {
      await downloadFilesAsZip(transferData.files, `RedDrop_${transferData.code}_All.zip`);
    } catch (err) {
      console.error('ZIP download failed', err);
    } finally {
      setIsZipping(false);
    }
  };

  const copyReceivedText = async () => {
    if (!transferData?.text) return;
    try {
      await navigator.clipboard.writeText(transferData.text);
      setCopiedText(true);
      setTimeout(() => setCopiedText(false), 2000);
    } catch (err) {
      console.warn('Failed to copy', err);
    }
  };

  const receivedTextStats = transferData?.text ? calculateTextStats(transferData.text) : null;

  return (
    <div className="w-full max-w-4xl mx-auto space-y-8 animate-fade-in">
      {/* Title */}
      <div className="text-center space-y-2">
        <h2 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
          {t.receiveTitle}
        </h2>
        <p className="text-sm md:text-base text-stone-400 max-w-xl mx-auto leading-relaxed">
          {t.receiveSubtitle}
        </p>
      </div>

      {/* Input Options (Camera Scanner Trigger + Manual Code Input) */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-stretch">
        {/* Camera Quick Button (5 cols) */}
        <div className="md:col-span-5 flex">
          <button
            type="button"
            onClick={() => setIsCameraOpen(true)}
            className="w-full flex items-center justify-center gap-3 p-5 rounded-2xl bg-stone-900 border border-red-900/50 hover:border-red-600 hover:bg-stone-850 text-white transition-all shadow-lg group cursor-pointer"
          >
            <div className="w-12 h-12 rounded-xl bg-red-600 group-hover:bg-red-500 flex items-center justify-center shadow-lg shadow-red-950/80 transition-colors">
              <Camera className="w-6 h-6 text-white" />
            </div>
            <div className="text-left">
              <span className="block text-sm font-bold text-white group-hover:text-red-400 transition-colors">
                {t.btnOpenCamera}
              </span>
              <span className="block text-xs text-stone-400">
                Quét vào khung hình vuông đỏ
              </span>
            </div>
          </button>
        </div>

        {/* Manual Code Input Form (7 cols) */}
        <div className="md:col-span-7 flex">
          <form
            onSubmit={handleManualSubmit}
            className="w-full bg-stone-900/90 border border-stone-800 rounded-2xl p-3 sm:p-4 flex items-center gap-2"
          >
            <div className="relative flex-1">
              <input
                type="text"
                value={codeInput}
                onChange={(e) => setCodeInput(e.target.value.toUpperCase())}
                placeholder={t.manualCodePlaceholder}
                className="w-full px-4 py-3 bg-stone-950 border border-stone-800 rounded-xl text-sm font-mono font-bold tracking-widest text-white placeholder:text-stone-600 focus:outline-none focus:border-red-600 focus:ring-1 focus:ring-red-600 uppercase"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading || !codeInput.trim()}
              className={`px-5 py-3 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all shrink-0 cursor-pointer ${
                isLoading || !codeInput.trim()
                  ? 'bg-stone-800 text-stone-500 cursor-not-allowed'
                  : 'bg-red-600 hover:bg-red-500 text-white shadow-lg shadow-red-950/60 active:scale-95'
              }`}
            >
              {isLoading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Search className="w-4 h-4" />
              )}
              <span>{t.btnConfirmReceive}</span>
            </button>
          </form>
        </div>
      </div>

      {/* Error / Not Found Message */}
      {errorStatus && (
        <div className="p-4 rounded-xl bg-red-950/70 border border-red-800 text-red-200 text-sm flex items-center gap-3 animate-fade-in">
          <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
          <span>{errorStatus}</span>
        </div>
      )}

      {/* Loading state indicator */}
      {isLoading && (
        <div className="py-12 flex flex-col items-center justify-center gap-3 text-center">
          <div className="w-10 h-10 border-3 border-red-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-stone-300 font-medium">{t.searchingData}</p>
        </div>
      )}

      {/* Received Data Display */}
      {transferData && (
        <div className="space-y-6 animate-fade-in">
          {/* Header Bar of Retrieved Data */}
          <div className="bg-stone-900/90 border border-red-900/50 rounded-2xl p-5 md:p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                <h3 className="text-lg font-bold text-white tracking-tight">
                  {t.dataFoundTitle}
                </h3>
              </div>
              <p className="text-xs text-stone-400 font-mono">
                Mã: <span className="text-red-400 font-bold">{transferData.code}</span> · {transferData.files.length} tệp · {formatBytes(transferData.files.reduce((a, b) => a + b.size, 0))}
              </p>
            </div>

            {/* Quick Batch Actions */}
            {transferData.files.length > 0 && (
              <div className="flex items-center gap-2.5 shrink-0 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={handleDownloadSelected}
                  disabled={selectedFileIds.size === 0 || isZipping}
                  className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
                    selectedFileIds.size === 0 || isZipping
                      ? 'bg-stone-800 text-stone-500 cursor-not-allowed'
                      : 'bg-red-600 hover:bg-red-500 text-white shadow-md active:scale-95'
                  }`}
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>
                    {t.btnDownloadSelected} ({selectedFileIds.size})
                  </span>
                </button>

                <button
                  type="button"
                  onClick={handleDownloadAllZip}
                  disabled={isZipping}
                  className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold bg-stone-800 hover:bg-stone-700 text-stone-200 border border-stone-700 hover:text-white transition-all active:scale-95"
                >
                  <Archive className="w-3.5 h-3.5" />
                  <span>{isZipping ? t.downloadingZip : t.btnDownloadAllZip}</span>
                </button>
              </div>
            )}
          </div>

          {/* Received Text Content Card */}
          {transferData.text && (
            <div className="bg-stone-900/80 border border-stone-800 rounded-2xl p-5 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-stone-800">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-red-400" />
                  <span className="text-sm font-semibold text-white">
                    {t.textReceivedTitle}
                  </span>
                  {receivedTextStats && (
                    <span className="text-[11px] font-mono text-stone-400 ml-2">
                      ({receivedTextStats.lines} dòng · {receivedTextStats.words} từ · {receivedTextStats.chars} chữ)
                    </span>
                  )}
                </div>

                <button
                  type="button"
                  onClick={copyReceivedText}
                  className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-300 hover:text-white transition-colors"
                >
                  {copiedText ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-emerald-400">{t.textCopied}</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>{t.copyText}</span>
                    </>
                  )}
                </button>
              </div>

              <div className="p-4 rounded-xl bg-stone-950 border border-stone-850 font-mono text-xs md:text-sm text-stone-200 whitespace-pre-wrap leading-relaxed max-h-60 overflow-y-auto selection:bg-red-700 selection:text-white">
                {transferData.text}
              </div>
            </div>
          )}

          {/* Files List Card */}
          {transferData.files.length > 0 && (
            <div className="bg-stone-900/80 border border-stone-800 rounded-2xl p-5 space-y-4">
              {/* Select All / Deselect All Controls */}
              <div className="flex items-center justify-between pb-2 border-b border-stone-800">
                <button
                  type="button"
                  onClick={toggleSelectAll}
                  className="flex items-center gap-2 text-xs font-semibold text-stone-300 hover:text-white cursor-pointer select-none"
                >
                  {selectedFileIds.size === transferData.files.length ? (
                    <CheckSquare className="w-4 h-4 text-red-500" />
                  ) : (
                    <Square className="w-4 h-4 text-stone-500" />
                  )}
                  <span>
                    {selectedFileIds.size === transferData.files.length
                      ? t.deselectAll
                      : t.selectAll}
                  </span>
                </button>

                <span className="text-xs font-mono text-stone-400">
                  {selectedFileIds.size} / {transferData.files.length} {t.selectedCount}
                </span>
              </div>

              {/* Items List */}
              <div className="space-y-2.5">
                {transferData.files.map((file) => {
                  const isChecked = selectedFileIds.has(file.id);
                  return (
                    <div
                      key={file.id}
                      className={`flex items-center justify-between gap-3 p-3.5 rounded-xl border transition-all ${
                        isChecked
                          ? 'bg-stone-950 border-red-900/60 shadow-sm'
                          : 'bg-stone-950/40 border-stone-800 hover:border-stone-700'
                      }`}
                    >
                      <div className="flex items-center gap-3 overflow-hidden">
                        <button
                          type="button"
                          onClick={() => toggleFileSelect(file.id)}
                          className="shrink-0 p-1 text-stone-400 hover:text-white cursor-pointer"
                        >
                          {isChecked ? (
                            <CheckSquare className="w-4 h-4 text-red-500" />
                          ) : (
                            <Square className="w-4 h-4 text-stone-600" />
                          )}
                        </button>

                        <div className="overflow-hidden">
                          <p className="text-xs md:text-sm font-semibold text-white truncate max-w-xs sm:max-w-md">
                            {file.name}
                          </p>
                          <p className="text-[11px] font-mono text-stone-400">
                            {formatBytes(file.size)}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {/* Preview button */}
                        <button
                          type="button"
                          onClick={() => setPreviewFile(file)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-stone-850 hover:bg-stone-800 text-stone-300 hover:text-white border border-stone-750 transition-colors"
                        >
                          <Eye className="w-3.5 h-3.5 text-red-400" />
                          <span className="hidden sm:inline">{t.previewBtn}</span>
                        </button>

                        {/* Direct Download button */}
                        <button
                          type="button"
                          onClick={() => {
                            if (file.dataUrl) triggerDownload(file.dataUrl, file.name);
                          }}
                          className="p-2 rounded-lg bg-red-600 hover:bg-red-500 text-white transition-colors"
                          title={t.downloadSingle}
                        >
                          <Download className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Camera Scanner Modal Component */}
      <CameraScanner
        t={t}
        isOpen={isCameraOpen}
        onClose={() => setIsCameraOpen(false)}
        onCodeScanned={handleCameraScanSuccess}
      />

      {/* File Preview Modal Component */}
      <FilePreviewModal
        file={previewFile}
        t={t}
        onClose={() => setPreviewFile(null)}
      />
    </div>
  );
};
