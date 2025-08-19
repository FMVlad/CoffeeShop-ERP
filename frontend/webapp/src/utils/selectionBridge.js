// Simple sessionStorage-based selection bridge
// Keys are stored as `selected::<key>`

export function setSelection(key, payload) {
  try {
    const storageKey = `selected::${key}`;
    sessionStorage.setItem(storageKey, JSON.stringify(payload));
  } catch {}
}

export function popSelection(key) {
  try {
    const storageKey = `selected::${key}`;
    const raw = sessionStorage.getItem(storageKey);
    if (!raw) return null;
    sessionStorage.removeItem(storageKey);
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function peekSelection(key) {
  try {
    const storageKey = `selected::${key}`;
    const raw = sessionStorage.getItem(storageKey);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}




