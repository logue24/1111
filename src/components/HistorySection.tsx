import React, { useState, useEffect } from 'react';
import { Clock, ArrowUpRight, ArrowDownLeft, Trash2, File, CheckCircle, ExternalLink } from 'lucide-react';
import { Translations } from '../locales/translations';
import { formatBytes } from '../utils/transferUtils';

interface HistoryItem {
  code: string;
  type: 'send' | 'receive';
  timestamp: number;
  fileCount: number;
  totalSize: number;
  hasText: boolean;
}

interface HistorySectionProps {
  t: Translations;
  onSelectCode: (code: string) => void;
}

export const HistorySection: React.FC<HistorySectionProps> = ({ t, onSelectCode }) => {
  const [history, setHistory] = useState<HistoryItem[]>([]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('reddrop_history');
      if (stored) {
        setHistory(JSON.parse(stored));
      }
    } catch (e) {
      console.warn('Failed to load history', e);
    }
  }, []);

  const clearHistory = () => {
    localStorage.removeItem('reddrop_history');
    setHistory([]);
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6 animate-fade-in">
      <div className="flex items-center justify-between pb-3 border-b border-stone-800">
        <div className="flex items-center gap-2">
          <Clock className="w-5 h-5 text-red-400" />
          <h2 className="text-xl font-bold text-white tracking-tight">
            {t.recentTransfers}
          </h2>
        </div>

        {history.length > 0 && (
          <button
            type="button"
            onClick={clearHistory}
            className="text-xs text-stone-400 hover:text-red-400 flex items-center gap-1 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Xóa lịch sử</span>
          </button>
        )}
      </div>

      {history.length === 0 ? (
        <div className="py-16 text-center bg-stone-900/40 border border-stone-800/80 rounded-2xl p-8">
          <Clock className="w-12 h-12 text-stone-600 mx-auto mb-3" />
          <p className="text-stone-400 text-sm">{t.noHistory}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {history.map((item, idx) => (
            <div
              key={`${item.code}-${idx}`}
              onClick={() => onSelectCode(item.code)}
              className="flex items-center justify-between gap-4 p-4 rounded-xl bg-stone-900/80 border border-stone-800 hover:border-red-900/60 hover:bg-stone-850 cursor-pointer transition-all group"
            >
              <div className="flex items-center gap-3.5">
                <div
                  className={`p-2.5 rounded-xl border ${
                    item.type === 'send'
                      ? 'bg-red-950/60 border-red-800/50 text-red-400'
                      : 'bg-emerald-950/60 border-emerald-800/50 text-emerald-400'
                  }`}
                >
                  {item.type === 'send' ? (
                    <ArrowUpRight className="w-4 h-4" />
                  ) : (
                    <ArrowDownLeft className="w-4 h-4" />
                  )}
                </div>

                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm font-bold text-white group-hover:text-red-400 transition-colors">
                      {item.code}
                    </span>
                    <span
                      className={`text-[10px] uppercase font-mono px-1.5 py-0.5 rounded border ${
                        item.type === 'send'
                          ? 'bg-red-950/80 text-red-300 border-red-800/50'
                          : 'bg-emerald-950/80 text-emerald-300 border-emerald-800/50'
                      }`}
                    >
                      {item.type === 'send' ? t.badgeSent : t.badgeReceived}
                    </span>
                  </div>

                  <p className="text-xs text-stone-400 font-mono mt-0.5">
                    {new Date(item.timestamp).toLocaleString()} · {item.fileCount} tệp ({formatBytes(item.totalSize)}) {item.hasText && '· Có văn bản'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 text-xs font-semibold text-stone-400 group-hover:text-red-400 transition-colors">
                <span>Mở gói</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
