/**
 * Application Configuration
 * All branding, naming, theme colors, and currency settings are centrally configurable here.
 */

export const APP_CONFIG = {
  name: "Evenly",
  legalName: "Evenly",
  tagline: "Split expenses evenly with friends",
  description: "A fast, Android-first expense sharing application designed for seamless Indian Rupee splitting.",
  currency: {
    symbol: "₹",
    code: "INR",
    name: "Indian Rupee",
    subunit: "Paise",
    subunitPerUnit: 100,
  },
  theme: {
    // Deep emerald green fintech palette
    primaryColor: "#065F46", // Emerald 800
    primaryLight: "#059669", // Emerald 600
    primaryDark: "#064E3B",  // Emerald 900
    accentColor: "#10B981",  // Emerald 500
    tintBg: "#ECFDF5",       // Emerald 50
    backgroundColor: "#F8FAF8", // Soft off-white
    surfaceColor: "#FFFFFF",
    textPrimary: "#111827",
    textSecondary: "#6B7280",
    positiveBalance: "#059669", // Green
    negativeBalance: "#DC2626", // Soft Red
    borderSubtle: "#E5E7EB",
  },
  navigation: {
    items: [
      { label: "Home", href: "/", icon: "Home" },
      { label: "Friends", href: "/friends", icon: "Users" },
      { label: "Groups", href: "/groups", icon: "FolderKanban" },
      { label: "Activity", href: "/activity", icon: "Clock" },
    ],
  },
  links: {
    inviteUrlPrefix: "https://evenly.app/invite/",
  },
} as const;

export type AppConfig = typeof APP_CONFIG;
