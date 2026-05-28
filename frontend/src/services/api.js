const API_BASE = import.meta.env.VITE_API_BASE || '/api';

let csrfToken = sessionStorage.getItem('csrfToken') || '';
const CSRF_HEADER = 'X-CSRF-Token';

/**
 * Update CSRF token from response headers
 */
function updateCSRFToken(response) {
  const token = response.headers.get(CSRF_HEADER);
  if (token) {
    csrfToken = token;
    sessionStorage.setItem('csrfToken', token);
  }
}

/**
 * Get current CSRF token
 */
function getCSRFToken() {
  return csrfToken;
}

/**
 * Set CSRF token explicitly
 */
function setCSRFToken(token) {
  csrfToken = token;
  sessionStorage.setItem('csrfToken', token);
}

/**
 * Decode JWT token and extract expiration time
 * @param {string} token - JWT token
 * @returns {object|null} - Decoded payload or null if invalid
 */
function decodeToken(token) {
  try {
    // JWT format: header.payload.signature
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    // Decode payload (second part)
    const payload = parts[1];
    // Add padding if necessary
    const padded = payload + '==='.slice((payload.length % 4));
    const decoded = atob(padded);
    return JSON.parse(decoded);
  } catch (error) {
    console.warn('Failed to decode token:', error);
    return null;
  }
}

/**
 * Check if token is expiring soon (within 1 hour)
 * @param {string} token - JWT token
 * @returns {boolean} - True if token is expiring within 1 hour
 */
function isTokenExpiringSoon(token) {
  const decoded = decodeToken(token);
  if (!decoded || !decoded.exp) return false;

  const expiresAt = decoded.exp * 1000; // Convert to milliseconds
  const now = Date.now();
  const oneHourMs = 60 * 60 * 1000;

  return expiresAt - now <= oneHourMs;
}

/**
 * Check if token is expired
 * @param {string} token - JWT token
 * @returns {boolean} - True if token is expired
 */
function isTokenExpired(token) {
  const decoded = decodeToken(token);
  if (!decoded || !decoded.exp) return false;

  const expiresAt = decoded.exp * 1000; // Convert to milliseconds
  const now = Date.now();

  return now > expiresAt;
}

async function parseResponse(response) {
  // Update CSRF token from response headers
  updateCSRFToken(response);

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.message || `Request failed: ${response.status}`);
  }

  return data;
}

function buildHeaders(headers = {}, token) {
  const nextHeaders = { ...headers };

  if (token) {
    nextHeaders.Authorization = `Bearer ${token}`;
  }

  // Add CSRF token if available
  if (csrfToken) {
    nextHeaders[CSRF_HEADER] = csrfToken;
  }

  return nextHeaders;
}

export async function apiRequest(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, options);
  return parseResponse(response);
}

export async function apiGet(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: buildHeaders(options.headers, options.token)
  });
  return parseResponse(response);
}

export async function apiPost(path, payload, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    ...options,
    headers: buildHeaders(
      {
        'Content-Type': 'application/json',
        ...(options.headers || {})
      },
      options.token
    ),
    body: JSON.stringify(payload)
  });

  return parseResponse(response);
}

export async function apiPatch(path, payload, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    method: 'PATCH',
    ...options,
    headers: buildHeaders(
      {
        'Content-Type': 'application/json',
        ...(options.headers || {})
      },
      options.token
    ),
    body: JSON.stringify(payload)
  });

  return parseResponse(response);
}

export async function apiPut(path, payload, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    method: 'PUT',
    ...options,
    headers: buildHeaders(
      {
        'Content-Type': 'application/json',
        ...(options.headers || {})
      },
      options.token
    ),
    body: JSON.stringify(payload)
  });

  return parseResponse(response);
}

export async function apiDelete(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    method: 'DELETE',
    ...options,
    headers: buildHeaders(options.headers, options.token)
  });

  return parseResponse(response);
}

export async function apiUploadFile(file, options = {}) {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(`${API_BASE}/uploads`, {
    method: 'POST',
    ...options,
    headers: buildHeaders(options.headers, options.token),
    body: formData
  });

  return parseResponse(response);
}

// CSRF token utilities
export { getCSRFToken, setCSRFToken };

// Token validation utilities
export { decodeToken, isTokenExpiringSoon, isTokenExpired };
