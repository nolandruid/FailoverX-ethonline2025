import { supabase } from '@/globals/lib/supabaseClient'
import type { User } from '@supabase/supabase-js'

export async function getSession(): Promise<{ user: User | null; error: any }> {
  try {
    const { data: { session }, error } = await supabase.auth.getSession()
    return { user: session?.user ?? null, error }
  } catch (error) {
    return { user: null, error }
  }
}

export async function signIn(email: string, password: string): Promise<{ user: User | null; error: any }> {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    return { user: data.user, error }
  } catch (error) {
    return { user: null, error }
  }
}

export async function signUp(email: string, password: string): Promise<{ user: User | null; error: any }> {
  try {
    const { data, error } = await supabase.auth.signUp({ email, password })
    return { user: data.user, error }
  } catch (error) {
    return { user: null, error }
  }
}

export async function signOut(): Promise<{ error: any }> {
  try {
    const { error } = await supabase.auth.signOut()
    return { error }
  } catch (error) {
    return { error }
  }
}

export function onAuthStateChange(callback: (user: User | null) => void) {
  return supabase.auth.onAuthStateChange((_event, session) => {
    callback(session?.user ?? null)
  })
}