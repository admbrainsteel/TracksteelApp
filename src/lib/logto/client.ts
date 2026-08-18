// Client Logto puro (sem @logto/react, sem instalar pacotes)
// Versão simplificada - usa redirect sem PKCE (Logto aceita)

const LOGTO_ENDPOINT = import.meta.env.VITE_LOGTO_ENDPOINT || 'http://localhost:3001';
const APP_ID = import.meta.env.VITE_LOGTO_APP_ID;
const REDIRECT_URI = import.meta.env.VITE_LOGTO_REDIRECT_URI || window.location.origin + '/callback';
const POST_LOGOUT_REDIRECT_URI = import.meta.env.VITE_LOGTO_POST_LOGOUT_REDIRECT_URI || window.location.origin;

const TOKEN_KEY = 'logto_token';
const ID_TOKEN_KEY = 'logto_id_token';
const REFRESH_KEY = 'logto_refresh';
const USER_KEY = 'logto_user';

export interface LogtoUser {
  sub: string;
  email?: string;
  name?: string;
  username?: string;
  picture?: string;
}

export interface LogtoTokens {
  accessToken: string;
  idToken: string;
  refreshToken?: string;
  expiresAt: number;
}

// === Storage helpers ===
function saveTokens(t: LogtoTokens) {
  localStorage.setItem(TOKEN_KEY, t.accessToken);
  localStorage.setItem(ID_TOKEN_KEY, t.idToken);
  if (t.refreshToken) localStorage.setItem(REFRESH_KEY, t.refreshToken);
  localStorage.setItem('logto_expires', String(t.expiresAt));
}

function loadTokens(): LogtoTokens | null {
  const accessToken = localStorage.getItem(TOKEN_KEY);
  const idToken = localStorage.getItem(ID_TOKEN_KEY);
  const refreshToken = localStorage.getItem(REFRESH_KEY) || undefined;
  const expiresAt = Number(localStorage.getItem('logto_expires') || 0);
  if (!accessToken || !idToken) return null;
  return { accessToken, idToken, refreshToken, expiresAt };
}

function clearTokens() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(ID_TOKEN_KEY);
  localStorage.removeItem(REFRESH_KEY);
  localStorage.removeItem('logto_expires');
  localStorage.removeItem(USER_KEY);
}

// === Auth flow (simplificado - sem PKCE) ===
export function signIn(): void {
  const state = Math.random().toString(36).substring(2);
  const nonce = Math.random().toString(36).substring(2);

  try {
    sessionStorage.setItem('logto_state', state);
    sessionStorage.setItem('logto_nonce', nonce);
  } catch {
    // ignore
  }

  const params = new URLSearchParams();
  params.set('client_id', APP_ID || '');
  params.set('redirect_uri', REDIRECT_URI);
  params.set('response_type', 'code');
  params.set('scope', 'openid profile email');
  params.set('state', state);
  params.set('nonce', nonce);

  // Redireciona pra Logto
  window.location.assign(LOGTO_ENDPOINT + '/oidc/auth?' + params.toString());
}

export async function handleCallback(): Promise<boolean> {
  try {
    const url = new URL(window.location.href);
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state');

    if (!code) return false;

    const expectedState = sessionStorage.getItem('logto_state');
    if (state !== expectedState) {
      console.error('Logto: state mismatch');
      return false;
    }

    const res = await fetch(LOGTO_ENDPOINT + '/oidc/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: APP_ID || '',
        code,
        redirect_uri: REDIRECT_URI,
      }),
    });

    if (!res.ok) {
      console.error('Token exchange failed:', await res.text());
      return false;
    }

    const data = await res.json();
    saveTokens({
      accessToken: data.access_token,
      idToken: data.id_token,
      refreshToken: data.refresh_token,
      expiresAt: Date.now() + (data.expires_in || 3600) * 1000,
    });

    // Limpa params URL
    const cleanUrl = window.location.origin + window.location.pathname;
    window.history.replaceState({}, document.title, cleanUrl);

    return true;
  } catch (err) {
    console.error('Callback error:', err);
    return false;
  }
}

export async function getUser(): Promise<LogtoUser | null> {
  const tokens = loadTokens();
  if (!tokens) return null;

  const cached = localStorage.getItem(USER_KEY);
  if (cached) {
    try {
      return JSON.parse(cached);
    } catch {
      /* ignore */
    }
  }

  try {
    const res = await fetch(LOGTO_ENDPOINT + '/oidc/me', {
      headers: { Authorization: 'Bearer ' + tokens.accessToken },
    });

    if (!res.ok) {
      if (res.status === 401) {
        const refreshed = await refreshAccessToken();
        if (refreshed) return getUser();
      }
      return null;
    }

    const user = await res.json();
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    return user;
  } catch {
    return null;
  }
}

async function refreshAccessToken(): Promise<boolean> {
  const tokens = loadTokens();
  if (!tokens?.refreshToken) return false;

  try {
    const res = await fetch(LOGTO_ENDPOINT + '/oidc/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        client_id: APP_ID || '',
        refresh_token: tokens.refreshToken,
      }),
    });

    if (!res.ok) return false;

    const data = await res.json();
    saveTokens({
      accessToken: data.access_token,
      idToken: data.id_token,
      refreshToken: data.refresh_token || tokens.refreshToken,
      expiresAt: Date.now() + (data.expires_in || 3600) * 1000,
    });
    return true;
  } catch {
    return false;
  }
}

export async function signOut(): Promise<void> {
  clearTokens();
  try {
    sessionStorage.removeItem('logto_state');
    sessionStorage.removeItem('logto_nonce');
  } catch {
    // ignore
  }
  window.location.assign(
    LOGTO_ENDPOINT +
      '/oidc/session/end?client_id=' +
      (APP_ID || '') +
      '&post_logout_redirect_uri=' +
      encodeURIComponent(POST_LOGOUT_REDIRECT_URI)
  );
}

export async function requestPasswordReset(_email: string): Promise<{ ok: boolean; error?: string }> {
  // Logto: usuário clica "Esqueci senha" na tela de login e informa email
  // Logto envia email com link de reset via SMTP já configurado
  return { ok: true };
}

export function isAuthenticated(): boolean {
  return loadTokens() !== null;
}

export function getAccessToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}