import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useNavigate } from 'react-router-dom'
import ParticleBackground from '../components/3d/ParticleBackground'

export default function Login() {
  const [isSignUp, setIsSignUp] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [username, setUsername] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { signIn, signUp } = useAuth()
  const navigate = useNavigate()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      if (isSignUp) {
        if (!username.trim()) throw new Error('Username is required')
        await signUp(email, password, username)
        navigate('/dashboard')
      } else {
        await signIn(email, password)
        navigate('/dashboard')
      }
    } catch (err: any) {
      setError(err.message || 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative">
      <ParticleBackground />
      <div className="relative z-10 w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="text-5xl mb-3 animate-float">✨</div>
          <h1 className="text-3xl font-bold neon-text">Renaissance</h1>
          <p className="text-white/40 text-sm mt-1">Your daily life tracker</p>
        </div>

        <form onSubmit={handleSubmit} className="glass-strong p-6 space-y-4">
          <h2 className="text-lg font-semibold text-white text-center">
            {isSignUp ? 'Create Account' : 'Welcome Back'}
          </h2>

          {error && (
            <div className="text-red-400 text-xs bg-red-400/10 p-2 rounded-lg text-center">
              {error}
            </div>
          )}

          {isSignUp && (
            <div>
              <label className="text-xs text-white/40 uppercase tracking-wider block mb-1">Username</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-neon-cyan/50 transition-colors"
                placeholder="Choose a username"
              />
            </div>
          )}

          <div>
            <label className="text-xs text-white/40 uppercase tracking-wider block mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-neon-cyan/50 transition-colors"
              placeholder="you@example.com"
              required
            />
          </div>

          <div>
            <label className="text-xs text-white/40 uppercase tracking-wider block mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-neon-cyan/50 transition-colors"
              placeholder="••••••••"
              required
              minLength={6}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-lg font-medium text-sm transition-all bg-neon-cyan/20 text-neon-cyan border border-neon-cyan/30 hover:bg-neon-cyan/30 disabled:opacity-50"
          >
            {loading ? 'Please wait...' : isSignUp ? 'Create Account' : 'Sign In'}
          </button>

          <p className="text-center text-xs text-white/30">
            {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
            <button
              type="button"
              onClick={() => { setIsSignUp(!isSignUp); setError('') }}
              className="text-neon-cyan hover:underline"
            >
              {isSignUp ? 'Sign in' : 'Sign up'}
            </button>
          </p>
        </form>
      </div>
    </div>
  )
}
