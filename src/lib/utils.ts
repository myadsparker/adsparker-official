import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Get the site URL based on the current environment
 * - In browser: uses window.location.origin (handles localhost automatically)
 * - In server: uses NEXT_PUBLIC_SITE_URL or defaults to localhost for development
 */
export function getSiteUrl(): string {
  // Client-side: use window.location.origin (automatically detects localhost)
  if (typeof window !== 'undefined') {
    return window.location.origin;
  }

  // Server-side: use environment variable or default
  const envUrl = process.env.NEXT_PUBLIC_SITE_URL;
  
  // If NEXT_PUBLIC_SITE_URL is set, use it
  if (envUrl) {
    return envUrl;
  }

  // Default to localhost for development
  // In production, NEXT_PUBLIC_SITE_URL should be set
  return 'http://localhost:3000';
}
