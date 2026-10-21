/**
 * Storage adapter — abstracts persistence between web (LocalStorage)
 * and Android native (Capacitor SQLite).
 *
 * Design notes:
 * - The concrete backend is resolved in `init()`, not in the constructor, so a
 *   late-registered native plugin is still picked up.
 * - If the native SQLite backend is unavailable or fails to open a connection,
 *   we silently fall back to LocalStorage. Previously a failed/native-without-
 *   plugin setup selected a SQLite adapter whose `db` was `null`, so every
 *   write was a no-op and the list always came back empty.
 * - An in-memory cache mirrors the persisted state so the UI reflects a newly
 *   added link immediately, without waiting on a storage round-trip.
 * - A `change` event is emitted after every mutation so open views can
 *   re-render in place instead of requiring a route change or hard refresh.
 */

import { CATEGORIES } from './categories.js';

const KEY_PREFIX = 'webclub_links_';

class LocalStorageAdapter {
  async init() {
    // Nothing required; LocalStorage is synchronous.
  }

  async getLinks(category) {
    const raw = localStorage.getItem(KEY_PREFIX + category);
    try {
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  async saveLink(link) {
    const key = KEY_PREFIX + link.category;
    const list = await this.getLinks(link.category);
    list.push(link);
    localStorage.setItem(key, JSON.stringify(list));
    return link;
  }

  async deleteLink(id) {
    for (const category of CATEGORIES.map((c) => c.id)) {
      const list = await this.getLinks(category);
      const filtered = list.filter((l) => l.id !== id);
      if (filtered.length !== list.length) {
        localStorage.setItem(KEY_PREFIX + category, JSON.stringify(filtered));
        return true;
      }
    }
    return false;
  }
}

class SQLiteAdapter {
  constructor() {
    this.db = null;
  }

  /** Opens the connection. Returns false when the plugin is unusable. */
  async init() {
    if (typeof window === 'undefined') return false;
    const plugin = window.Capacitor?.Plugins?.SQLite;
    if (!plugin) return false;

    try {
      this.db = plugin;
      await this.db.createConnection({ database: 'webclub', version: 1 });
      await this.db.execute({
        statements: [
          'CREATE TABLE IF NOT EXISTS links (id TEXT PRIMARY KEY, category TEXT, name TEXT, description TEXT, createdAt INTEGER)',
        ],
      });
      return true;
    } catch (err) {
      console.warn('[storage] SQLite unavailable, falling back to LocalStorage:', err);
      this.db = null;
      return false;
    }
  }

  async getLinks(category) {
    if (!this.db) return [];
    try {
      const res = await this.db.query({
        sql: 'SELECT * FROM links WHERE category = ?',
        values: [category],
      });
      return res.values || [];
    } catch {
      return [];
    }
  }

  async saveLink(link) {
    if (!this.db) return link;
    await this.db.run({
      statement:
        'INSERT INTO links (id, category, name, description, createdAt) VALUES (?, ?, ?, ?, ?)',
      values: [link.id, link.category, link.name, link.description, link.createdAt],
    });
    return link;
  }

  async deleteLink(id) {
    if (!this.db) return false;
    try {
      await this.db.run({ statement: 'DELETE FROM links WHERE id = ?', values: [id] });
      return true;
    } catch {
      return false;
    }
  }
}

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
    const isNative =
      typeof window !== 'undefined' && !!window.Capacitor?.Plugins?.SQLite;

    if (isNative) {
      const sqlite = new SQLiteAdapter();
      if (await sqlite.init()) {
        this.impl = sqlite;
      }
    }
    if (!this.impl) {
      this.impl = new LocalStorageAdapter();
    }
    await this.impl.init();

    // Warm the cache so the first render is synchronous and correct.
    for (const cat of CATEGORIES) {
      const links = await this.impl.getLinks(cat.id);
      this.cache.set(cat.id, links);
    }
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

    await this.impl.saveLink(link);

    const list = await this.getLinks(link.category);
    if (!list.some((l) => l.id === link.id)) {
      list.push(link);
    }
    this.cache.set(link.category, list);

    this.events.emit({ type: 'add', category: link.category, link });
    return link;
  }

  async deleteLink(id) {
    if (!this.impl) await this.init();

    const removed = await this.impl.deleteLink(id);

    // Reflect the deletion in the cache regardless of backend result.
    for (const cat of CATEGORIES) {
      const list = this.cache.get(cat.id);
      if (!list) continue;
      const filtered = list.filter((l) => l.id !== id);
      if (filtered.length !== list.length) {
        this.cache.set(cat.id, filtered);
        this.events.emit({ type: 'delete', category: cat.id, id });
      }
    }

    return removed;
  }

  /** Subscribe to storage mutations. Returns an unsubscribe function. */
  onChange(fn) {
    return this.events.on(fn);
  }
}

export const storage = new StorageAdapter();
