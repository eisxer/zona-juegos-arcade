"use client";
import { createContext, useContext, useState, useEffect } from "react";
import { translations } from "../data/translations";

const LanguageContext = createContext();

export function LanguageProvider({ children }) {
    const [language, setLanguage] = useState("es");
    const [isLoaded, setIsLoaded] = useState(false);

    useEffect(() => {
        try {
            const saved = localStorage.getItem("arcade_lang");
            const browser = navigator.language.startsWith("en") ? "en" : "es";
            setLanguage(saved || browser);
        } catch (e) {
            console.warn("LocalStorage access failed for language preference");
        }
        setIsLoaded(true);
    }, []);

    const toggleLanguage = (lang) => {
        setLanguage(lang);
        try {
            localStorage.setItem("arcade_lang", lang);
        } catch (e) {
            console.warn("Could not save language preference");
        }
    };

    const t = translations[language];

    if (!isLoaded) return <div className="min-h-screen bg-slate-950"></div>;

    return (
        <LanguageContext.Provider value={{ language, setLanguage: toggleLanguage, t }}>
            {children}
        </LanguageContext.Provider>
    );
}

export const useLanguage = () => useContext(LanguageContext);
