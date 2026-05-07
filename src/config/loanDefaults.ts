/**
 * Default values for the main Loan EMI calculator inputs.
 *
 * Edit these to change the initial loan amount, interest rate,
 * tenure (in years), and start date used when the page first loads.
 */

export const LOAN_DEFAULTS = {
  /** Default loan principal in rupees. */
  LOAN_AMOUNT: 2000000, // 20 lakhs
  /** Default annual interest rate (percent). */
  INTEREST_RATE: 8.0,
  /** Default loan tenure in years. */
  TENURE_YEARS: 15,
} as const;

/**
 * Returns the default start month (1-12) for a new loan.
 * Defaults to the current month so the calculator feels current on load.
 */
export const getDefaultStartMonth = (): number => new Date().getMonth() + 1;

/**
 * Returns the default start year for a new loan.
 * Defaults to the current year.
 */
export const getDefaultStartYear = (): number => new Date().getFullYear();
