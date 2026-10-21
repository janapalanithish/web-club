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
  const errors = [];
  if (!link.name || link.name.length === 0) {
    errors.push('Name is required');
  } else if (link.name.length > 120) {
    errors.push('Name exceeds 120 characters');
  }

  if (!link.description || link.description.length === 0) {
    errors.push('Description is required');
  } else if (link.description.length > 500) {
    errors.push('Description exceeds 500 characters');
  }

  return errors;
}
