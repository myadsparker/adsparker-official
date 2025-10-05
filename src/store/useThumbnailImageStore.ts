import { create } from 'zustand';

interface ThumbnailState {
  thumbnailUrl: string | null;
  loading: boolean;
  fetchThumbnail: (projectId: string) => Promise<void>;
}

export const useThumbnailStore = create<ThumbnailState>(set => ({
  thumbnailUrl: null,
  loading: false,

  fetchThumbnail: async projectId => {
    set({ loading: true });
    try {
      const res = await fetch(`/api/projects/${projectId}/adset-thumbnail`);
      const json = await res.json();
      set({ thumbnailUrl: json.thumbnail || null });
    } catch (err) {
      console.error('Failed to fetch thumbnail:', err);
    } finally {
      set({ loading: false });
    }
  },
}));
