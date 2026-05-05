import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export const useAuthStore = create(
    persist(
        (set) => ({
            token: null,
            role: null,
            user: null,
            setAuth: (token, role, full_name) => set({ token, role, user: { full_name } }),
            logout: () => set({ token: null, role: null, user: null }),
        }),
        { name: 'auth-storage' }
    )
)