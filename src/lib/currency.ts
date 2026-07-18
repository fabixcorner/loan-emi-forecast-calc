export type CurrencyCode =
  | "INR"
  | "USD"
  | "EUR"
  | "GBP"
  | "JPY"
  | "CNY"
  | "AUD"
  | "CAD"
  | "CHF"
  | "SGD";

export interface CurrencyInfo {
  code: CurrencyCode;
  symbol: string;
  name: string;
  locale: string;
}

export const CURRENCIES: CurrencyInfo[] = [
  { code: "INR", symbol: "₹", name: "Indian Rupee", locale: "en-IN" },
  { code: "USD", symbol: "$", name: "US Dollar", locale: "en-US" },
  { code: "EUR", symbol: "€", name: "Euro", locale: "de-DE" },
  { code: "GBP", symbol: "£", name: "British Pound", locale: "en-GB" },
  { code: "JPY", symbol: "¥", name: "Japanese Yen", locale: "ja-JP" },
  { code: "CNY", symbol: "¥", name: "Chinese Yuan", locale: "zh-CN" },
  { code: "AUD", symbol: "A$", name: "Australian Dollar", locale: "en-AU" },
  { code: "CAD", symbol: "C$", name: "Canadian Dollar", locale: "en-CA" },
  { code: "CHF", symbol: "Fr", name: "Swiss Franc", locale: "de-CH" },
  { code: "SGD", symbol: "S$", name: "Singapore Dollar", locale: "en-SG" },
];

const STORAGE_KEY = "preferred_currency";

// Map region (ISO 3166) → supported currency code.
const REGION_TO_CURRENCY: Record<string, CurrencyCode> = {
  IN: "INR",
  US: "USD", EC: "USD", SV: "USD", PA: "USD", PR: "USD",
  GB: "GBP",
  JP: "JPY",
  CN: "CNY",
  AU: "AUD",
  CA: "CAD",
  CH: "CHF", LI: "CHF",
  SG: "SGD",
  // Eurozone
  DE: "EUR", FR: "EUR", ES: "EUR", IT: "EUR", NL: "EUR", BE: "EUR", AT: "EUR",
  PT: "EUR", IE: "EUR", FI: "EUR", GR: "EUR", LU: "EUR", SK: "EUR", SI: "EUR",
  EE: "EUR", LV: "EUR", LT: "EUR", CY: "EUR", MT: "EUR", HR: "EUR",
};

const detectLocalCurrency = (): CurrencyCode => {
  try {
    // Prefer explicit region from resolved locale.
    const locales: string[] = [
      ...(navigator.languages ?? []),
      navigator.language,
    ].filter(Boolean) as string[];
    for (const loc of locales) {
      try {
        const region = new Intl.Locale(loc).maximize().region;
        if (region && REGION_TO_CURRENCY[region]) return REGION_TO_CURRENCY[region];
      } catch { /* ignore */ }
    }
    // Fallback: infer region from timezone.
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "";
    if (tz.startsWith("Asia/Kolkata") || tz.startsWith("Asia/Calcutta")) return "INR";
    if (tz.startsWith("America/")) return "USD";
    if (tz.startsWith("Europe/London")) return "GBP";
    if (tz.startsWith("Europe/")) return "EUR";
    if (tz.startsWith("Asia/Tokyo")) return "JPY";
    if (tz.startsWith("Asia/Shanghai") || tz.startsWith("Asia/Hong_Kong")) return "CNY";
    if (tz.startsWith("Australia/")) return "AUD";
    if (tz.startsWith("Asia/Singapore")) return "SGD";
  } catch { /* ignore */ }
  return "INR";
};

const readStored = (): CurrencyCode => {
  try {
    const v = localStorage.getItem(STORAGE_KEY) as CurrencyCode | null;
    if (v && CURRENCIES.some((c) => c.code === v)) return v;
  } catch {
    /* ignore */
  }
  return detectLocalCurrency();
};

let currentCode: CurrencyCode = typeof window !== "undefined" ? readStored() : "INR";
const listeners = new Set<() => void>();

export const getCurrency = (): CurrencyInfo =>
  CURRENCIES.find((c) => c.code === currentCode) ?? CURRENCIES[0];

export const getCurrencyCode = (): CurrencyCode => currentCode;

export const setCurrency = (code: CurrencyCode) => {
  if (!CURRENCIES.some((c) => c.code === code)) return;
  if (currentCode === code) return;
  currentCode = code;
  try {
    localStorage.setItem(STORAGE_KEY, code);
  } catch {
    /* ignore */
  }
  listeners.forEach((fn) => fn());
};

export const subscribeCurrency = (fn: () => void) => {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
};

export const formatCurrency = (
  amount: number,
  options?: { maximumFractionDigits?: number },
): string => {
  const c = getCurrency();
  try {
    return new Intl.NumberFormat(c.locale, {
      style: "currency",
      currency: c.code,
      maximumFractionDigits: options?.maximumFractionDigits ?? 0,
    }).format(amount);
  } catch {
    return `${c.symbol}${amount.toLocaleString()}`;
  }
};

export const formatCompactAmount = (amount: number): string => {
  const c = getCurrency();
  const s = c.symbol;
  const abs = Math.abs(amount);
  if (c.code === "INR") {
    if (abs >= 1_00_00_000) return `${s}${(amount / 1_00_00_000).toFixed(1)} Cr`;
    if (abs >= 1_00_000) return `${s}${(amount / 1_00_000).toFixed(1)} L`;
    if (abs >= 1_000) return `${s}${(amount / 1_000).toFixed(0)}K`;
    return `${s}${amount.toLocaleString(c.locale)}`;
  }
  if (abs >= 1_000_000_000) return `${s}${(amount / 1_000_000_000).toFixed(1)}B`;
  if (abs >= 1_000_000) return `${s}${(amount / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${s}${(amount / 1_000).toFixed(1)}K`;
  return `${s}${amount.toLocaleString(c.locale)}`;
};

// Fixed compact labels for slider endpoints (independent of stored amount magnitude).
export const formatCompactLabel = (indianAbbrev: "K" | "L" | "Cr", multiplier: number): string => {
  const c = getCurrency();
  const s = c.symbol;
  if (c.code === "INR") {
    return `${s}${multiplier}${indianAbbrev}`;
  }
  // Convert INR abbreviation to universal form.
  const value =
    indianAbbrev === "K"
      ? multiplier * 1_000
      : indianAbbrev === "L"
        ? multiplier * 100_000
        : multiplier * 10_000_000;
  return formatCompactAmount(value);
};