import { defineStore } from 'pinia';
import { supabase } from '@/supabase/client';
import { useSupabase } from '@/composables/useSupabase';
import type { User } from '@supabase/supabase-js';

export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: null as null | (User & { role?: string })
  }),

  actions: {
    /** 
     * Initialize auth store:
     * - grab any active session
     * - set up listener for future changes 
     */
    async init() {
      // 1) Try to load existing session
      const {
        data: { session } = {},
        error: sessionError
      } = await supabase.auth.getSession();
      if (sessionError) {
        console.error('Error retrieving session:', sessionError.message);
      }
      const user = session?.user ?? null;

      if (user) {
        // Fetch role from profiles
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single();

        if (profileError) {
          console.warn('Could not fetch role from profiles:', profileError.message);
          this.user = user; // fallback without role
        } else {
          this.user = { ...user, role: profile?.role || 'user' };
        }
      } else {
        this.user = null;
      }

      // this.user = session?.user ?? null;

      // 2) Subscribe to login / logout events
      supabase.auth.onAuthStateChange(async (_event, newSession) => {
        const newUser = newSession?.user ?? null;
        if (newUser) {
          // fetch role on auth change
          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', newUser.id)
            .single();

          if (profileError) {
            console.warn('Could not fetch role from profiles:', profileError.message);
            this.user = newUser;
          } else {
            this.user = { ...newUser, role: profile?.role || 'user' };
          }
        } else {
          this.user = null;
        }
      });
    },

    /**
     * Perform email/password login.
     * After success, the onAuthStateChange listener will fire and set `this.user`.
     */
    async login(email: string, password: string) {
      const { data, error } = await useSupabase().signIn(email, password);
      if (error) throw error;
      // you can also immediately set this.user = data.session?.user
    },

    /**
     * Register a new account.
     */
    async register(email: string, password: string) {
      const { data, error } = await useSupabase().signUp(email, password);
      if (error) throw error;
      this.user = data.user;
    },

    /**
     * Log out the current user.
     */
    async logout() {
      await useSupabase().signOut();
      this.user = null;
    }
  }
});