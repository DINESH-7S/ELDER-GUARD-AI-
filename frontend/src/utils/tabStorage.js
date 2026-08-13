/**
 * Tab-isolated storage helper utility.
 * Strict per-tab isolation for active navigation tabs and portal views,
 * while allowing shared token seeding for newly opened browser tabs.
 */

const TAB_ISOLATED_KEYS = new Set([
  'elderguard_active_tab',
  'elderguard_current_view'
]);

export const tabStorage = {
  getItem(key) {
    try {
      // 1. Strict per-tab keys: check sessionStorage ONLY
      if (TAB_ISOLATED_KEYS.has(key)) {
        return sessionStorage.getItem(key);
      }

      // 2. Auth / Shared keys: check sessionStorage first
      const sessionVal = sessionStorage.getItem(key);
      if (sessionVal !== null) return sessionVal;

      // 3. Fallback to localStorage and copy into sessionStorage for this tab
      const localVal = localStorage.getItem(key);
      if (localVal !== null) {
        try {
          sessionStorage.setItem(key, localVal);
        } catch (_) {}
      }
      return localVal;
    } catch (e) {
      return null;
    }
  },

  setItem(key, value) {
    try {
      sessionStorage.setItem(key, value);
      // Do NOT overwrite localStorage for per-tab isolated keys like active_tab
      if (!TAB_ISOLATED_KEYS.has(key)) {
        localStorage.setItem(key, value);
      }
    } catch (e) {
      console.warn(`tabStorage setItem error for key ${key}:`, e);
    }
  },

  removeItem(key) {
    try {
      sessionStorage.removeItem(key);
      if (!TAB_ISOLATED_KEYS.has(key)) {
        localStorage.removeItem(key);
      }
    } catch (e) {
      console.warn(`tabStorage removeItem error for key ${key}:`, e);
    }
  },

  clear() {
    try {
      sessionStorage.clear();
    } catch (e) {}
  }
};

export default tabStorage;
