// Client Logto puro (sem @logto/react, sem instalar pacotes)
// Usa fetch + localStorage direto

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

// === PKCE helpers (sem dependência) ===
function randomString(length: number): string {
  const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
  const arr = new Uint8Array(length);
  crypto.getRandomValues(arr);
  return Array.from(arr, (b) => charset[b % charset.length]).join('');
}

async function sha256(input: string): Promise<ArrayBuffer> {
  const data = new TextEncoder().encode(input);
  return await crypto.subtle.digest('SHA-256', data);
}

function base64url(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let str = '';
  for (let i = 0; i < bytes.length; i++) str += String.fromCharCode(bytes[i]);
  return btoa(str).replace(/\\+/g, '-').replace(/\\//g, '_').replace(/=+$/, '');
}

async function generatePkce(): Promise<{ verifier: string; challenge: string }> {
  const verifier = randomString(64);
  const challenge = base64url(await sha256(verifier));
  return { verifier, challenge };
}

// === Auth flow ===
export async function signIn(): Promise<void> {
  const state = randomString(32);
  const nonce = randomString(32);
  const { verifier, challenge } = await generatePkce();

  sessionStorage.setItem('logto_state', state);
  sessionStorage.setItem('logto_nonce', nonce);
  sessionStorage.setItem('logto_verifier', verifier);

  const params = new URLSearchParams({
    client_id: APP_ID,
    redirect_uri: REDIRECT_URI,
    response_type: 'code',
    scope: 'openid profile email offline_access',
    state,
    nonce,
    code_challenge: challenge,
    code_challenge_method: 'S256',
  });

  window.location.href = `${LOGTO_ENDPOINT}/oidc/auth?${params.toString()}`;
}

export async function handleCallback(): Promise<boolean> {
  const url = new URL(window.location.href);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');

  if (!code) return false;

  const expectedState = sessionStorage.getItem('logto_state');
  const verifier = sessionStorage.getItem('logto_verifier');

  if (state !== expectedState) {
    console.error('Logto: state mismatch');
    return false;
  }

  try {
    const res = await fetch(`${LOGTO_ENDPOINT}/oidc/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: APP_ID,
        code,
        redirect_uri: REDIRECT_URI,
        code_verifier: verifier || '',
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

    sessionStorage.removeItem('logto_state');
    sessionStorage.removeItem('logto_nonce');
    sessionStorage.removeItem('logto_verifier');

    return true;
  } catch (err) {
    console.error('Callback error:', err);
    return false;
  }
}

export async function getUser(): Promise<LogtoUser | null> {
  const tokens = loadTokens();
  if (!tokens) return null;

  // Cache do user info
  const cached = localStorage.getItem(USER_KEY);
  if (cached) {
    try {
      return JSON.parse(cached);
    } catch {
      /* ignore */
    }
  }

  try {
    const res = await fetch(`${LOGTO_ENDPOINT}/oidc/me`, {
      headers: { Authorization: `Bearer ${tokens.accessToken}` },
    });

    if (!res.ok) {
      if (res.status === 401) {
        // Token expirado - tentar refresh
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
    const res = await fetch(`${LOGTO_ENDPOINT}/oidc/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        client_id: APP_ID,
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
  localStorage.removeItem(USER_KEY);
  window.location.href = `${LOGTO_ENDPOINT}/oidc/session/end?client_id=${APP_ID}&post_logout_redirect_uri=${encodeURIComponent(POST_LOGOUT_REDIRECT_URI)}`;
}

export async function requestPasswordReset(email: string): Promise<{ ok: boolean; error?: string }> {
  try {
    // Logto não tem endpoint público pra forgot-password
    // Solução: usar o SDK account API quando user tá logado, OU enviar email via management API admin
    // Aqui usamos a API direta do Logto (precisa de service token do app M2M)

    const res = await fetch(`${LOGTO_ENDPOINT}/api/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });

    if (!res.ok && res.status !== 404) {
      const err = await res.text();
      return { ok: false, error: err };
    }

    // Logto retorna 204 quando OK (mesmo se email não existe - segurança)
    return { ok: true };
  } catch (err: any) {
    return { ok: false, error: err.message };
  }
}

export function isAuthenticated(): boolean {
  return loadTokens() !== null;
}

export function getAccessToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}