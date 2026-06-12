import { createContext, useContext, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { supabase } from '../lib/supabase'
import type { User, Session } from '@supabase/supabase-js'

interface Profile {
  username: string
  xp: number
  level: number
  streak: number
  max_streak: number
  streak_freeze: number
  created_at: string
}

interface AuthContextType {
  user: User | null
  session: Session | null
  profile: Profile | null
  loading: boolean
  signUp: (email: string, password: string, username: string) => Promise<void>
  signIn: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
  updateProfile: (updates: Partial<Profile>) => Promise<void>
  addXP: (amount: number, source: string) => Promise<void>
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setUser(session?.user ?? null)
      if (session?.user) fetchProfile(session.user.id)
      else setLoading(false)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      setUser(session?.user ?? null)
      if (session?.user) fetchProfile(session.user.id)
      else { setProfile(null); setLoading(false) }
    })
    return () => subscription.unsubscribe()
  }, [])

  async function fetchProfile(userId: string) {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()
    if (data) setProfile(data)
    else {
      const { data: newProfile } = await supabase
        .from('profiles')
        .insert({ id: userId, username: 'User', xp: 0, level: 1, streak: 0, max_streak: 0, streak_freeze: 1 })
        .select()
        .single()
      if (newProfile) setProfile(newProfile)
    }
    setLoading(false)
  }

  async function signUp(email: string, password: string, username: string) {
    const { data, error } = await supabase.auth.signUp({ email, password })
    if (error) throw error
    if (data.user) {
      await supabase.from('profiles').insert({
        id: data.user.id,
        username,
        xp: 0,
        level: 1,
        streak: 0,
        max_streak: 0,
        streak_freeze: 1,
      })
      setProfile({ username, xp: 0, level: 1, streak: 0, max_streak: 0, streak_freeze: 1, created_at: new Date().toISOString() })
    }
  }

  async function signIn(email: string, password: string) {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
  }

  async function signOut() {
    await supabase.auth.signOut()
    setUser(null)
    setSession(null)
    setProfile(null)
  }

  async function refreshProfile() {
    if (!user) return
    await fetchProfile(user.id)
  }

  async function updateProfile(updates: Partial<Profile>) {
    if (!user) return
    await supabase.from('profiles').update(updates).eq('id', user.id)
    setProfile(prev => prev ? { ...prev, ...updates } : prev)
  }

  async function addXP(amount: number, source: string) {
    if (!user || !profile) return
    const newXp = profile.xp + amount
    const levelThresholds = [0, 100, 250, 500, 900, 1400, 2100, 3000, 4200, 5700, 7500, 10000, 13000, 17000, 22000, 28000, 36000, 46000, 58000, 73000]
    let newLevel = profile.level
    while (newLevel < levelThresholds.length && newXp >= levelThresholds[newLevel]) {
      newLevel++
    }
    await supabase.from('profiles').update({ xp: newXp, level: newLevel }).eq('id', user.id)
    await supabase.from('xp_logs').insert({ user_id: user.id, amount, source })
    setProfile(prev => prev ? { ...prev, xp: newXp, level: newLevel } : prev)
  }

  return (
    <AuthContext.Provider value={{ user, session, profile, loading, signUp, signIn, signOut, refreshProfile, updateProfile, addXP }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
