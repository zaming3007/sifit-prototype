import apiClient from './apiClient';
import { API_ENDPOINTS } from '../constants/apiEndpoints';

let scriptPromise;
let configPromise;
export function getGoogleConfiguration() {
  // React Strict Mode mounts twice. Share the pending request so both mounts receive the same cookie-bound nonce.
  if (!configPromise) configPromise = apiClient.get(API_ENDPOINTS.auth.googleConfig)
    .then(response => response.data.data).finally(() => { configPromise = null; });
  return configPromise;
}

export function loadGoogleIdentity() {
  if (window.google?.accounts?.id) return Promise.resolve(window.google.accounts.id);
  if (!scriptPromise) scriptPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    const timeout = setTimeout(() => { script.remove(); scriptPromise = null; reject(new Error('Google sign-in timed out')); }, 15000);
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.onload = () => {
      clearTimeout(timeout);
      if (window.google?.accounts?.id) resolve(window.google.accounts.id);
      else { script.remove(); scriptPromise = null; reject(new Error('Google sign-in unavailable')); }
    };
    script.onerror = () => { clearTimeout(timeout); script.remove(); scriptPromise = null; reject(new Error('Google sign-in unavailable')); };
    document.head.appendChild(script);
  });
  return scriptPromise;
}
