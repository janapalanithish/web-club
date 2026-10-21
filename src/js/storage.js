/**
 * Storage adapter — abstracts persistence between web (LocalStorage)
 * and Android native (Capacitor SQLite).
 */

const KEY_PREFIX = 'webclub_links_';

class LocalStorageAdapter {
  async init() {
    // Nothing required; LocalStorage is synchronous
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
    for (const category of [
      'it', 'educational', 'exploration', 'movies',
      'brain-strength', 'animating-video-generator', 'image-generator',
    ]) {
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

  async init() {
    if (window.Capacitor && window.Capacitor.Plugins.SQLite) {
      this.db = window.Capacitor.Plugins.SQLite;
      await this.db.createConnection({ database: 'webclub', version: 1 });
      await this.db.execute({
        statements: [
          'CREATE TABLE IF NOT EXISTS links (id TEXT PRIMARY KEY, category TEXT, name TEXT, description TEXT, createdAt INTEGER)',
        ],
      });
    }
  }

  async getLinks(category) {
    if (!this.db) return [];
    try {
      const res = await this.db.query({ sql: 'SELECT * FROM links WHERE category = ?', values: [category] });
      return res.values || [];
    } catch {
      return [];
    }
  }

  async saveLink(link) {
    if (!this.db) return link;
    await this.db.run({
      statement: 'INSERT INTO links (id, category, name, description, createdAt) VALUES (?, ?, ?, ?, ?)',
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

export class StorageAdapter {
  constructor() {
    this.impl = (typeof window !== 'undefined' && window.Capacitor) ? new SQLiteAdapter() : new LocalStorageAdapter();
  }

  async init() {
    return this.impl.init();
  }

  async getLinks(category) {
    return this.impl.getLinks(category);
  }

  async saveLink(link) {
    return this.impl.saveLink(link);
  }

  async deleteLink(id) {
    return this.impl.deleteLink(id);
  }
}

export const storage = new StorageAdapter();
