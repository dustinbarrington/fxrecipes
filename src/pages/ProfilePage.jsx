import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Modal from '../components/Modal'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { api } from '../utils/api'

const preferencesList = ['Dairy Free', 'Gluten Free', 'Nut Free', 'Egg Free', 'No Nightshades', 'High Protein', 'Budget Friendly']
const diets = ['General Functional Nutrition', 'Anti-Inflammatory', 'Blood Sugar Balance / Glycemic', 'Autoimmune Protocol (AIP)', 'Gut Healing / Low FODMAP', 'Ketogenic / Low Carb', 'Paleo', 'Carnivore-Adjacent', 'Hormone Balance']

export default function ProfilePage() {
  const { user, token, setUser, logout } = useAuth()
  const { push } = useToast()
  const navigate = useNavigate()
  const [diet, setDiet] = useState(user?.default_diet || diets[0])
  const [prefs, setPrefs] = useState(user?.preferences || [])
  const [stats, setStats] = useState({ used: 0, limit: 3, saved: 0, favorites: 0 })
  const [pw, setPw] = useState({ currentPassword: '', newPassword: '', confirm: '' })
  const [open, setOpen] = useState(false)

  useEffect(() => {
    api('/api/usage', { token }).then((u) => setStats((s) => ({ ...s, used: u.used, limit: u.limit }))).catch(() => {})
    api('/api/recipes/my', { token }).then((recipes) => setStats((s) => ({ ...s, saved: recipes.length, favorites: recipes.filter((r) => r.is_favorite).length }))).catch(() => {})
  }, [token])

  const togglePref = (p) => setPrefs((v) => v.includes(p) ? v.filter((x) => x !== p) : [...v, p])

  return (
    <section className="space-y-4">
      <div className="rounded-3xl bg-white p-5 shadow-card"><h1 className="text-2xl font-bold">Profile</h1><p className="text-sm">{user?.email} • member since {new Date(user?.created_at || Date.now()).toLocaleDateString()}</p></div>
      <div className="rounded-3xl bg-white p-5 shadow-card"><h2 className="text-lg font-bold">Health preferences</h2><select className="mt-2 min-h-11 w-full rounded-xl border border-sage/30 px-3" value={diet} onChange={(e) => setDiet(e.target.value)}>{diets.map((d) => <option key={d}>{d}</option>)}</select><div className="mt-2 grid grid-cols-2 gap-2">{preferencesList.map((p) => <label key={p} className="text-sm"><input type="checkbox" checked={prefs.includes(p)} onChange={() => togglePref(p)} className="mr-2" />{p}</label>)}</div><button onClick={async () => { await api('/api/user/profile', { method: 'PUT', token, body: { defaultDiet: diet, preferences: prefs } }); setUser((u) => ({ ...u, default_diet: diet, preferences: prefs })); push('Profile updated!') }} className="mt-3 min-h-11 rounded-xl bg-sage px-4 text-white">Save changes</button></div>
      <div className="rounded-3xl bg-white p-5 shadow-card"><h2 className="text-lg font-bold">Account settings</h2><div className="mt-2 grid gap-2 md:grid-cols-3"><input type="password" placeholder="Current" className="min-h-11 rounded-xl border border-sage/30 px-3" value={pw.currentPassword} onChange={(e) => setPw({ ...pw, currentPassword: e.target.value })} /><input type="password" placeholder="New" className="min-h-11 rounded-xl border border-sage/30 px-3" value={pw.newPassword} onChange={(e) => setPw({ ...pw, newPassword: e.target.value })} /><input type="password" placeholder="Confirm" className="min-h-11 rounded-xl border border-sage/30 px-3" value={pw.confirm} onChange={(e) => setPw({ ...pw, confirm: e.target.value })} /></div><button onClick={async () => { if (pw.newPassword !== pw.confirm) return push('Passwords do not match', 'error'); await api('/api/user/password', { method: 'PUT', token, body: { currentPassword: pw.currentPassword, newPassword: pw.newPassword } }); push('Password updated!') }} className="mt-3 min-h-11 rounded-xl border border-sage/30 px-4">Change password</button></div>
      <div className="rounded-3xl bg-white p-5 shadow-card"><h2 className="text-lg font-bold">Stats</h2><p className="text-sm">Recipes transformed this month: {stats.used} of {stats.limit}</p><p className="text-sm">Total saved: {stats.saved}</p><p className="text-sm">Total favorites: {stats.favorites}</p></div>
      <div className="rounded-3xl border border-red-200 bg-white p-5 shadow-card"><h2 className="text-lg font-bold text-red-500">Danger zone</h2><button onClick={() => setOpen(true)} className="mt-2 min-h-11 rounded-xl border border-red-300 px-4">Delete account</button></div>
      <Modal open={open} onClose={() => setOpen(false)} title="Delete account?">
        <p className="text-sm">This will permanently remove your account and recipes.</p>
        <button onClick={async () => { await api('/api/user', { method: 'DELETE', token }); logout(); push('Account deleted'); navigate('/') }} className="mt-3 min-h-11 rounded-xl bg-red-500 px-4 text-white">Confirm delete</button>
      </Modal>
    </section>
  )
}
