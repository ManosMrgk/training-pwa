import { supabase } from '@/supabase/client';
import type { User } from '@supabase/supabase-js';

/**
 * Provides authentication helpers using Supabase Auth v2.
 */
export function useSupabase() {
  /**
   * Retrieves the current authenticated user, if any.
   */
  // const getUser = async (): Promise<User | null> => {
  //   const { data, error } = await supabase.auth.getUser();
  //   if (error) {
  //     console.error('Error fetching user:', error.message);
  //     return null;
  //   }
  //   return data.user;
  // };

  const getUser = async (): Promise<User & { role?: string } | null> => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) {
      console.error('Error fetching user:', error?.message);
      return null;
    }

    const user = data.user;

    // Fetch the role from the profiles table
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError) {
      console.error('Error fetching profile role:', profileError.message);
      return { ...user, role: 'user' }; // fallback
    }

    return { ...user, role: profile.role };
  };

  /**
   * Sign in with email & password.
   */
  const signIn = (email: string, password: string) =>
    supabase.auth.signInWithPassword({ email, password });

  /**
   * Sign up with email & password.
   */
  const signUp = (email: string, password: string) =>
    supabase.auth.signUp({ email, password });

  /**
   * Sign out current session.
   */
  const signOut = () => supabase.auth.signOut();

  return { getUser, signIn, signUp, signOut };
}