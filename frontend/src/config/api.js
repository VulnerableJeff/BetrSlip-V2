/**
 * Always use the current domain for API calls.
 * Emergent's Kubernetes ingress routes /api/* to the backend automatically.
 */
export const BACKEND_URL = typeof window !== 'undefined' ? window.location.origin : '';
