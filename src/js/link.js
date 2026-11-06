/**
 * Link data model and validation helpers.
 */

export function createLink({ category, name, description }) {
  return {
    id: Date.now().toString() + '-' + Math.random().toString(36).slice(2, 8),
    category: category,
    name: String(name || '').trim(),
    description: String(description || '').trim(),
    createdAt: Date.now(),
  };
}

export function validateLink(link) {
  // No required checks, no length restrictions.
  return [];
}
