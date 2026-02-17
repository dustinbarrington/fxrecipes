import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { api } from '../utils/api'

export default function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { login } = useAuth()
  const { push } = useToast()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const onSubmit = async (e) => {
    e.preventDefault()
    try {
      const data = await api('/api/auth/login', { method: 'POST', body: { email, password } })
      login(data)
      push('Welcome back!')
      navigate(location.state?.from || '/')
    } catch (err) {
      push(err.message, 'error')
    }
  }

  return (
    <form onSubmit={onSubmit} className="mx-auto max-w-md rounded-3xl bg-white p-6 shadow-card">
      <h1 className="text-2xl font-bold">Login to FxRecipe AI</h1>
      <input className="mt-4 min-h-11 w-full rounded-xl border border-sage/30 px-3" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
      <input type="password" className="mt-3 min-h-11 w-full rounded-xl border border-sage/30 px-3" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} />
      <button className="mt-4 min-h-11 w-full rounded-xl bg-sage font-semibold text-white">Login</button>
      <button type="button" className="mt-3 text-sm text-sage underline">Forgot password (coming soon)</button>
      <p className="mt-2 text-sm">No account? <Link className="text-sage underline" to="/signup">Sign up</Link></p>
    </form>
  )
}
