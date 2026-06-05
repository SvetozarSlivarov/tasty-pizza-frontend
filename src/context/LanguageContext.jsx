import { createContext, useContext, useMemo, useState } from "react";
import { LANGUAGE_LABELS, translate, translateEnum } from "../i18n/translations";

export const SUPPORTED_LANGUAGES = ["en", "bg", "de", "fr"];
export { LANGUAGE_LABELS };

const LanguageContext = createContext(null);

export function LanguageProvider({ children }) {
    const [language, setLanguageState] = useState(() => {
        const stored = window.localStorage.getItem("language");
        return SUPPORTED_LANGUAGES.includes(stored) ? stored : "en";
    });

    function setLanguage(nextLanguage) {
        const safeLanguage = SUPPORTED_LANGUAGES.includes(nextLanguage) ? nextLanguage : "en";
        setLanguageState(safeLanguage);
        window.localStorage.setItem("language", safeLanguage);
    }

    const value = useMemo(() => ({
        language,
        setLanguage,
        t: (text, fallback) => translate(language, text, fallback),
        enumLabel: (value) => translateEnum(language, value),
    }), [language]);

    return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
    const context = useContext(LanguageContext);
    if (!context) {
        throw new Error("useLanguage must be used inside LanguageProvider");
    }
    return context;
}
