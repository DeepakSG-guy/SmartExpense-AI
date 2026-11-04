import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import type { User, Session } from '@supabase/supabase-js';
import { getSupabaseClient, isSupabaseConfigured } from '../services/supabaseClient';

export interface UserProfile {
  id: string;
  displayName: string;
  currency: string;
  dateFormat: string;
  theme: string;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: UserProfile | null;
  isLoading: boolean;
  isConfigured: boolean;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: Error | null; user: User | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null; user: User | null }>;
  signInWithGoogle: () => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: Error | null }>;
  updatePassword: (newPassword: string) => Promise<{ error: Error | null }>;
  updateProfile: (data: Partial<UserProfile>) => Promise<{ error: Error | null }>;
  refreshAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isConfigured, setIsConfigured] = useState(isSupabaseConfigured());

  const fetchProfile = useCallback(async (userId: string) => {
    const supabase = getSupabaseClient();
    if (!supabase) return;

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (!error && data) {
        setProfile({
          id: data.id,
          displayName: data.display_name || '',
          currency: data.currency || 'INR',
          dateFormat: data.date_format || 'DD/MM/YYYY',
          theme: data.theme || 'light',
        });
      }
    } catch (err) {
      console.warn('Failed to fetch user profile:', err);
    }
  }, []);

  const refreshAuth = useCallback(async () => {
    const configured = isSupabaseConfigured();
    setIsConfigured(configured);

    if (!configured) {
      setUser(null);
      setSession(null);
      setProfile(null);
      setIsLoading(false);
      return;
    }

    const supabase = getSupabaseClient();
    if (!supabase) {
      setIsLoading(false);
      return;
    }

    try {
      const { data } = await supabase.auth.getSession();
      setSession(data.session);
      setUser(data.session?.user || null);
      if (data.session?.user) {
        await fetchProfile(data.session.user.id);
      } else {
        setProfile(null);
      }
    } catch (err) {
      console.error('Error fetching auth session:', err);
    } finally {
      setIsLoading(false);
    }
  }, [fetchProfile]);

  useEffect(() => {
    refreshAuth();

    const supabase = getSupabaseClient();
    if (!supabase) return;

    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      setSession(newSession);
      setUser(newSession?.user || null);

      if (newSession?.user) {
        // Ensure profile row exists (crucial for Google OAuth sign-in)
        try {
          const meta = newSession.user.user_metadata || {};
          const fullName = meta.full_name || meta.name || newSession.user.email?.split('@')[0] || 'User';
          await supabase.from('profiles').upsert(
            {
              id: newSession.user.id,
              display_name: fullName,
              currency: 'INR',
            },
            { onConflict: 'id', ignoreDuplicates: true }
          );
        } catch (e) {
          console.warn('Profile sync on auth change warning:', e);
        }

        await fetchProfile(newSession.user.id);

        // For GitHub Pages & HashRouter compatibility:
        // Supabase OAuth redirects to base URL with hash containing access_token.
        // If detected, clear token params and ensure we stay on a clean hash route.
        if (typeof window !== 'undefined' && window.location.hash.includes('access_token=')) {
          window.history.replaceState(null, '', window.location.pathname + window.location.search);
          if (!window.location.hash || window.location.hash === '#/' || window.location.hash.startsWith('#/login') || window.location.hash.startsWith('#/register')) {
            window.location.hash = '#/';
          }
        }
      } else {
        setProfile(null);
      }

      setIsLoading(false);
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [refreshAuth, fetchProfile]);

  const signUp = async (email: string, password: string, fullName: string) => {
    const supabase = getSupabaseClient();
    if (!supabase) {
      return {
        error: new Error('Supabase is not configured. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.'),
        user: null,
      };
    }

    try {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            full_name: fullName.trim(),
          },
          emailRedirectTo: `${window.location.origin}/#/login`,
        },
      });

      if (error) return { error, user: null };

      // Initialize profile if returned immediately
      if (data.user) {
        await supabase.from('profiles').upsert({
          id: data.user.id,
          display_name: fullName.trim(),
          currency: 'INR',
        });
      }

      return { error: null, user: data.user };
    } catch (err: any) {
      return { error: err, user: null };
    }
  };

  const signIn = async (email: string, password: string) => {
    const supabase = getSupabaseClient();
    if (!supabase) {
      return {
        error: new Error('Supabase is not configured. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.'),
        user: null,
      };
    }

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) return { error, user: null };
      return { error: null, user: data.user };
    } catch (err: any) {
      return { error: err, user: null };
    }
  };

  const signInWithGoogle = async () => {
    const supabase = getSupabaseClient();
    if (!supabase) {
      return {
        error: new Error('Supabase is not configured. Please configure your credentials in Settings.'),
      };
    }

    try {
      // For GitHub Pages & HashRouter compatibility:
      // Redirect to origin + pathname without hash fragment.
      const redirectTo = typeof window !== 'undefined'
        ? `${window.location.origin}${window.location.pathname}`
        : undefined;

      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      });

      return { error };
    } catch (err: any) {
      return { error: err };
    }
  };

  const signOut = async () => {
    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        await supabase.auth.signOut();
      } catch (err) {
        console.warn('Sign out error:', err);
      }
    }

    setUser(null);
    setSession(null);
    setProfile(null);
  };

  const resetPassword = async (email: string) => {
    const supabase = getSupabaseClient();
    if (!supabase) {
      return {
        error: new Error('Supabase is not configured. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.'),
      };
    }

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/#/reset-password`,
      });
      return { error };
    } catch (err: any) {
      return { error: err };
    }
  };

  const updatePassword = async (newPassword: string) => {
    const supabase = getSupabaseClient();
    if (!supabase) {
      return {
        error: new Error('Supabase is not configured.'),
      };
    }

    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });
      return { error };
    } catch (err: any) {
      return { error: err };
    }
  };

  const updateProfile = async (updates: Partial<UserProfile>) => {
    const supabase = getSupabaseClient();
    if (!supabase || !user) {
      return { error: new Error('Not authenticated') };
    }

    try {
      const dbPayload: any = {};
      if (updates.displayName !== undefined) dbPayload.display_name = updates.displayName;
      if (updates.currency !== undefined) dbPayload.currency = updates.currency;
      if (updates.dateFormat !== undefined) dbPayload.date_format = updates.dateFormat;
      if (updates.theme !== undefined) dbPayload.theme = updates.theme;
      dbPayload.updated_at = new Date().toISOString();

      const { error } = await supabase
        .from('profiles')
        .upsert({ id: user.id, ...dbPayload });

      if (!error) {
        setProfile((prev) => (prev ? { ...prev, ...updates } : null));
      }

      return { error };
    } catch (err: any) {
      return { error: err };
    }
  };

  const value = useMemo(
    () => ({
      user,
      session,
      profile,
      isLoading,
      isConfigured,
      signUp,
      signIn,
      signInWithGoogle,
      signOut,
      resetPassword,
      updatePassword,
      updateProfile,
      refreshAuth,
    }),
    [user, session, profile, isLoading, isConfigured, refreshAuth]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
