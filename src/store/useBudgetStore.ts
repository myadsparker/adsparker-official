import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface BudgetState {
  budget: number;
  setBudget: (value: number) => void;
  resetBudget: () => void;
}

export const useBudgetStore = create<BudgetState>()(
  persist(
    set => ({
      budget: 50, // default value
      setBudget: value => {
        // Ensure the value is within valid range
        const clampedValue = Math.max(1, Math.min(150, value));
        set({ budget: clampedValue });
      },
      resetBudget: () => set({ budget: 50 }),
    }),
    {
      name: 'budget-storage', // localStorage key
    }
  )
);
