import { getCategory } from '../js/categories.js';
import { storage } from '../js/storage.js';
import { renderLinks, showToast } from '../js/ui.js';

export async function renderCategory(app, id) {
  const main = document.createElement('main');
  main.id = 'main';

  const cat = getCategory(id);
  if (!cat) {
    main.innerHTML = '<section><h1>Category not found</h1><p><a href="#/">Back home</a></p></section>';
    app.innerHTML = '';
    app.appendChild(main);
    return;
  }

  // Header
  const header = document.createElement('header');
  header.innerHTML = `
    <a href="#/" class="back-btn" aria-label="Back to categories">← Back</a>
    <h1 style="color:${cat.color};font-size:var(--font-size-lg);">${cat.icon} ${cat.name}</h1>
    <div></div>
  `;

  // Main content
  const section = document.createElement('section');

  const listContainer = document.createElement('div');
  listContainer.className = 'link-list';
  section.appendChild(listContainer);

  main.appendChild(section);

  // FAB
  const fab = document.createElement('button');
  fab.className = 'fab';
  fab.type = 'button';
  fab.textContent = '+';
  fab.setAttribute('aria-label', 'Add new link');
  fab.addEventListener('click', () => {
    window.location.hash = '#/add?category=' + id;
  });

  app.innerHTML = '';
  app.appendChild(header);
  app.appendChild(main);
  app.appendChild(fab);

  // Load links and keep view in sync with storage mutations
  const refresh = async () => {
    const links = await storage.getLinks(id);
    if (links.length === 0) {
      listContainer.innerHTML = `<div class="empty-state"><p>No links yet.</p><p>Tap <strong>+</strong> to add one.</p></div>`;
    } else {
      renderLinks(listContainer, links, async (link) => {
        await storage.deleteLink(link.id);
        showToast('Deleted: ' + link.name);
        await refresh();
      });
    }
  };

  await refresh();

  // When a link is added elsewhere (e.g. form submitted), refresh this view.
  // The returned cleanup is invoked by the router before the next render.
  const unsubscribe = storage.onChange((event) => {
    if (event.category === id) {
      refresh();
    }
  });

  return unsubscribe;
}
