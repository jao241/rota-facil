import { ref } from 'vue';

export interface User {
  id: string;
  email: string;
  name: string | null;
}

export const currentUser = ref<User | null>(null);
const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export async function fetchWithTimeout(url: string, init: RequestInit = {}): Promise<Response> {
  try {
    return await fetch(url, { ...init, signal: init.signal ?? AbortSignal.timeout(25_000) });
  } catch (error) {
    if (error instanceof DOMException && error.name === 'TimeoutError') {
      throw new Error('A API demorou para responder. Verifique sua conexão e tente novamente.');
    }
    throw new Error('Não foi possível conectar à API. Verifique sua conexão e tente novamente.');
  }
}

export async function refreshSession(): Promise<User | null> {
  try {
    const response = await fetchWithTimeout(`${apiUrl}/auth/me`, { credentials: 'include' });
    currentUser.value = response.ok ? await response.json() as User : null;
  } catch {
    currentUser.value = null;
  }
  return currentUser.value;
}

export async function logout(): Promise<void> {
  try {
    await fetchWithTimeout(`${apiUrl}/auth/logout`, { method: 'POST', credentials: 'include' });
  } catch {
    // Clear local state even when the network cannot reach the server.
  } finally {
    currentUser.value = null;
  }
}
