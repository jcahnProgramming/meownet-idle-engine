// ─────────────────────────────────────────────
//  MeowNet Idle Engine — Auth Hook
//  Supabase hosted auth (email/password + anon)
// ─────────────────────────────────────────────

import { useState, useEffect } from 'react';
import { createClient, Session, User } from '@supabase/supabase-js';
import { gameConfig } from '../config/gameConfig';

const supabase = createClient(
  gameConfig.remote.supabaseUrl,
  gameConfig.remote.supabaseAnonKey
);

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setUser(data.session?.user ?? null);
      setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string, username: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { username } },
    });
    return { error };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error };
  };

  const signInAnon = async () => {
    const { error } = await supabase.auth.signInAnonymously();
    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const username = user?.user_metadata?.username ?? user?.email?.split('@')[0] ?? 'Player';

  return { session, user, username, loading, signUp, signIn, signInAnon, signOut };
}
