import { create } from 'zustand';

interface CountState {
  count: number;
  setCount: (count: number) => void;
  fetchCount: (projectId: string) => Promise<void>;
}

export const useCountStore = create<CountState>(set => ({
  count: 0,

  setCount: count => set({ count }),

  fetchCount: async (projectId: string) => {
    try {
      const res = await fetch(`/api/projects/${projectId}/images`);
      const data = await res.json();
      if (data.success) {
        set({ count: data.count || 0 });
      }
    } catch (err) {
      console.error('Error fetching count:', err);
    }
  },
}));
