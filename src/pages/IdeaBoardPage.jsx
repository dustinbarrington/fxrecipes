import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import RecipeCard from '../components/RecipeCard'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import useDebounce from '../hooks/useDebounce'
import usePullToRefresh from '../hooks/usePullToRefresh'
import { api } from '../utils/api'

const mealTypes = ['all', 'breakfast', 'lunch', 'dinner', 'snack', 'dessert']

export default function IdeaBoardPage() {
  const { token, isAuthed } = useAuth()
  const { push } = useToast()
  const navigate = useNavigate()
  const [recipes, setRecipes] = useState([])
  const [query, setQuery] = useState('')
  const [mealType, setMealType] = useState('all')
  const [healingDiet, setHealingDiet] = useState('all')
  const [pref, setPref] = useState('all')
  const [sort, setSort] = useState('newest')
  const debounced = useDebounce(query, 300)

  const load = useCallback(async () => {
    const params = new URLSearchParams({ mealType, healingDiet, preference: pref, sort, search: debounced })
    const data = await api(`/api/recipes/public?${params.toString()}`)
    setRecipes(data)
  }, [mealType, healingDiet, pref, sort, debounced])

  useEffect(() => { load().catch(() => {}) }, [load])
  const pulling = usePullToRefresh(load)

  const diets = useMemo(() => ['all', ...new Set(recipes.map((r) => r.healing_diet))], [recipes])

  const save = async (recipe) => {
    if (!isAuthed) return push('Please log in to save', 'info')
    await api('/api/recipes/save', {
      method: 'POST', token,
      body: {
        recipeName: recipe.recipe_name,
        originalName: recipe.original_name,
        originalInput: recipe.original_input,
        inputMethod: recipe.input_method,
        healingDiet: recipe.healing_diet,
        preferences: recipe.preferences,
        mealType: recipe.meal_type,
        transformedRecipe: recipe.transformed_recipe,
      },
    })
    push('Recipe saved!')
  }

  const remix = async (recipe) => {
    await api(`/api/recipes/${recipe.id}/remix`, { method: 'POST' })
    navigate('/', { state: { remixRecipe: recipe } })
  }

  return (
    <section className="space-y-4">
      <div className="rounded-3xl bg-white p-5 shadow-card">
        <h1 className="text-3xl font-bold">Community Recipe Ideas</h1>
        <p className="mt-1 text-charcoal/75">Browse functional versions of your favorite recipes. Remix anything you love.</p>
        <input value={query} onChange={(e) => setQuery(e.target.value)} className="mt-3 min-h-11 w-full rounded-xl border border-sage/30 px-3" placeholder="Search by recipe name or ingredient" />
        {debounced && <p className="mt-1 text-xs text-charcoal/60">{recipes.length} results for "{debounced}" <button onClick={() => setQuery('')} className="underline">Clear search</button></p>}
      </div>
      <div className="rounded-3xl bg-white p-4 shadow-card">
        <div className="flex flex-wrap gap-2">{mealTypes.map((type) => <button key={type} onClick={() => setMealType(type)} className={`min-h-11 rounded-xl px-3 capitalize ${mealType === type ? 'bg-sage text-white' : 'bg-cream'}`}>{type}</button>)}</div>
        <div className="mt-3 grid gap-2 md:grid-cols-3"><select className="min-h-11 rounded-xl border border-sage/30 px-3" value={healingDiet} onChange={(e) => setHealingDiet(e.target.value)}>{diets.map((d) => <option key={d}>{d}</option>)}</select><select className="min-h-11 rounded-xl border border-sage/30 px-3" value={pref} onChange={(e) => setPref(e.target.value)}><option value="all">all</option><option value="Gluten Free">Gluten Free</option><option value="Dairy Free">Dairy Free</option><option value="High Protein">High Protein</option></select><select className="min-h-11 rounded-xl border border-sage/30 px-3" value={sort} onChange={(e) => setSort(e.target.value)}><option value="newest">Newest</option><option value="most-remixed">Most Remixed</option><option value="most-saved">Most Saved</option></select></div>
        {pulling && <p className="mt-2 text-xs text-sage">Refreshing…</p>}
      </div>
      {!recipes.length ? <div className="rounded-3xl bg-white p-8 text-center shadow-card">No recipes yet - be the first to transform one!</div> : <div className="columns-1 gap-4 space-y-4 md:columns-2 xl:columns-3">{recipes.map((r) => <div key={r.id}><RecipeCard recipe={r} onRemix={() => remix(r)} /><button onClick={() => save(r)} className="mt-2 min-h-11 rounded-xl border border-sage/30 px-3 text-sm">Save</button></div>)}</div>}
    </section>
  )
}
