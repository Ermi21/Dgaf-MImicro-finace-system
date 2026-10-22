import { createContext, useContext } from "react";
import en from "./en";
import am from "./am";

export type Language = "en" | "am";

const dictionaries: Record<Language, typeof en> = { en, am };

export function getDictionary(lang: Language): typeof en {
  return dictionaries[lang];
}

interface I18nContextValue {
  lang: Language;
  setLang: (lang: Language) => void;
  t: typeof en;
}

export const I18nContext = createContext<I18nContextValue | null>(null);

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used within an I18nProvider");
  return ctx;
}
