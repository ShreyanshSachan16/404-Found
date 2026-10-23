/**
 * 404 FOUND — Central API Client & Media URL Resolver
 *
 * Provides unified network communications for:
 * 1. Hosted React Web Client (Same-origin or custom CORS host)
 * 2. Packaged Windows Electron Desktop Client (Configurable central Express API)
 */

const STORAGE_KEY = '404found_api_base_url';

export const isElectron = typeof window !== 'undefined' && Boolean(window.electronAPI?.isElectron);

// Default fallback API URL when running in Electron desktop
const DEFAULT_ELECTRON_API = import.meta.env.VITE_API_URL || 'http://localhost:5001';
const DEFAULT_WEB_API = import.meta.env.VITE_API_URL || '';

let cachedBaseUrl = null;

export function getApiBaseUrl() {
  if (cachedBaseUrl !== null) return cachedBaseUrl;

  // 1. In Electron desktop, dynamic loopback origin takes priority over stale cached ports
  if (isElectron) {
    if (typeof window !== 'undefined' && window.location?.origin && /^https?:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/i.test(window.location.origin)) {
      cachedBaseUrl = window.location.origin.replace(/\/+$/, '');
      return cachedBaseUrl;
    }
  }

  // 2. Check local storage override if user configured a remote/custom API URL
  if (typeof window !== 'undefined' && window.localStorage) {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved && saved.trim()) {
      const isLoopbackSaved = /^https?:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/i.test(saved.trim());
      if (!isElectron || !isLoopbackSaved) {
        cachedBaseUrl = saved.trim().replace(/\/+$/, '');
        return cachedBaseUrl;
      }
    }
  }

  // 3. Platform default fallback
  if (isElectron) {
    cachedBaseUrl = DEFAULT_ELECTRON_API.replace(/\/+$/, '');
  } else {
    cachedBaseUrl = DEFAULT_WEB_API.replace(/\/+$/, '');
  }

  return cachedBaseUrl;
}

export function setApiBaseUrl(newUrl, persist = true) {
  const sanitized = (newUrl || '').trim().replace(/\/+$/, '');
  cachedBaseUrl = sanitized;
  if (persist && typeof window !== 'undefined' && window.localStorage) {
    if (sanitized) {
      window.localStorage.setItem(STORAGE_KEY, sanitized);
    } else {
      window.localStorage.removeItem(STORAGE_KEY);
    }
  }

  // If in Electron, notify backend configuration if available
  if (isElectron && window.electronAPI?.setApiUrl) {
    window.electronAPI.setApiUrl(sanitized).catch(() => {});
  }

  notifyStatusListeners();
  return cachedBaseUrl;
}

// Initialize from Electron bridge if available to ensure dynamic port synchronization
if (isElectron && window.electronAPI?.getApiUrl) {
  window.electronAPI.getApiUrl().then((electronConfiguredUrl) => {
    if (electronConfiguredUrl) {
      cachedBaseUrl = electronConfiguredUrl.trim().replace(/\/+$/, '');
      notifyStatusListeners();
    }
  }).catch(() => {});
}

/**
 * Resolves full API endpoint path
 */
export function apiUrl(endpoint = '') {
  if (endpoint.startsWith('http://') || endpoint.startsWith('https://')) {
    return endpoint;
  }

  const base = getApiBaseUrl();
  const normalizedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;

  if (!base) {
    return normalizedEndpoint;
  }

  return `${base}${normalizedEndpoint}`;
}

/**
 * Resolves full media URL for uploaded item photos and assets
 */
export function mediaUrl(path) {
  if (!path) return '';
  if (
    path.startsWith('http://') ||
    path.startsWith('https://') ||
    path.startsWith('data:') ||
    path.startsWith('blob:')
  ) {
    return path;
  }

  const base = getApiBaseUrl();
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;

  if (!base) {
    return normalizedPath;
  }

  return `${base}${normalizedPath}`;
}

// Connection State Management & Listeners
let connectionState = {
  isOnline: true,
  isServerReachable: true,
  lastChecked: Date.now(),
  serverInfo: null,
  error: null
};

const statusListeners = new Set();

export function subscribeConnectionStatus(callback) {
  statusListeners.add(callback);
  callback(connectionState);
  return () => statusListeners.delete(callback);
}

function notifyStatusListeners() {
  for (const listener of statusListeners) {
    try {
      listener(connectionState);
    } catch (e) {
      console.error('Connection status listener error:', e);
    }
  }
}

/**
 * Performs a health check against the central Express backend
 */
export async function checkServerHealth(targetUrl = null) {
  const urlToCheck = targetUrl ? `${targetUrl.replace(/\/+$/, '')}/api/health` : apiUrl('/api/health');

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);

    const res = await fetch(urlToCheck, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'X-Client-Platform': isElectron ? 'electron' : 'web'
      },
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      connectionState = {
        isOnline: true,
        isServerReachable: data.status === 'ok',
        lastChecked: Date.now(),
        serverInfo: data,
        error: null
      };
      notifyStatusListeners();
      return { ok: true, data };
    } else {
      throw new Error(`Server returned status HTTP ${res.status}`);
    }
  } catch (err) {
    connectionState = {
      isOnline: navigator.onLine,
      isServerReachable: false,
      lastChecked: Date.now(),
      serverInfo: null,
      error: err.name === 'AbortError' ? 'Connection timed out' : (err.message || 'Server unavailable')
    };
    notifyStatusListeners();
    return { ok: false, error: connectionState.error };
  }
}

// Window online/offline event handlers
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    connectionState.isOnline = true;
    checkServerHealth();
  });
  window.addEventListener('offline', () => {
    connectionState.isOnline = false;
    connectionState.isServerReachable = false;
    connectionState.error = 'No network connection';
    notifyStatusListeners();
  });
}

/**
 * Universal fetch wrapper for 404 FOUND API
 */
export async function apiFetch(endpoint, options = {}) {
  const fullUrl = apiUrl(endpoint);
  const headers = new Headers(options.headers || {});

  // Add platform telemetry header
  headers.set('X-Client-Platform', isElectron ? 'electron' : 'web');

  // Attach auth token if available and not already provided
  if (!headers.has('Authorization') && typeof window !== 'undefined' && window.localStorage) {
    const token = window.localStorage.getItem('token');
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }
  }

  try {
    const res = await fetch(fullUrl, {
      ...options,
      headers
    });

    if (res.ok || res.status < 500) {
      if (!connectionState.isServerReachable) {
        connectionState.isServerReachable = true;
        connectionState.error = null;
        notifyStatusListeners();
      }
    }

    return res;
  } catch (err) {
    // Catch connection failure / network loss
    connectionState.isServerReachable = false;
    connectionState.error = err.message || 'Unable to reach central server';
    notifyStatusListeners();
    throw err;
  }
}
