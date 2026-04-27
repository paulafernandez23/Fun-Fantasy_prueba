import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User } from 'firebase/auth';

interface AuthState {
  user: {
    uid: string;
    email: string | null;
    displayName: string | null;
    photoURL: string | null;
  } | null;
  isAdmin: boolean;
  loyaltyAccount: any | null;
  setUser: (user: User | null) => void;
  setAdmin: (isAdmin: boolean) => void;
  setLoyaltyAccount: (loyalty: any | null) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isAdmin: false,
      loyaltyAccount: null,
      setUser: (user) => set({ 
        user: user ? {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName,
          photoURL: user.photoURL
        } : null 
      }),
      setAdmin: (isAdmin) => set({ isAdmin }),
      setLoyaltyAccount: (loyaltyAccount) => set({ loyaltyAccount }),
      logout: () => set({ user: null, isAdmin: false, loyaltyAccount: null }),
    }),
    {
      name: 'auth-storage',
    }
  )
);
