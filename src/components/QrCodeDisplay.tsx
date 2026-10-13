import React, { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import { Copy, Check, Download, ExternalLink, QrCode as QrIcon } from 'lucide-react';
import { Translations } from '../locales/translations';
import { triggerDownload } from '../utils/transferUtils';

interface QrCodeDisplayProps {
  code: string;
  t: Translations;
  onSendAnother?: () => void;
}

export const QrCodeDisplay: React.FC<QrCodeDisplayProps> = ({
  code,
  t,
  onSendAnother,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  // Compute the full deep link with hash
  const shareUrl = typeof window !== 'undefined'
    ? `${window.location.origin}${window.location.pathname}#code=${code}`
    : `https://reddrop.app/#code=${code}`;

  useEffect(() => {
    if (canvasRef.current) {
      QRCode.toCanvas(
        canvasRef.current,
        shareUrl,
        {
          width: 240,
          margin: 2,
          color: {
            dark: '#dc2626', // Crimson red QR modules
            light: '#ffffff', // Crisp white background for maximum scanning contrast
          },
          errorCorrectionLevel: 'M',
        },
        (error) => {
          if (error) console.error('Error generating QR code:', error);
        }
      );
    }
  }, [code, shareUrl]);

  const copyToClipboard = async (text: string, type: 'code' | 'link') => {
    try {
      await navigator.clipboard.writeText(text);
      if (type === 'code') {
        setCopiedCode(true);
        setTimeout(() => setCopiedCode(false), 2000);
      } else {
        setCopiedLink(true);
        setTimeout(() => setCopiedLink(false), 2000);
      }
    } catch (err) {
      console.warn('Clipboard write failed', err);
    }
  };

  const downloadQrImage = () => {
    if (canvasRef.current) {
      const url = canvasRef.current.toDataURL('image/png');
      triggerDownload(url, `RedDrop_QR_${code}.png`);
    }
  };

  return (
    <div className="w-full bg-stone-900/90 border border-red-900/50 rounded-2xl p-6 md:p-8 flex flex-col items-center text-center shadow-xl">
      {/* Success Badge */}
      <div className="flex items-center gap-2 px-3 py-1 bg-red-950/80 border border-red-800/60 rounded-full text-xs font-semibold text-red-400 mb-4">
        <QrIcon className="w-3.5 h-3.5 text-red-400" />
        <span>{t.sendSuccessTitle}</span>
      </div>

      <h3 className="text-xl md:text-2xl font-bold text-white mb-2 tracking-tight">
        {t.qrTitle}
      </h3>
      <p className="text-xs md:text-sm text-stone-400 max-w-md mb-6 leading-relaxed">
        {t.qrSubtitle}
      </p>

      {/* QR Code Container with Red Ambient Glow */}
      <div className="relative p-3.5 bg-white rounded-2xl shadow-[0_0_35px_rgba(220,38,38,0.22)] border-2 border-red-500/40 mb-6 group transition-transform duration-300 hover:scale-[1.02]">
        <canvas ref={canvasRef} className="rounded-xl block" />
        <div className="mt-2 text-[11px] font-mono font-semibold text-stone-600 tracking-wider">
          SCAN TO RECEIVE
        </div>
      </div>

      {/* Code Display Card */}
      <div className="w-full max-w-sm bg-stone-950/80 border border-stone-800 rounded-xl p-4 mb-5 flex items-center justify-between">
        <div className="text-left">
          <p className="text-[11px] uppercase tracking-wider text-stone-400 font-medium">
            {t.yourTransferCode}
          </p>
          <p className="font-mono text-2xl font-extrabold text-red-400 tracking-widest tabular-nums">
            {code}
          </p>
        </div>

        <button
          type="button"
          onClick={() => copyToClipboard(code, 'code')}
          className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-stone-850 hover:bg-red-950 text-stone-200 hover:text-white border border-stone-700/60 hover:border-red-700/60 transition-all active:scale-95"
        >
          {copiedCode ? (
            <>
              <Check className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-emerald-400">{t.codeCopied}</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5" />
              <span>{t.copyCode}</span>
            </>
          )}
        </button>
      </div>

      {/* Action Buttons Row */}
      <div className="w-full max-w-sm flex flex-col sm:flex-row items-center gap-2.5 mb-6">
        <button
          type="button"
          onClick={() => copyToClipboard(shareUrl, 'link')}
          className="w-full sm:flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-semibold bg-red-600 hover:bg-red-500 text-white shadow-lg shadow-red-950/50 transition-all active:scale-98"
        >
          {copiedLink ? (
            <>
              <Check className="w-4 h-4 text-white" />
              <span>{t.textCopied}</span>
            </>
          ) : (
            <>
              <ExternalLink className="w-4 h-4" />
              <span>{t.btnCopyLink}</span>
            </>
          )}
        </button>

        <button
          type="button"
          onClick={downloadQrImage}
          className="w-full sm:flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-semibold bg-stone-800 hover:bg-stone-700 text-stone-200 border border-stone-700 hover:text-white transition-all active:scale-98"
        >
          <Download className="w-4 h-4" />
          <span>{t.btnDownloadQr}</span>
        </button>
      </div>

      {/* Secondary Action */}
      <div className="flex items-center gap-4 text-xs text-stone-400">
        <span>{t.expiresIn}</span>
        {onSendAnother && (
          <>
            <span>·</span>
            <button
              type="button"
              onClick={onSendAnother}
              className="text-red-400 hover:text-red-300 font-semibold underline underline-offset-4 cursor-pointer"
            >
              {t.btnSendAnother}
            </button>
          </>
        )}
      </div>
    </div>
  );
};
