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

const readStored = (): CurrencyCode => {
  try {
    const v = localStorage.getItem(STORAGE_KEY) as CurrencyCode | null;
    if (v && CURRENCIES.some((c) => c.code === v)) return v;
  } catch {
    /* ignore */
  }
  return "INR";
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