import React, { useState, useEffect, useCallback } from 'react';
import { Header } from './components/Header';
import { SendSection } from './components/SendSection';
import { ReceiveSection } from './components/ReceiveSection';
import { HistorySection } from './components/HistorySection';
import { Language } from './types';
import { translations } from './locales/translations';
import { extractCodeFromUrl } from './utils/transferUtils';
import { Zap, ShieldCheck, QrCode, HardDrive, Smartphone, CheckCircle } from 'lucide-react';

export default function App() {
  const [currentLang, setCurrentLang] = useState<Language>('vi');
  const [activeTab, setActiveTab] = useState<'send' | 'receive' | 'history'>('send');
  const [targetCode, setTargetCode] = useState<string | null>(null);

  const t = translations[currentLang] || translations.vi;

  // Check URL deep link for code on mount and on hashchange
  const checkUrlForCode = useCallback(() => {
    if (typeof window === 'undefined') return;

    const fullUrl = window.location.href;
    const parsedCode = extractCodeFromUrl(window.location.hash || window.location.search || fullUrl);

    if (parsedCode) {
      setTargetCode(parsedCode);
      setActiveTab('receive');
    }
  }, []);

  useEffect(() => {
    // Read saved language preference
    const savedLang = localStorage.getItem('reddrop_lang') as Language;
    if (savedLang && translations[savedLang]) {
      setCurrentLang(savedLang);
    }

    checkUrlForCode();
    window.addEventListener('hashchange', checkUrlForCode);
    return () => {
      window.removeEventListener('hashchange', checkUrlForCode);
    };
  }, [checkUrlForCode]);

  const handleLanguageChange = (lang: Language) => {
    setCurrentLang(lang);
    localStorage.setItem('reddrop_lang', lang);
  };

  const handleSelectHistoryCode = (code: string) => {
    setTargetCode(code);
    setActiveTab('receive');
  };

  return (
    <div className="min-h-screen bg-stone-950 text-stone-100 flex flex-col selection:bg-red-600 selection:text-white">
      {/* Top Header */}
      <Header
        currentLang={currentLang}
        onLanguageChange={handleLanguageChange}
        activeTab={activeTab}
        onTabChange={(tab) => {
          setActiveTab(tab);
          if (tab === 'send') setTargetCode(null);
        }}
        t={t}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12 flex flex-col justify-between">
        {/* Navigation Tabs Bar for Desktop & Mobile */}
        <div className="flex justify-center mb-8">
          <div className="inline-flex p-1 bg-stone-900/90 border border-stone-800 rounded-2xl shadow-inner">
            <button
              type="button"
              onClick={() => {
                setActiveTab('send');
                setTargetCode(null);
              }}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs md:text-sm font-bold transition-all cursor-pointer ${
                activeTab === 'send'
                  ? 'bg-red-600 text-white shadow-lg shadow-red-950/80 scale-[1.02]'
                  : 'text-stone-400 hover:text-white hover:bg-stone-850'
              }`}
            >
              <Zap className="w-4 h-4" />
              <span>{t.navSend}</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('receive')}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs md:text-sm font-bold transition-all cursor-pointer ${
                activeTab === 'receive'
                  ? 'bg-red-600 text-white shadow-lg shadow-red-950/80 scale-[1.02]'
                  : 'text-stone-400 hover:text-white hover:bg-stone-850'
              }`}
            >
              <QrCode className="w-4 h-4" />
              <span>{t.navReceive}</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('history')}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs md:text-sm font-bold transition-all cursor-pointer ${
                activeTab === 'history'
                  ? 'bg-red-600 text-white shadow-lg shadow-red-950/80 scale-[1.02]'
                  : 'text-stone-400 hover:text-white hover:bg-stone-850'
              }`}
            >
              <span>{t.navHistory}</span>
            </button>
          </div>
        </div>

        {/* Content by active tab */}
        <div className="flex-1">
          {activeTab === 'send' && (
            <SendSection
              t={t}
              onTransferCreated={(data) => {
                setTargetCode(data.code);
              }}
            />
          )}

          {activeTab === 'receive' && (
            <ReceiveSection
              t={t}
              initialCode={targetCode}
              onReceiveSuccess={() => {}}
            />
          )}

          {activeTab === 'history' && (
            <HistorySection
              t={t}
              onSelectCode={handleSelectHistoryCode}
            />
          )}
        </div>

        {/* Feature Highlights Grid */}
        <div className="mt-16 pt-8 border-t border-stone-800/80 grid grid-cols-2 lg:grid-cols-4 gap-4 text-left">
          <div className="p-4 rounded-xl bg-stone-900/40 border border-stone-800/60 flex items-start gap-3">
            <div className="p-2 rounded-lg bg-red-950/70 text-red-400 shrink-0">
              <Zap className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-white mb-0.5">Tốc độ tức thì</h4>
              <p className="text-[11px] text-stone-400">{t.featureFast}</p>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-stone-900/40 border border-stone-800/60 flex items-start gap-3">
            <div className="p-2 rounded-lg bg-red-950/70 text-red-400 shrink-0">
              <HardDrive className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-white mb-0.5">Dung lượng lớn</h4>
              <p className="text-[11px] text-stone-400">{t.featureLimit}</p>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-stone-900/40 border border-stone-800/60 flex items-start gap-3">
            <div className="p-2 rounded-lg bg-red-950/70 text-red-400 shrink-0">
              <Smartphone className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-white mb-0.5">Camera & #code</h4>
              <p className="text-[11px] text-stone-400">{t.featureQr}</p>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-stone-900/40 border border-stone-800/60 flex items-start gap-3">
            <div className="p-2 rounded-lg bg-red-950/70 text-red-400 shrink-0">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-white mb-0.5">An toàn & Tự hủy</h4>
              <p className="text-[11px] text-stone-400">{t.featureSecure}</p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full border-t border-stone-900 bg-stone-950 py-6 text-center text-xs text-stone-400">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="font-extrabold text-white">RedDrop</span>
            <span>·</span>
            <span>Chuyển dữ liệu tốc độ cao</span>
          </div>

          <div className="flex items-center gap-4 text-stone-400">
            <span>Hỗ trợ tệp 1.2GB</span>
            <span>·</span>
            <span>Quét QR Camera</span>
            <span>·</span>
            <span className="text-red-400 font-mono">MIT License</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
