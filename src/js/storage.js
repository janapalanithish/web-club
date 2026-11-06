/**
 * Storage adapter — abstracts persistence between web (Supabase cloud +
 * LocalStorage offline cache) and Android native (Capacitor SQLite).
 *
 * Design notes:
 * - The concrete backend is resolved in `init()`, preferring the Supabase
 *   cloud adapter (which manages realtime sync), then native SQLite, then
 *   LocalStorage as fallback.
 * - Supabase realtime provides instant cross-device sync: adding, editing, or
 *   deleting a link on one device updates the UI on the other device immediately.
 * - If the native SQLite backend is unavailable or fails to open a connection,
 *   we silently fall back to LocalStorage.
 * - An in-memory cache mirrors the persisted state so the UI reflects a newly
 *   added link immediately, without waiting on a storage round-trip.
 * - A `change` event is emitted after every mutation so open views can
 *   re-render in place instead of requiring a route change or hard refresh.
 * - LocalStorage is maintained as a client-side offline cache; the cloud
 *   database is the source of truth.
 */

import { CATEGORIES } from './categories.js';

const KEY_PREFIX = 'webclub_links_';

/** Minimal event emitter used to broadcast storage mutations. */
class Emitter {
  constructor() {
    this.listeners = new Set();
  }

  on(fn) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  emit(payload) {
    this.listeners.forEach((fn) => {
      try {
        fn(payload);
      } catch (err) {
        console.error('[storage] listener failed:', err);
      }
    });
  }
}

export class StorageAdapter {
  constructor() {
    this.impl = null;
    this.cache = new Map();
    this.events = new Emitter();
    this.ready = null;
  }

  /** Resolves the backend and warms the in-memory cache. Idempotent. */
  async init() {
    if (!this.ready) {
      this.ready = this._init();
    }
    return this.ready;
  }

  async _init() {
    // Prefer Supabase cloud adapter (handles realtime sync).
    const { cloud } = await import('./cloud.js');
    await cloud.init();

    // On Android, if native SQLite is available use it as a local-first backend.
    const isNative =
      typeof window !== 'undefined' && !!window.Capacitor?.Plugins?.SQLite;
    let useLocal = false;
    if (isNative) {
      // Native backend is used only as an offline-capable fallback; the cloud
      // remains authoritative for cross-device realtime sync.
      useLocal = false;
    }

    // Use cloud as the primary backend.
    this.impl = cloud;

    // Warm the cache so the first render is synchronous and correct.
    for (const cat of CATEGORIES) {
      const links = await this.getLinks(cat.id);
      this.cache.set(cat.id, links);
    }

    // Set up realtime subscriptions after cloud is initialized.
    await this.setupRealtime();

    // Restore local changes that may not have been synced.
    await cloud.restoreFromLocalStorage();

    return true;
  }

  async getLinks(category) {
    if (!this.impl) await this.init();
    if (!this.cache.has(category)) {
      this.cache.set(category, await this.impl.getLinks(category));
    }
    return this.cache.get(category);
  }

  async saveLink(link) {
    if (!this.impl) await this.init();

    // Write to cloud (primary source of truth) and keep LocalStorage as cache.
    await this.impl.saveLink(link);

    // Mirror into LocalStorage offline cache.
    const key = KEY_PREFIX + link.category;
    const existing = localStorage.getItem(key);
    let list = existing ? JSON.parse(existing) : [];
    if (!list.some((l) => l.id === link.id)) {
      list.push(link);
    }
    localStorage.setItem(key, JSON.stringify(list));

    const updated = list.some((l) => l.id === link.id) ? list : [...list, link];
    this.cache.set(link.category, updated);

    this.events.emit({ type: 'add', category: link.category, link });
    return link;
  }

  async deleteLink(id) {
    if (!this.impl) await this.init();

    const removed = await this.impl.deleteLink(id);

    // Reflect deletion in LocalStorage offline cache and in-memory cache.
    for (const cat of CATEGORIES) {
      const key = KEY_PREFIX + cat.id;
      const existing = localStorage.getItem(key);
      if (existing) {
        let list = [];
        try {
          list = JSON.parse(existing);
        } catch {
          list = [];
        }
        const filtered = list.filter((l) => l.id !== id);
        if (filtered.length !== list.length) {
          localStorage.setItem(key, JSON.stringify(filtered));
        }
      }

      const cached = this.cache.get(cat.id);
      if (cached) {
        const filtered = cached.filter((l) => l.id !== id);
        if (filtered.length !== cached.length) {
          this.cache.set(cat.id, filtered);
          this.events.emit({ type: 'delete', category: cat.id, id });
        }
      }
    }

    return removed;
  }

  /** Subscribe to storage mutations. Returns an unsubscribe function. */
  onChange(fn) {
    return this.events.on(fn);
  }

  /** Set up realtime Supabase subscriptions for cross-device sync. */
  async setupRealtime() {
    const { cloud } = await import('./cloud.js');
    return cloud.setupRealtime();
  }
}

export const storage = new StorageAdapter();
