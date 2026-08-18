// Client Logto puro (sem @logto/react, sem instalar pacotes)
// Usa PKCE (Logto exige pra apps SPA)

const LOGTO_ENDPOINT = import.meta.env.VITE_LOGTO_ENDPOINT || 'http://localhost:3001';
const APP_ID = import.meta.env.VITE_LOGTO_APP_ID || '';
const REDIRECT_URI =
  import.meta.env.VITE_LOGTO_REDIRECT_URI || window.location.origin + '/callback';
const POST_LOGOUT_REDIRECT_URI =
  import.meta.env.VITE_LOGTO_POST_LOGOUT_REDIRECT_URI || window.location.origin;

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
function saveTokens(t: LogtoTokens): void {
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

function clearTokens(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(ID_TOKEN_KEY);
  localStorage.removeItem(REFRESH_KEY);
  localStorage.removeItem('logto_expires');
  localStorage.removeItem(USER_KEY);
}

// === PKCE helpers ===
function generateRandomString(len: number): string {
  const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
  const arr = new Uint8Array(len);
  crypto.getRandomValues(arr);
  let out = '';
  for (let i = 0; i < len; i++) out += charset[arr[i] % charset.length];
  return out;
}

async function sha256(input: string): Promise<ArrayBuffer> {
  const data = new TextEncoder().encode(input);
  return await crypto.subtle.digest('SHA-256', data);
}

function base64UrlEncode(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let str = '';
  for (let i = 0; i < bytes.length; i++) str += String.fromCharCode(bytes[i]);
  const b64 = btoa(str);
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function generatePkce(): Promise<{ verifier: string; challenge: string }> {
  const verifier = generateRandomString(64);
  const challenge = base64UrlEncode(await sha256(verifier));
  return { verifier, challenge };
}

// === Auth flow ===
export async function signIn(): Promise<void> {
  const state = generateRandomString(32);
  const nonce = generateRandomString(32);
  const pkce = await generatePkce();

  try {
    sessionStorage.setItem('logto_state', state);
    sessionStorage.setItem('logto_nonce', nonce);
    sessionStorage.setItem('logto_verifier', pkce.verifier);
  } catch {
    /* ignore */
  }

  const params = new URLSearchParams({
    client_id: APP_ID,
    redirect_uri: REDIRECT_URI,
    response_type: 'code',
    scope: 'openid profile email',
    state,
    nonce,
    code_challenge: pkce.challenge,
    code_challenge_method: 'S256',
  });

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

    const verifier = sessionStorage.getItem('logto_verifier') || '';

    const body = new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: APP_ID,
      code,
      redirect_uri: REDIRECT_URI,
      code_verifier: verifier,
    });

    const res = await fetch(LOGTO_ENDPOINT + '/oidc/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
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
      return JSON.parse(cached) as LogtoUser;
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

    const user = (await res.json()) as LogtoUser;
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
    const body = new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: APP_ID,
      refresh_token: tokens.refreshToken,
    });

    const res = await fetch(LOGTO_ENDPOINT + '/oidc/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
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
    sessionStorage.removeItem('logto_verifier');
  } catch {
    /* ignore */
  }
  window.location.assign(
    LOGTO_ENDPOINT +
      '/oidc/session/end?client_id=' +
      encodeURIComponent(APP_ID) +
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