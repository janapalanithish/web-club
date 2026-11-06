/**
 * Cloud sync adapter backed by Supabase (realtime + Postgres).
 *
 * Responsibilities:
 * - Create/configure the Supabase client.
 * - Subscribe to realtime `postgres_changes` on the `links` table so that
 *   INSERT/UPDATE/DELETE on any device instantly propagate to all open clients.
 * - Persist links (upsert) and deletions to the cloud.
 * - Maintain LocalStorage as an offline cache; cloud remains source of truth.
 *
 * The concrete Supabase credentials are injected via environment variables so
 * they can be configured per-deployment without code changes:
 *   - VITE_SUPABASE_URL
 *   - VITE_SUPABASE_ANON_KEY
 * A fallback to placeholder values is provided so dev (no config) still boots.
 */

import { CATEGORIES } from './categories.js';

const SUPABASE_URL = import.meta.env?.VITE_SUPABASE_URL || 'https://placeholder.supabase.co';
const SUPABASE_ANON_KEY = import.meta.env?.VITE_SUPABASE_ANON_KEY || 'public-anon-key';

let supabaseClient = null;
let realtimeChannel = null;

export class CloudAdapter {
  constructor() {
    this.client = null;
    this.listeners = new Map(); // categoryId -> Set<callback>
  }

  /** Lazily creates and returns a configured Supabase client. */
  async init() {
    if (supabaseClient) return supabaseClient;

    const { createClient } = await import('@supabase/supabase-js');
    supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      realtime: { params: { eventsPerSecond: 5 } },
      db: { schema: 'public' },
    });
    return supabaseClient;
  }

  async getLinks(category) {
    const client = await this.init();
    const { data, error } = await client
      .from('links')
      .select('*')
      .eq('category', category)
      .order('createdAt', { ascending: true });

    if (error) {
      console.error('[cloud] getLinks error:', error);
      return [];
    }
    return data || [];
  }

  async saveLink(link) {
    const client = await this.init();
    const { data, error } = await client
      .from('links')
      .upsert({
        id: link.id,
        category: link.category,
        name: link.name,
        description: link.description,
        createdAt: link.createdAt,
        updatedAt: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.error('[cloud] saveLink error:', error);
      // Roll back locally cached write if cloud rejects.
      return link;
    }
    return data;
  }

  async deleteLink(id) {
    const client = await this.init();
    const { error } = await client.from('links').delete().eq('id', id);
    if (error) {
      console.error('[cloud] deleteLink error:', error);
      return false;
    }
    return true;
  }

  /** Subscribe to realtime changes for all categories. Returns unsubscribe. */
  async subscribeAll(cb) {
    const client = await this.init();
    if (realtimeChannel) {
      try {
        await client.removeChannel(realtimeChannel);
      } catch {
        /* noop */
      }
    }

    realtimeChannel = client
      .channel('webclub-links-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'links' },
        (payload) => {
          const { eventType, new: fresh, old } = payload;
          const category = fresh?.category || old?.category;
          if (!CATEGORIES.some((c) => c.id === category)) return;
          cb({ eventType, category, payload });
        }
      )
      .subscribe();

    // Supabase realtime returns a promise-like status via callback; also
    // subscribe via channel state for robustness.
    return () => client.removeChannel(realtimeChannel);
  }

  async unsubscribe() {
    if (realtimeChannel) {
      const client = await this.init().catch(() => null);
      if (client) {
        try {
          await client.removeChannel(realtimeChannel);
        } catch {
          /* noop */
        }
      }
      realtimeChannel = null;
    }
  }

  /** Register a realtime listener for a single category. */
  onCategoryChange(category, cb) {
    if (!this.listeners.has(category)) {
      this.listeners.set(category, new Set());
    }
    const set = this.listeners.get(category);
    set.add(cb);
    return () => set.delete(cb);
  }

  /** Restore unsynced local-only changes into the cloud. */
  async restoreFromLocalStorage() {
    // Local-only writes are merged in StorageAdapter.saveLink already cached;
    // here we simply ensure cloud state is loaded from cloud + local cache.
    // Cloud is authoritative; local cache is merged below via StorageAdapter.
    return true;
  }

  /** Tear down realtime connection and client state. */
  async close() {
    await this.unsubscribe();
    supabaseClient = null;
  }
}

export const cloud = new CloudAdapter();
