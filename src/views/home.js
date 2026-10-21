import { CATEGORIES } from '../js/categories.js';
import { storage } from '../js/storage.js';
import { escapeHtml } from '../js/ui.js';

/**
 * Render the Home / Dashboard view.
 */
export function renderHome(app) {
  const main = document.createElement('main');
  main.id = 'main';

  const heading = document.createElement('section');
  heading.innerHTML = `<h1>Web Club</h1><p class="color-text-muted">Categorize useful links discovered across the web.</p>`;
  main.appendChild(heading);

  const grid = document.createElement('div');
  grid.className = 'category-grid';

  CATEGORIES.forEach((cat) => {
    const card = document.createElement('a');
    card.className = 'category-card';
    card.href = '#/category/' + cat.id;
    card.innerHTML = `
      <div class="category-icon" style="color:${cat.color}">${cat.icon}</div>
      <div class="category-name">${escapeHtml(cat.name)}</div>
      <div class="category-count">0 links</div>
    `;
    grid.appendChild(card);
  });

  main.appendChild(grid);
  app.innerHTML = '';
  app.appendChild(main);

  // Update link counts asynchronously
  CATEGORIES.forEach(async (cat) => {
    const links = await storage.getLinks(cat.id);
    const countEl = grid.querySelector(`a[href="#/category/${cat.id}"] .category-count`);
    if (countEl) countEl.textContent = links.length + ' link' + (links.length === 1 ? '' : 's');
  });
}
