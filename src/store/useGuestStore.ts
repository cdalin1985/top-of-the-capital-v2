import { create } from 'zustand';

interface GuestState {
    isGuest: boolean;
    guestEmail: string | null;
    guestPhone: string | null;
    setGuest: (email: string, phone: string) => void;
    clearGuest: () => void;
}

export const useGuestStore = create<GuestState>((set) => ({
    isGuest: false,
    guestEmail: null,
    guestPhone: null,
    setGuest: (email, phone) => set({ isGuest: true, guestEmail: email, guestPhone: phone }),
    clearGuest: () => set({ isGuest: false, guestEmail: null, guestPhone: null }),
}));
