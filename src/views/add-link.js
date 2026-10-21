import { isValidCategory } from '../js/categories.js';
import { storage } from '../js/storage.js';
import { createLink, validateLink } from '../js/link.js';
import { showToast } from '../js/ui.js';

export async function renderAddLink(app, categoryId) {
  const main = document.createElement('main');
  main.id = 'main';

  const section = document.createElement('section');
  section.innerHTML = `<h2>Add Link</h2><p class="color-text-muted">Save a useful link to your collection.</p>`;
  main.appendChild(section);

  const form = document.createElement('form');
  form.className = 'add-link-form';
  form.setAttribute('noValidate', 'true');

  form.innerHTML = `
    <div class="form-group">
      <label for="link-name">Website / App Name</label>
      <input id="link-name" name="name" type="text" placeholder="e.g., Vite, React, Figma" required autocomplete="off" />
    </div>
    <div class="form-group">
      <label for="link-desc">Website Description (URL / notes)</label>
      <textarea id="link-desc" name="description" placeholder="e.g., https://vitejs.dev or quick notes" rows="3" required></textarea>
    </div>
    <button type="submit" class="primary-btn">Save Link</button>
    <button type="button" id="cancel-btn" class="secondary-btn">Cancel</button>
  `;
  main.appendChild(form);
  app.innerHTML = '';
  app.appendChild(main);

  const cancelBtn = form.querySelector('#cancel-btn');
  cancelBtn.addEventListener('click', () => {
    window.location.hash = '#/category/' + categoryId;
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = form.querySelector('#link-name').value.trim();
    const description = form.querySelector('#link-desc').value.trim();

    const link = createLink({ category: categoryId, name, description });
    const errors = validateLink(link);

    if (errors.length > 0) {
      showToast('Please fix errors: ' + errors.join(', '));
      return;
    }

    await storage.saveLink(link);
    showToast('Saved: ' + name);
    window.location.hash = '#/category/' + categoryId;
  });
}
