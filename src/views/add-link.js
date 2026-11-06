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
      <input id="link-name" name="name" type="text" placeholder="e.g., Vite, React, Figma or paste a URL" autocomplete="off" />
    </div>
    <div class="form-group">
      <label for="link-desc">Website Description (URL / notes)</label>
      <textarea id="link-desc" name="description" placeholder="e.g., https://vitejs.dev or quick notes" rows="3"></textarea>
    </div>
    <button type="submit" class="primary-btn">Save Link</button>
    <button type="button" id="cancel-btn" class="secondary-btn">Cancel</button>
  `;
  main.appendChild(form);
  app.innerHTML = '';
  app.appendChild(main);

  const nameInput = form.querySelector('#link-name');
  const descInput = form.querySelector('#link-desc');
  const cancelBtn = form.querySelector('#cancel-btn');

  // Auto-prepopulate name field with domain from description if URL is pasted
  descInput.addEventListener('input', () => {
    const desc = descInput.value.trim();
    // If description looks like a URL and name field is empty, extract domain
    if (!nameInput.value && /^https?:\/\//i.test(desc)) {
      const match = desc.match(/https?:\/\/([^\s/]+)/i);
      if (match) {
        nameInput.value = match[1];
      }
    }
  });

  // Auto-prepend https:// to description if missing protocol
  nameInput.addEventListener('blur', () => {
    const input = nameInput.value.trim();
    if (input && !/^https?:\/\//i.test(input) && !/^#/i.test(input) && !/^mailto:/i.test(input)) {
      // Check if it looks like a URL (contains .)
      if (/\./i.test(input) && !input.startsWith('/') && !input.startsWith('#') && !input.startsWith('mailto:')) {
        nameInput.value = 'https://' + input;
      }
    }
  });

  cancelBtn.addEventListener('click', () => {
    window.location.hash = '#/category/' + categoryId;
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = nameInput.value.trim();
    const description = descInput.value.trim();

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
