const TOKEN_KEY = 'leetcoder_auth_token';

export function getStoredToken() {
  return localStorage.getItem(TOKEN_KEY) || null;
}

export function setStoredToken(token) {
  if (token) {
    localStorage.setItem(TOKEN_KEY, token);
  } else {
    localStorage.removeItem(TOKEN_KEY);
  }
}

export function clearStoredToken() {
  localStorage.removeItem(TOKEN_KEY);
}

// Global fetch interceptor so all /api/* requests automatically include Bearer token
export function setupFetchInterceptor(onAuthExpired) {
  const originalFetch = window.fetch;

  window.fetch = async (input, init = {}) => {
    const token = getStoredToken();
    const headers = new Headers(init.headers || {});

    if (token && !headers.has('Authorization')) {
      headers.set('Authorization', `Bearer ${token}`);
    }

    const response = await originalFetch(input, { ...init, headers });

    // Handle session expiration
    if (response.status === 401) {
      const url = typeof input === 'string' ? input : (input && input.url ? input.url : '');
      if (!url.includes('/api/auth/login') && !url.includes('/api/auth/verify-2fa')) {
        clearStoredToken();
        if (typeof onAuthExpired === 'function') {
          onAuthExpired();
        }
        window.dispatchEvent(new Event('auth_expired'));
      }
    }

    return response;
  };
}

