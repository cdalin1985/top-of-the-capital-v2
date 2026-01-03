import { create } from 'zustand';
import { supabase } from '../lib/supabase';

interface NotificationState {
    unreadCount: number;
    fetchUnreadCount: (userId: string) => Promise<void>;
    setUnreadCount: (count: number) => void;
}

export const useNotificationStore = create<NotificationState>((set) => ({
    unreadCount: 0,
    fetchUnreadCount: async (userId: string) => {
        try {
            const { count, error } = await supabase
                .from('challenges')
                .select('*', { count: 'exact', head: true })
                .eq('challenged_id', userId)
                .eq('status', 'pending');

            if (error) throw error;
            set({ unreadCount: count || 0 });
        } catch (error) {
            console.error('Error fetching unread count:', error);
        }
    },
    setUnreadCount: (count: number) => set({ unreadCount: count }),
}));
