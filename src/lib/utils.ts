import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { APP_CONFIG } from "@/config/app";

/**
 * Standard Tailwind merge helper
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format integer paise into standard Indian Rupee notation (e.g., 15050 paise -> "₹150.50")
 * Uses Indian numbering format (e.g. 1,00,000.00)
 */
export function formatPaise(
  paise: number,
  options: {
    showSign?: boolean;
    compact?: boolean;
    includeSymbol?: boolean;
  } = {}
): string {
  const { showSign = false, compact = false, includeSymbol = true } = options;

  const isNegative = paise < 0;
  const absPaise = Math.abs(paise);
  const rupees = absPaise / 100;

  // Indian locale formatter
  const formattedNumber = new Intl.NumberFormat("en-IN", {
    minimumFractionDigits: compact && absPaise % 100 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(rupees);

  const symbol = includeSymbol ? `${APP_CONFIG.currency.symbol} ` : "";
  const sign = isNegative ? "- " : showSign && paise > 0 ? "+ " : "";

  return `${sign}${symbol}${formattedNumber}`;
}

/**
 * Parse a rupee string or number into integer paise safely.
 * Prevents floating point errors like 0.1 + 0.2 != 0.3.
 * Example: "150.50" -> 15050
 * Example: "100" -> 10000
 * Example: "0.99" -> 99
 */
export function parseRupeesToPaise(input: string | number): number {
  if (typeof input === "number") {
    return Math.round(input * 100);
  }

  const clean = input.trim().replace(/[^\d.-]/g, "");
  if (!clean || isNaN(Number(clean))) return 0;

  const parts = clean.split(".");
  const whole = parseInt(parts[0] || "0", 10);
  const fractionStr = (parts[1] || "").padEnd(2, "0").slice(0, 2);
  const fraction = parseInt(fractionStr, 10);

  const sign = whole < 0 || clean.startsWith("-") ? -1 : 1;
  return sign * (Math.abs(whole) * 100 + fraction);
}

/**
 * Convert paise to a numeric rupee value for input fields
 */
export function paiseToRupees(paise: number): number {
  return paise / 100;
}

/**
 * Convert paise to string for text input fields (e.g. 15050 -> "150.50")
 */
export function paiseToInputString(paise: number): string {
  if (paise === 0) return "";
  return (paise / 100).toFixed(2).replace(/\.00$/, "");
}
