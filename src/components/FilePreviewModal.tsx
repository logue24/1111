import React, { useState, useEffect } from 'react';
import { X, Download, FileText, Film, Music, Image as ImageIcon, FileCode, FileArchive, FileQuestion } from 'lucide-react';
import { TransferFile } from '../types';
import { Translations } from '../locales/translations';
import { formatBytes, getFileCategory, triggerDownload } from '../utils/transferUtils';

interface FilePreviewModalProps {
  file: TransferFile | null;
  t: Translations;
  onClose: () => void;
}

export const FilePreviewModal: React.FC<FilePreviewModalProps> = ({ file, t, onClose }) => {
  const [textContent, setTextContent] = useState<string | null>(null);
  const [isLoadingText, setIsLoadingText] = useState(false);

  useEffect(() => {
    if (!file) {
      setTextContent(null);
      return;
    }

    const category = getFileCategory(file.type, file.name);
    if (category === 'text' && file.dataUrl) {
      setIsLoadingText(true);
      try {
        if (file.dataUrl.startsWith('data:')) {
          const base64Index = file.dataUrl.indexOf('base64,');
          if (base64Index !== -1) {
            const rawBase64 = file.dataUrl.substring(base64Index + 7);
            const decoded = decodeURIComponent(escape(atob(rawBase64)));
            setTextContent(decoded);
          } else {
            const commaIndex = file.dataUrl.indexOf(',');
            if (commaIndex !== -1) {
              const text = decodeURIComponent(file.dataUrl.substring(commaIndex + 1));
              setTextContent(text);
            }
          }
        } else {
          // Direct text or fetch
          setTextContent(file.dataUrl);
        }
      } catch (err) {
        console.warn('Failed to decode text preview', err);
        setTextContent('Không thể giải mã nội dung văn bản này để xem trước.');
      } finally {
        setIsLoadingText(false);
      }
    } else {
      setTextContent(null);
    }
  }, [file]);

  if (!file) return null;

  const category = getFileCategory(file.type, file.name);

  const handleDownloadCurrent = () => {
    if (file.dataUrl) {
      triggerDownload(file.dataUrl, file.name);
    }
  };

  const renderIcon = () => {
    switch (category) {
      case 'image':
        return <ImageIcon className="w-5 h-5 text-red-400" />;
      case 'video':
        return <Film className="w-5 h-5 text-red-400" />;
      case 'audio':
        return <Music className="w-5 h-5 text-red-400" />;
      case 'text':
        return <FileCode className="w-5 h-5 text-red-400" />;
      case 'pdf':
        return <FileText className="w-5 h-5 text-red-400" />;
      case 'archive':
        return <FileArchive className="w-5 h-5 text-red-400" />;
      default:
        return <FileQuestion className="w-5 h-5 text-stone-400" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 sm:p-6 animate-fade-in">
      <div className="relative w-full max-w-3xl max-h-[90vh] bg-stone-900 border border-stone-800 rounded-2xl flex flex-col overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-800 bg-stone-950/80">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="p-2 rounded-lg bg-red-950/50 border border-red-900/40 shrink-0">
              {renderIcon()}
            </div>
            <div className="overflow-hidden">
              <h3 className="text-sm md:text-base font-semibold text-white truncate max-w-md">
                {file.name}
              </h3>
              <p className="text-xs text-stone-400 font-mono">
                {formatBytes(file.size)} · {file.type || 'Unknown Type'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleDownloadCurrent}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-red-600 hover:bg-red-500 text-white transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{t.downloadSingle}</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-stone-400 hover:text-white hover:bg-stone-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Preview Content Area */}
        <div className="flex-1 overflow-auto p-4 md:p-6 flex items-center justify-center bg-stone-950/40 min-h-[280px]">
          {category === 'image' && file.dataUrl && (
            <div className="max-h-[60vh] max-w-full flex items-center justify-center">
              <img
                src={file.dataUrl}
                alt={file.name}
                referrerPolicy="no-referrer"
                className="max-h-[60vh] max-w-full rounded-lg object-contain border border-stone-800 shadow-md"
              />
            </div>
          )}

          {category === 'video' && file.dataUrl && (
            <div className="w-full max-h-[60vh] flex items-center justify-center">
              <video
                src={file.dataUrl}
                controls
                playsInline
                className="max-h-[60vh] max-w-full rounded-lg bg-black border border-stone-800"
              />
            </div>
          )}

          {category === 'audio' && file.dataUrl && (
            <div className="w-full max-w-md p-6 bg-stone-900 border border-stone-800 rounded-xl flex flex-col items-center gap-4 text-center">
              <Music className="w-16 h-16 text-red-500 animate-pulse" />
              <p className="text-sm font-semibold text-white">{file.name}</p>
              <audio src={file.dataUrl} controls className="w-full mt-2" />
            </div>
          )}

          {category === 'text' && (
            <div className="w-full h-full max-h-[60vh] flex flex-col bg-stone-950 border border-stone-800 rounded-xl overflow-hidden">
              <div className="px-4 py-2 border-b border-stone-800 bg-stone-900/60 text-xs text-stone-400 flex items-center justify-between font-mono">
                <span>Text Viewer</span>
                <span>{textContent ? `${textContent.split('\n').length} lines` : ''}</span>
              </div>
              <div className="p-4 overflow-auto font-mono text-xs text-stone-200 leading-relaxed whitespace-pre-wrap selection:bg-red-700 selection:text-white">
                {isLoadingText ? (
                  <p className="text-stone-500">Đang đọc tệp tin...</p>
                ) : (
                  textContent || 'Tệp trống hoặc không chứa văn bản đọc được.'
                )}
              </div>
            </div>
          )}

          {category === 'pdf' && file.dataUrl && (
            <div className="w-full h-[60vh] rounded-xl overflow-hidden border border-stone-800 bg-stone-900">
              <iframe
                src={file.dataUrl}
                title={file.name}
                className="w-full h-full border-0"
              />
            </div>
          )}

          {(category === 'archive' || category === 'other') && (
            <div className="flex flex-col items-center text-center p-8 bg-stone-900/60 border border-stone-800 rounded-2xl max-w-md">
              <FileArchive className="w-16 h-16 text-red-500 mb-4" />
              <h4 className="text-base font-semibold text-white mb-1">{file.name}</h4>
              <p className="text-xs text-stone-400 mb-4">
                Định dạng này không hỗ trợ xem trực tiếp trong trình duyệt. Bạn có thể tải tệp tin về máy để mở.
              </p>
              <button
                type="button"
                onClick={handleDownloadCurrent}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold bg-red-600 hover:bg-red-500 text-white transition-colors"
              >
                <Download className="w-4 h-4" />
                <span>{t.downloadSingle}</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
