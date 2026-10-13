import React, { useState } from 'react';
import { Globe, ArrowUpRight, ShieldCheck, Zap } from 'lucide-react';
import { Language } from '../types';
import { Translations } from '../locales/translations';

interface HeaderProps {
  currentLang: Language;
  onLanguageChange: (lang: Language) => void;
  activeTab: 'send' | 'receive' | 'history';
  onTabChange: (tab: 'send' | 'receive' | 'history') => void;
  t: Translations;
}

const languages: { code: Language; label: string; flag: string }[] = [
  { code: 'vi', label: 'Tiếng Việt', flag: '🇻🇳' },
  { code: 'en', label: 'English', flag: '🇺🇸' },
  { code: 'ko', label: '한국어', flag: '🇰🇷' },
  { code: 'ja', label: '日本語', flag: '🇯🇵' },
  { code: 'zh', label: '简体中文', flag: '🇨🇳' },
];

export const Header: React.FC<HeaderProps> = ({
  currentLang,
  onLanguageChange,
  activeTab,
  onTabChange,
  t,
}) => {
  const [langMenuOpen, setLangMenuOpen] = useState(false);

  const currentLangObj = languages.find((l) => l.code === currentLang) || languages[0];

  return (
    <header className="sticky top-0 z-40 w-full bg-stone-950/85 backdrop-blur-md border-b border-red-950/60">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-8">
        {/* Zone 1: Brand Wordmark */}
        <div
          onClick={() => onTabChange('send')}
          className="flex items-center gap-2.5 cursor-pointer shrink-0 select-none group"
        >
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-red-500 to-red-700 flex items-center justify-center shadow-lg shadow-red-950/80 group-hover:from-red-450 group-hover:to-red-650 transition-all">
            <Zap className="w-5 h-5 text-white fill-white/20" />
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5">
              <span className="text-xl font-extrabold tracking-tight text-white font-sans">
                Red<span className="text-red-500">Drop</span>
              </span>
              <span className="text-[10px] font-mono tracking-widest text-red-400 bg-red-950/60 border border-red-800/40 px-1.5 py-0.2 rounded uppercase">
                1.2GB
              </span>
            </div>
          </div>
        </div>

        {/* Zone 2: Navigation Links */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
          <button
            type="button"
            onClick={() => onTabChange('send')}
            className={`whitespace-nowrap transition-colors cursor-pointer py-1 ${
              activeTab === 'send'
                ? 'text-red-400 font-semibold border-b-2 border-red-500'
                : 'text-stone-300 hover:text-white'
            }`}
          >
            {t.navSend}
          </button>

          <button
            type="button"
            onClick={() => onTabChange('receive')}
            className={`whitespace-nowrap transition-colors cursor-pointer py-1 ${
              activeTab === 'receive'
                ? 'text-red-400 font-semibold border-b-2 border-red-500'
                : 'text-stone-300 hover:text-white'
            }`}
          >
            {t.navReceive}
          </button>

          <button
            type="button"
            onClick={() => onTabChange('history')}
            className={`whitespace-nowrap transition-colors cursor-pointer py-1 ${
              activeTab === 'history'
                ? 'text-red-400 font-semibold border-b-2 border-red-500'
                : 'text-stone-300 hover:text-white'
            }`}
          >
            {t.navHistory}
          </button>
        </nav>

        {/* Zone 3: Language Selector & Quick Action */}
        <div className="flex items-center gap-3 shrink-0">
          {/* Language Picker Dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setLangMenuOpen(!langMenuOpen)}
              className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-stone-200 bg-stone-900 border border-stone-800 hover:border-red-900/60 rounded-lg transition-colors cursor-pointer"
            >
              <span>{currentLangObj.flag}</span>
              <span className="hidden sm:inline">{currentLangObj.label}</span>
              <Globe className="w-3.5 h-3.5 text-stone-400" />
            </button>

            {langMenuOpen && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setLangMenuOpen(false)}
                />
                <div className="absolute right-0 mt-2 w-40 bg-stone-900 border border-stone-800 rounded-xl shadow-2xl py-1 z-50 animate-fade-in">
                  {languages.map((item) => (
                    <button
                      key={item.code}
                      type="button"
                      onClick={() => {
                        onLanguageChange(item.code);
                        setLangMenuOpen(false);
                      }}
                      className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs text-left transition-colors cursor-pointer ${
                        currentLang === item.code
                          ? 'bg-red-950/70 text-red-300 font-semibold'
                          : 'text-stone-300 hover:bg-stone-800 hover:text-white'
                      }`}
                    >
                      <span className="text-sm">{item.flag}</span>
                      <span>{item.label}</span>
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Quick tab toggle for mobile */}
          <div className="flex md:hidden items-center bg-stone-900 p-0.5 rounded-lg border border-stone-800">
            <button
              type="button"
              onClick={() => onTabChange('send')}
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                activeTab === 'send' ? 'bg-red-600 text-white' : 'text-stone-400'
              }`}
            >
              {t.navSend}
            </button>
            <button
              type="button"
              onClick={() => onTabChange('receive')}
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                activeTab === 'receive' ? 'bg-red-600 text-white' : 'text-stone-400'
              }`}
            >
              {t.navReceive}
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
