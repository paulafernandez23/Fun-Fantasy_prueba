import { create } from 'zustand';

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
  isInitialized: boolean;
  setUser: (user: User | null) => void;
  setAdmin: (isAdmin: boolean) => void;
  setLoyaltyAccount: (loyalty: any | null) => void;
  setInitialized: (initialized: boolean) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()((set) => ({
  user: null,
  isAdmin: false,
  loyaltyAccount: null,
  isInitialized: false,
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
  setInitialized: (isInitialized) => set({ isInitialized }),
  logout: () => set({ user: null, isAdmin: false, loyaltyAccount: null }),
}));
