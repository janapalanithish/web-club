/**
 * The 7 fixed categories for Web Club.
 * These are immutable — the app does not support adding, editing, or removing them.
 */
export const CATEGORIES = [
  { id: 'it', name: 'IT', icon: '💻', color: 'var(--color-it)' },
  { id: 'educational', name: 'Educational', icon: '📚', color: 'var(--color-educational)' },
  { id: 'exploration', name: 'Exploration', icon: '🧭', color: 'var(--color-exploration)' },
  { id: 'movies', name: 'Movies', icon: '🎬', color: 'var(--color-movies)' },
  { id: 'brain-strength', name: 'Brain Strength', icon: '🧠', color: 'var(--color-brain-strength)' },
  { id: 'animating-video-generator', name: 'Animating Video Generator', icon: '🎥', color: 'var(--color-animating-video-generator)' },
  { id: 'image-generator', name: 'Image Generator', icon: '🖼️', color: 'var(--color-image-generator)' },
];

/** Look up a category by its id. Returns undefined for unknown ids. */
export function getCategory(id) {
  return CATEGORIES.find((c) => c.id === id);
}

/** True when the id is one of the 7 known categories. */
export function isValidCategory(id) {
  return CATEGORIES.some((c) => c.id === id);
}
