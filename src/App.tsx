import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import ParticleBackground from './components/3d/ParticleBackground'
import Navigation from './components/ui/Navigation'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Habits from './pages/Habits'
import Body from './pages/Body'
import Coach from './pages/Coach'
import Leads from './pages/Leads'
import Analytics from './pages/Analytics'
import Settings from './pages/Settings'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-neon-cyan animate-pulse text-lg">Loading...</div>
    </div>
  )
  if (!user) return <Navigate to="/" replace />
  return <>{children}</>
}

function AppRoutes() {
  const { user } = useAuth()

  return (
    <>
      {user && <ParticleBackground />}
      <div className="relative z-10 min-h-screen">
        <Routes>
          <Route path="/" element={user ? <Navigate to="/dashboard" replace /> : <Login />} />
          <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/habits" element={<ProtectedRoute><Habits /></ProtectedRoute>} />
          <Route path="/body" element={<ProtectedRoute><Body /></ProtectedRoute>} />
          <Route path="/coach" element={<ProtectedRoute><Coach /></ProtectedRoute>} />
          <Route path="/leads" element={<ProtectedRoute><Leads /></ProtectedRoute>} />
          <Route path="/analytics" element={<ProtectedRoute><Analytics /></ProtectedRoute>} />
          <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </div>
      {user && <Navigation />}
    </>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  )
}
