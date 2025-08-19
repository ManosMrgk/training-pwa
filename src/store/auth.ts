import { defineStore } from 'pinia';
import router from '@/router';
import { supabase } from '@/supabase/client';
import { useSupabase } from '@/composables/useSupabase';
import type { User } from '@supabase/supabase-js';

export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: null as null | (User & { role?: string }),
    isReady: false as boolean,
    _readyPromise: null as Promise<void> | null,
  }),

  actions: {
    async ensureReady() {
      if (this.isReady) return
      if (!this._readyPromise) this._readyPromise = this.init()
      await this._readyPromise
    },
    /** 
     * Initialize auth store:
     * - grab any active session
     * - set up listener for future changes 
     */
    async init() {
      try {
        // 1) Load current session
        const {
          data: { session } = {},
          error: sessionError
        } = await supabase.auth.getSession()
        if (sessionError) console.error('Error retrieving session:', sessionError.message)

        const user = session?.user ?? null

        if (user) {
          // 2) Fetch role once (block until we know it so guards are deterministic)
          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single()

          this.user = profileError
            ? user
            : { ...user, role: profile?.role || 'user' }
        } else {
          this.user = null
        }

        // 3) Listen to future auth changes (update role too)
        supabase.auth.onAuthStateChange(async (_event, newSession) => {
          const newUser = newSession?.user ?? null
          if (!newUser) {
            this.user = null
            return
          }
          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', newUser.id)
            .single()

          this.user = profileError
            ? newUser
            : { ...newUser, role: profile?.role || 'user' }
        })
      } finally {
        this.isReady = true
        this._readyPromise = null
      }
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
      const base = import.meta.env.BASE_URL || '/'
      const redirectTo = `${window.location.origin}${base}`

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: redirectTo }
      })

      if (error) throw error;
     
      if (data.session) {
        await useSupabase().signOut();
      }
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