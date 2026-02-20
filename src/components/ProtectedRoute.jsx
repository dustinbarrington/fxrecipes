import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function ProtectedRoute({ children }) {
  const { isAuthed, loading } = useAuth()
  const location = useLocation()
  if (loading) return <div className="rounded-2xl bg-white p-6">Loading...</div>
  if (!isAuthed) return <Navigate to="/login" replace state={{ from: location.pathname }} />
  return children
}
