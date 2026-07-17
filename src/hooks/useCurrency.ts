import { useSyncExternalStore } from "react";
import {
  CURRENCIES,
  formatCompactAmount,
  formatCompactLabel,
  formatCurrency,
  getCurrency,
  getCurrencyCode,
  setCurrency,
  subscribeCurrency,
  type CurrencyCode,
  type CurrencyInfo,
} from "@/lib/currency";

export const useCurrency = () => {
  useSyncExternalStore(
    (cb) => subscribeCurrency(cb),
    () => getCurrencyCode(),
    () => "INR" as CurrencyCode,
  );
  const currency: CurrencyInfo = getCurrency();
  return {
    currency,
    code: currency.code,
    symbol: currency.symbol,
    format: formatCurrency,
    formatCompact: formatCompactAmount,
    formatCompactLabel,
    setCurrency,
    currencies: CURRENCIES,
  };
};