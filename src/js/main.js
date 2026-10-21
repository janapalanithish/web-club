import { renderHome } from '../views/home.js';
import { renderCategory } from '../views/category.js';
import { renderAddLink } from '../views/add-link.js';
import { storage } from './storage.js';
import { registerServiceWorker } from './pwa.js';
import { waitForCapacitor } from './capacitor.js';
import { isValidCategory } from './categories.js';

/**
 * Application bootstrap and hash router.
 *
 * Routes:
 *   #/                     → Home (7 category tiles)
 *   #/category/:id         → Category detail (saved links + "+ Add" button)
 *   #/add?category=:id     → Add-link form (2 fields)
 */

const app = document.getElementById('app');

let currentCleanup = null;

async function route() {
  if (!app) return;

  if (currentCleanup && typeof currentCleanup === 'function') {
    currentCleanup();
    currentCleanup = null;
  }

  const hash = window.location.hash;
  const queryIndex = hash.indexOf('?');
  const path = queryIndex === -1 ? hash : hash.slice(0, queryIndex);
  const params = new URLSearchParams(queryIndex === -1 ? '' : hash.slice(queryIndex + 1));

  if (path === '' || path === '#' || path === '#/' || path === '#/home') {
    renderHome(app);
    return;
  }

  const categoryMatch = path.match(/^#\/category\/(.+)$/);
  if (categoryMatch) {
    const id = decodeURIComponent(categoryMatch[1]);
    if (isValidCategory(id)) {
      currentCleanup = await renderCategory(app, id);
    } else {
      renderHome(app);
    }
    return;
  }

  if (path === '#/add') {
    const categoryId = params.get('category');
    if (isValidCategory(categoryId)) {
      await renderAddLink(app, categoryId);
    } else {
      renderHome(app);
    }
    return;
  }

  renderHome(app);
}

async function boot() {
  if (!app) return;

  await storage.init();

  if (window.Capacitor) {
    try {
      await waitForCapacitor();
    } catch (err) {
      console.warn('Native init delayed:', err);
    }
  }

  registerServiceWorker();
  window.addEventListener('hashchange', route);

  await route();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}
