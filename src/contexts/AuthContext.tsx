import { createContext, useContext, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { supabase } from '../lib/supabase-enhanced'

export interface Profile {
  id?: string
  username: string
  xp: number
  level: number
  streak: number
  max_streak: number
  streak_freeze: number
  created_at?: string
}

export interface LocalUser {
  id: string
  email: string
  user_metadata?: { username?: string }
}

interface AuthContextType {
  user: LocalUser | null
  session: { user: LocalUser } | null
  profile: Profile | null
  loading: boolean
  signUp: (email: string, password: string, username: string) => Promise<void>
  signIn: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
  updateProfile: (updates: Partial<Profile>) => Promise<void>
  addXP: (amount: number, source: string) => Promise<void>
}

const DEFAULT_USER: LocalUser = {
  id: 'local',
  email: 'senruk@local',
  user_metadata: { username: 'Senruk' },
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<LocalUser | null>(DEFAULT_USER)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchProfile('local')
  }, [])

  async function fetchProfile(userId: string) {
    try {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()
      if (data) {
        setProfile(data)
      } else {
        const initial: Profile = {
          id: userId,
          username: 'Senruk',
          xp: 0,
          level: 1,
          streak: 0,
          max_streak: 0,
          streak_freeze: 1,
        }
        await supabase.from('profiles').insert(initial)
        setProfile(initial)
      }
    } catch {
      // Fallback in-memory profile
      setProfile({
        id: userId,
        username: 'Senruk',
        xp: 0,
        level: 1,
        streak: 0,
        max_streak: 0,
        streak_freeze: 1,
      })
    } finally {
      setLoading(false)
    }
  }

  async function signUp(_email: string, _password: string, username: string) {
    const updated: Profile = {
      ...(profile || {
        id: 'local',
        xp: 0,
        level: 1,
        streak: 0,
        max_streak: 0,
        streak_freeze: 1,
      }),
      username: username || 'Senruk',
    }
    await supabase.from('profiles').update(updated).eq('id', 'local')
    setProfile(updated)
  }

  async function signIn(_email: string, _password: string) {
    setUser(DEFAULT_USER)
    await fetchProfile('local')
  }

  async function signOut() {
    // Single-user mode: no-op signout or reset
  }

  async function refreshProfile() {
    await fetchProfile('local')
  }

  async function updateProfile(updates: Partial<Profile>) {
    await supabase.from('profiles').update(updates).eq('id', 'local')
    setProfile((prev) => (prev ? { ...prev, ...updates } : prev))
  }

  async function addXP(amount: number, source: string) {
    const cur = profile || {
      username: 'Senruk',
      xp: 0,
      level: 1,
      streak: 0,
      max_streak: 0,
      streak_freeze: 1,
    }
    const newXp = (cur.xp || 0) + amount
    const levelThresholds = [
      0, 100, 250, 500, 900, 1400, 2100, 3000, 4200, 5700, 7500, 10000, 13000,
      17000, 22000, 28000, 36000, 46000, 58000, 73000,
    ]
    let newLevel = cur.level || 1
    while (newLevel < levelThresholds.length && newXp >= levelThresholds[newLevel]) {
      newLevel++
    }
    await supabase.from('profiles').update({ xp: newXp, level: newLevel }).eq('id', 'local')
    await supabase.from('xp_logs').insert({ user_id: 'local', amount, source })
    setProfile((prev) => (prev ? { ...prev, xp: newXp, level: newLevel } : prev))
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        session: user ? { user } : null,
        profile,
        loading,
        signUp,
        signIn,
        signOut,
        refreshProfile,
        updateProfile,
        addXP,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
