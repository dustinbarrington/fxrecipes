import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { api } from '../utils/api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [token, setToken] = useState(localStorage.getItem('fxrecipe_token') || '')
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadMe = async () => {
      if (!token) {
        setLoading(false)
        return
      }
      try {
        const data = await api('/api/auth/me', { token })
        setUser(data.user)
      } catch {
        setToken('')
        localStorage.removeItem('fxrecipe_token')
      } finally {
        setLoading(false)
      }
    }
    loadMe()
  }, [token])

  const login = ({ token: nextToken, user: nextUser }) => {
    setToken(nextToken)
    setUser(nextUser)
    localStorage.setItem('fxrecipe_token', nextToken)
  }

  const logout = () => {
    setToken('')
    setUser(null)
    localStorage.removeItem('fxrecipe_token')
  }

  const value = useMemo(() => ({ token, user, login, logout, setUser, loading, isAuthed: !!user }), [token, user, loading])
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  return useContext(AuthContext)
}
