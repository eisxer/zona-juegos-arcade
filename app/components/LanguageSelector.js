"use client";
import { useLanguage } from "../context/LanguageContext";

export default function LanguageSelector() {
    const { language, setLanguage } = useLanguage();

    return (
        <div className="flex bg-slate-900/50 p-1 rounded-lg border border-cyan-500/30 backdrop-blur-sm">
            <button
                onClick={() => setLanguage('es')}
                className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${language === 'es' ? 'bg-cyan-500 text-slate-950 shadow-md' : 'text-slate-400 hover:text-white'}`}
            >
                ES
            </button>
            <button
                onClick={() => setLanguage('en')}
                className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${language === 'en' ? 'bg-cyan-500 text-slate-950 shadow-md' : 'text-slate-400 hover:text-white'}`}
            >
                EN
            </button>
        </div>
    );
}
