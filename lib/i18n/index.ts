import { en, type EnglishDictionary } from "./en";
import { fr } from "./fr";

export type Locale = "en" | "fr";
export type Dictionary = EnglishDictionary;

export const LOCALE_COOKIE = "NEXT_LOCALE";
export const SUPPORTED_LOCALES: Locale[] = ["en", "fr"];

export const dictionaries: Record<Locale, Dictionary> = {
  en,
  fr,
};

export function normalizeLocale(value: unknown): Locale {
  return value === "fr" ? "fr" : "en";
}

export function isSupportedLocale(value: unknown): value is Locale {
  return value === "en" || value === "fr";
}

export function getDictionary(locale: Locale): Dictionary {
  return dictionaries[locale];
}

function readKey(dictionary: Dictionary, key: string): string | undefined {
  const value = key
    .split(".")
    .reduce<unknown>((current, part) => {
      if (!current || typeof current !== "object") return undefined;
      return (current as Record<string, unknown>)[part];
    }, dictionary);

  return typeof value === "string" ? value : undefined;
}

function humanizeKey(key: string) {
  const last = key.split(".").pop() ?? key;
  return last
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function lookup(dictionary: Dictionary, key: string, locale: Locale): string {
  const value = readKey(dictionary, key);
  if (value !== undefined) return value;

  // Never render a raw dotted key. Prefer the English source string and
  // report the gap so the missing translation can be filled in.
  const english = locale === "en" ? undefined : readKey(en, key);
  if (english !== undefined) {
    if (typeof console !== "undefined") {
      console.warn(`[i18n] Missing ${locale} translation for "${key}".`);
    }
    return english;
  }

  if (typeof console !== "undefined") {
    console.warn(`[i18n] Unknown translation key "${key}".`);
  }
  return humanizeKey(key);
}

export function interpolate(
  template: string,
  values?: Record<string, string | number>
) {
  if (!values) return template;
  return template.replace(/\{(\w+)\}/g, (match, key: string) =>
    key in values ? String(values[key]) : match
  );
}

export interface Translator {
  locale: Locale;
  t: (key: string, values?: Record<string, string | number>) => string;
}

export function createTranslator(locale: Locale): Translator {
  const dictionary = getDictionary(locale);
  return {
    locale,
    t: (key, values) => interpolate(lookup(dictionary, key, locale), values),
  };
}
