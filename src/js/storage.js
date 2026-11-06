// LocalStorage Data Layer
const STORAGE_KEY = 'webclub_links_v1';

export const storage = {
  getData: () => {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      return data ? JSON.parse(data) : { categories: [], links: [] };
    } catch (e) {
      console.error('Failed to read LocalStorage:', e);
      return { categories: [], links: [] };
    }
  },
  saveData: (data) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
      console.error('Failed to write LocalStorage:', e);
    }
  },
  getCategories: () => storage.getData().categories || [],
  getLinks: (categoryId) => {
    const links = storage.getData().links || [];
    return categoryId ? links.filter(l => l.categoryId === categoryId) : links;
  },
  addLink: (link) => {
    const data = storage.getData();
    data.links = [...(data.links || []), link];
    storage.saveData(data);
  },
  deleteLink: (id) => {
    const data = storage.getData();
    data.links = (data.links || []).filter(l => l.id !== id);
    storage.saveData(data);
  }
};
