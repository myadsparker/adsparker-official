// useGoogleMaps.ts
import { useState, useEffect } from 'react';

// Global flag to prevent multiple script loads
let isScriptLoading = false;
let scriptLoadPromise: Promise<void> | null = null;

export default function useGoogleMaps(apiKey: string) {
  const [isLoaded, setLoaded] = useState(false);

  useEffect(() => {
    console.log('useGoogleMaps: Hook called with apiKey', !!apiKey);
    if (!apiKey) return;

    // Check if Google Maps is already loaded
    if ((window as any).google?.maps?.places) {
      console.log('useGoogleMaps: Google Maps already loaded');
      setLoaded(true);
      return;
    }

    // If script is already loading, wait for it
    if (isScriptLoading && scriptLoadPromise) {
      scriptLoadPromise.then(() => setLoaded(true));
      return;
    }

    // Check if script already exists
    const existingScript = document.querySelector(
      `script[src*="maps.googleapis.com"]`
    );
    if (existingScript) {
      // Script exists but not loaded yet, wait for it
      existingScript.addEventListener('load', () => setLoaded(true));
      return;
    }

    // Start loading script
    console.log('useGoogleMaps: Starting to load Google Maps script');
    isScriptLoading = true;
    scriptLoadPromise = new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
      s.async = true;
      s.onload = () => {
        console.log('useGoogleMaps: Google Maps script loaded successfully');
        isScriptLoading = false;
        setLoaded(true);
        resolve();
      };
      s.onerror = () => {
        console.error('useGoogleMaps: Failed to load Google Maps script');
        isScriptLoading = false;
        reject(new Error('Failed to load Google Maps script'));
      };
      document.head.appendChild(s);
    });

    // Cleanup function
    return () => {
      // Don't remove the script as it might be used by other components
    };
  }, [apiKey]);

  return isLoaded;
}
