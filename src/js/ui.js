/**
 * DOM helpers: escaping, rendering, toast notifications.
 */

export function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/** Extract a hostname from a URL-ish string, for favicon-style display. */
export function extractDomain(text) {
  const match = String(text || '').match(/https?:\/\/([^\s/]+)/i);
  if (match) return match[1];
  const bare = String(text || '').match(/^([a-z0-9-]+\.[a-z]{2,})(\/.*)?$/i);
  if (bare) return bare[1];
  return '';
}

export function showToast(message, duration = 2000) {
  const existing = document.querySelector('.toast');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.setAttribute('role', 'status');
  toast.textContent = message;
  document.body.appendChild(toast);

  setTimeout(() => {
    toast.remove();
  }, duration);
}

/** Render a list of link items into a container element. */
export function renderLinks(container, links, onDelete) {
  container.innerHTML = '';
  links.forEach((link) => {
    const item = document.createElement('div');
    item.className = 'link-item';

    const body = document.createElement('div');
    body.style.minWidth = '0';

    const name = document.createElement('div');
    name.className = 'link-item-name';
    name.textContent = link.name;

    const desc = document.createElement('div');
    desc.className = 'link-item-desc';
    desc.textContent = link.description;

    body.appendChild(name);
    body.appendChild(desc);

    const actions = document.createElement('div');
    actions.className = 'link-item-actions';

    const openBtn = document.createElement('button');
    openBtn.type = 'button';
    openBtn.textContent = 'Open';
    openBtn.setAttribute('aria-label', 'Open ' + link.name);
    openBtn.addEventListener('click', () => {
      const url = link.description.trim();
      if (/^https?:\/\//i.test(url)) {
        window.open(url, '_blank', 'noopener,noreferrer');
      } else {
        showToast('No URL to open — this entry is a note');
      }
    });

    const deleteBtn = document.createElement('button');
    deleteBtn.type = 'button';
    deleteBtn.textContent = 'Delete';
    deleteBtn.setAttribute('aria-label', 'Delete ' + link.name);
    deleteBtn.addEventListener('click', () => onDelete(link));

    actions.appendChild(openBtn);
    actions.appendChild(deleteBtn);

    item.appendChild(body);
    item.appendChild(actions);
    container.appendChild(item);
  });
}
