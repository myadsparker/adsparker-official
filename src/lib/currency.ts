/**
 * Currency utilities for multi-currency support
 * Handles currency symbols, formatting, and conversion
 */

export type Currency = 'USD' | 'INR' | 'EUR' | 'GBP' | 'AUD' | 'CAD' | 'SGD' | 'AED' | 'BRL' | 'MXN';

export const CURRENCY_SYMBOLS: Record<Currency, string> = {
  USD: '$',
  INR: '₹',
  EUR: '€',
  GBP: '£',
  AUD: 'A$',
  CAD: 'C$',
  SGD: 'S$',
  AED: 'د.إ',
  BRL: 'R$',
  MXN: 'Mex$',
};

export const CURRENCY_CODES: Record<Currency, string> = {
  USD: 'US Dollar',
  INR: 'Indian Rupee',
  EUR: 'Euro',
  GBP: 'British Pound',
  AUD: 'Australian Dollar',
  CAD: 'Canadian Dollar',
  SGD: 'Singapore Dollar',
  AED: 'UAE Dirham',
  BRL: 'Brazilian Real',
  MXN: 'Mexican Peso',
};

/**
 * Get currency symbol for a currency code
 * @param currency Currency code (e.g., 'USD', 'INR')
 * @returns Currency symbol (e.g., '$', '₹')
 */
export function getCurrencySymbol(currency: string): string {
  return CURRENCY_SYMBOLS[currency as Currency] || currency;
}

/**
 * Format amount with currency symbol
 * @param amount Amount to format
 * @param currency Currency code
 * @param decimals Number of decimal places (default: 2)
 * @returns Formatted string (e.g., '$75.00', '₹750.00')
 */
export function formatCurrency(amount: number, currency: string, decimals: number = 2): string {
  const symbol = getCurrencySymbol(currency);
  const formattedAmount = amount.toFixed(decimals);
  
  // For some currencies, symbol goes after the amount
  if (currency === 'BRL') {
    return `${symbol} ${formattedAmount}`;
  }
  
  return `${symbol}${formattedAmount}`;
}

/**
 * Parse currency string to number
 * @param currencyString String like '$75.00' or '₹750.00'
 * @returns Number value
 */
export function parseCurrency(currencyString: string): number {
  // Remove all non-numeric characters except decimal point
  const cleanedString = currencyString.replace(/[^0-9.]/g, '');
  return parseFloat(cleanedString) || 0;
}

/**
 * Get minimum budget for Meta ads based on currency
 * Meta has different minimum budgets for different currencies
 * @param currency Currency code
 * @returns Minimum daily budget in that currency
 */
export function getMinimumBudget(currency: string): number {
  const minimumBudgets: Record<string, number> = {
    USD: 1.00,
    INR: 40.00,     // Meta's actual minimum for INR
    EUR: 1.00,
    GBP: 1.00,
    AUD: 1.50,
    CAD: 1.50,
    SGD: 1.50,
    AED: 4.00,
    BRL: 5.00,
    MXN: 20.00,
  };
  
  return minimumBudgets[currency] || 1.00;
}

/**
 * Convert budget from one currency to another using approximate exchange rates
 * NOTE: This is for display purposes only. Meta will charge in the ad account's currency.
 * @param amount Amount to convert
 * @param fromCurrency Source currency
 * @param toCurrency Target currency
 * @returns Converted amount
 */
export function convertCurrency(amount: number, fromCurrency: string, toCurrency: string): number {
  if (fromCurrency === toCurrency) {
    return amount;
  }

  // Approximate exchange rates (update these periodically)
  // All rates are relative to USD
  const exchangeRates: Record<string, number> = {
    USD: 1.00,
    INR: 83.00,     // 1 USD = 83 INR (approx)
    EUR: 0.92,      // 1 USD = 0.92 EUR (approx)
    GBP: 0.79,      // 1 USD = 0.79 GBP (approx)
    AUD: 1.53,      // 1 USD = 1.53 AUD (approx)
    CAD: 1.36,      // 1 USD = 1.36 CAD (approx)
    SGD: 1.35,      // 1 USD = 1.35 SGD (approx)
    AED: 3.67,      // 1 USD = 3.67 AED (approx)
    BRL: 5.00,      // 1 USD = 5.00 BRL (approx)
    MXN: 17.00,     // 1 USD = 17.00 MXN (approx)
  };

  const fromRate = exchangeRates[fromCurrency] || 1;
  const toRate = exchangeRates[toCurrency] || 1;

  // Convert to USD first, then to target currency
  const amountInUSD = amount / fromRate;
  const convertedAmount = amountInUSD * toRate;

  return convertedAmount;
}

/**
 * Get appropriate slider range for currency
 * Different currencies have different practical ranges
 * @param currency Currency code
 * @returns { min, max, default } values for budget slider
 */
export function getBudgetRange(currency: string): { min: number; max: number; default: number } {
  const ranges: Record<string, { min: number; max: number; default: number }> = {
    USD: { min: 2, max: 150, default: 75 },
    INR: { min: 150, max: 12000, default: 6000 },    // ~$2 to $150
    EUR: { min: 2, max: 140, default: 70 },
    GBP: { min: 2, max: 120, default: 60 },
    AUD: { min: 3, max: 230, default: 115 },
    CAD: { min: 3, max: 200, default: 100 },
    SGD: { min: 3, max: 200, default: 100 },
    AED: { min: 7, max: 550, default: 275 },
    BRL: { min: 10, max: 750, default: 375 },
    MXN: { min: 35, max: 2550, default: 1275 },
  };

  return ranges[currency] || ranges.USD;
}

