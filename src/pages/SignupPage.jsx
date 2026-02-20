import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { api } from '../utils/api'

const diets = ['General Functional Nutrition', 'Anti-Inflammatory', 'Blood Sugar Balance / Glycemic', 'Autoimmune Protocol (AIP)', 'Gut Healing / Low FODMAP', 'Ketogenic / Low Carb', 'Paleo', 'Carnivore-Adjacent', 'Hormone Balance']

export default function SignupPage() {
  const navigate = useNavigate()
  const { login } = useAuth()
  const { push } = useToast()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [goal, setGoal] = useState(diets[0])

  const onSubmit = async (e) => {
    e.preventDefault()
    if (password !== confirm) return push('Passwords do not match', 'error')
    try {
      const data = await api('/api/auth/signup', { method: 'POST', body: { email, password, defaultDiet: goal } })
      login(data)
      push('Account created!')
      navigate('/recipe-box')
    } catch (err) {
      push(err.message, 'error')
    }
  }

  return (
    <form onSubmit={onSubmit} className="mx-auto max-w-md rounded-3xl bg-white p-6 shadow-card">
      <h1 className="text-2xl font-bold">Create your FxRecipe AI account</h1>
      <input className="mt-4 min-h-11 w-full rounded-xl border border-sage/30 px-3" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
      <input type="password" className="mt-3 min-h-11 w-full rounded-xl border border-sage/30 px-3" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} />
      <input type="password" className="mt-3 min-h-11 w-full rounded-xl border border-sage/30 px-3" placeholder="Confirm Password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
      <label className="mt-3 block text-sm font-semibold">What's your primary health goal?</label>
      <select value={goal} onChange={(e) => setGoal(e.target.value)} className="mt-2 min-h-11 w-full rounded-xl border border-sage/30 px-3">{diets.map((d) => <option key={d}>{d}</option>)}</select>
      <button className="mt-4 min-h-11 w-full rounded-xl bg-sage font-semibold text-white">Sign Up</button>
    </form>
  )
}
