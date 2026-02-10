/**
 * API configuration - resolves the correct backend URL.
 * In production deployment, uses the current domain (same-origin).
 * In preview/development, uses REACT_APP_BACKEND_URL.
 */
const envUrl = process.env.REACT_APP_BACKEND_URL || '';
const currentOrigin = typeof window !== 'undefined' ? window.location.origin : '';

// Use current origin if we're NOT on the preview domain
// This ensures custom domains work automatically
const isPreview = currentOrigin.includes('.preview.emergentagent.com');
const isLocalhost = currentOrigin.includes('localhost') || currentOrigin.includes('127.0.0.1');

export const BACKEND_URL = (isPreview || isLocalhost) ? envUrl : currentOrigin;
