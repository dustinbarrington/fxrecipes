import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import RecipeCard from '../components/RecipeCard'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import useDebounce from '../hooks/useDebounce'
import usePullToRefresh from '../hooks/usePullToRefresh'
import { api } from '../utils/api'

export default function RecipeBoxPage() {
  const { token } = useAuth()
  const { push } = useToast()
  const navigate = useNavigate()
  const [recipes, setRecipes] = useState([])
  const [tab, setTab] = useState('all')
  const [search, setSearch] = useState('')
  const debounced = useDebounce(search, 300)

  const load = useCallback(async () => {
    const data = await api('/api/recipes/my', { token })
    setRecipes(data)
  }, [token])

  useEffect(() => { load().catch(() => {}) }, [load])
  const pulling = usePullToRefresh(load)

  const filtered = useMemo(() => recipes.filter((r) => {
    const tabOk = tab === 'all' || r.is_favorite
    const query = debounced.toLowerCase()
    const searchOk = !query || r.recipe_name.toLowerCase().includes(query) || JSON.stringify(r.transformed_recipe).toLowerCase().includes(query)
    return tabOk && searchOk
  }), [recipes, tab, debounced])

  const toggleFavorite = async (id) => {
    await api(`/api/recipes/${id}/favorite`, { method: 'PUT', token })
    push('Added to favorites!')
    load()
  }

  const remove = async (id) => {
    await api(`/api/recipes/${id}`, { method: 'DELETE', token })
    push('Recipe deleted')
    load()
  }

  return (
    <section className="space-y-4">
      <div className="rounded-3xl bg-white p-5 shadow-card">
        <h1 className="text-2xl font-bold">My Recipe Box</h1>
        <div className="mt-3 flex flex-wrap gap-2"><button onClick={() => setTab('all')} className={`min-h-11 rounded-xl px-3 ${tab === 'all' ? 'bg-sage text-white' : 'bg-cream'}`}>All Recipes ({recipes.length})</button><button onClick={() => setTab('favorites')} className={`min-h-11 rounded-xl px-3 ${tab === 'favorites' ? 'bg-sage text-white' : 'bg-cream'}`}>Favorites ({recipes.filter((r) => r.is_favorite).length})</button></div>
        <input className="mt-3 min-h-11 w-full rounded-xl border border-sage/30 px-3" placeholder="Search recipes or ingredients" value={search} onChange={(e) => setSearch(e.target.value)} />
        {debounced && <p className="mt-1 text-xs text-charcoal/60">{filtered.length} results for "{debounced}"</p>}
        {pulling && <p className="mt-2 text-xs text-sage">Refreshing…</p>}
      </div>
      {!filtered.length ? (
        <div className="rounded-3xl bg-white p-8 text-center shadow-card"><p>No saved recipes yet. Transform your first recipe!</p><Link className="mt-3 inline-block rounded-xl bg-sage px-4 py-2 text-white" to="/">Go to Transformer</Link></div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((r) => (
            <RecipeCard key={r.id} recipe={r} onFavorite={() => toggleFavorite(r.id)} onDelete={() => remove(r.id)} onRemix={() => navigate('/', { state: { remixRecipe: r } })} compact />
          ))}
        </div>
      )}
    </section>
  )
}
