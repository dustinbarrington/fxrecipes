import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import Modal from '../components/Modal'
import RecipeOutput from '../components/RecipeOutput'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { loadingMessages } from '../data/mockTransformations'
import { api } from '../utils/api'

const healingDiets = ['General Functional Nutrition', 'Anti-Inflammatory', 'Blood Sugar Balance / Glycemic', 'Autoimmune Protocol (AIP)', 'Gut Healing / Low FODMAP', 'Ketogenic / Low Carb', 'Paleo', 'Carnivore-Adjacent', 'Hormone Balance']
const preferences = ['Dairy Free', 'Gluten Free', 'Nut Free', 'Egg Free', 'No Nightshades', 'High Protein', 'Budget Friendly']

export default function HomePage() {
  const { user, token, isAuthed } = useAuth()
  const { push } = useToast()
  const location = useLocation()
  const navigate = useNavigate()

  const [inputMethod, setInputMethod] = useState('paste')
  const [healingDiet, setHealingDiet] = useState(user?.default_diet || healingDiets[0])
  const [selectedPreferences, setSelectedPreferences] = useState(user?.preferences || [])
  const [mealType, setMealType] = useState('dinner')
  const [recipeText, setRecipeText] = useState('')
  const [description, setDescription] = useState('')
  const [recipeUrl, setRecipeUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [loadingStep, setLoadingStep] = useState(0)
  const [result, setResult] = useState(null)
  const [usage, setUsage] = useState({ used: 0, limit: null, remaining: null, unlimited: true })
  const [savedId, setSavedId] = useState(null)
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [waitlistEmail, setWaitlistEmail] = useState('')
  const [stats, setStats] = useState({ totalRecipes: 0, featured: [] })

  useEffect(() => {
    if (location.state?.remixRecipe) {
      const remix = location.state.remixRecipe
      setRecipeText(remix.original_input || remix.original_name || '')
      setHealingDiet(remix.healing_diet || healingDiets[0])
      setInputMethod('paste')
      navigate(location.pathname, { replace: true, state: {} })
    }
  }, [location, navigate])

  useEffect(() => {
    setHealingDiet(user?.default_diet || healingDiets[0])
    setSelectedPreferences(user?.preferences || [])
  }, [user])

  useEffect(() => {
    api('/api/usage', { token }).then(setUsage).catch(() => {})
    api('/api/stats/public').then(setStats).catch(() => {})
  }, [token])

  const message = useMemo(() => loadingMessages[loadingStep] || loadingMessages[0], [loadingStep])
  const canTransform = usage.limit == null || usage.used < usage.limit

  const handlePreference = (value) => {
    setSelectedPreferences((current) => (current.includes(value) ? current.filter((i) => i !== value) : [...current, value]))
  }

  const transformRecipe = async () => {
    if (!canTransform) return

    setLoading(true)
    setResult(null)
    setSavedId(null)

    for (let i = 0; i < loadingMessages.length; i += 1) {
      setLoadingStep(i)
      // eslint-disable-next-line no-await-in-loop
      await new Promise((r) => setTimeout(r, 450))
    }

    try {
      const payload = {
        recipe: recipeText,
        description,
        recipeUrl,
        inputMethod,
        mealType,
        healingDiet,
        preferences: selectedPreferences,
      }
      const data = await api('/api/transform', { method: 'POST', token, body: payload })
      setResult(data)
      push('Transformation complete!')
      const nextUsage = await api('/api/usage', { token })
      setUsage(nextUsage)
    } catch (e) {
      push(e.message, 'error')
    } finally {
      setLoading(false)
      setLoadingStep(0)
    }
  }

  const saveRecipe = async () => {
    if (!result) return
    try {
      const res = await api('/api/recipes/save', {
        method: 'POST',
        token,
        body: {
          recipeName: result.recipeName,
          originalName: result.originalRecipe?.name || result.recipeName.replace(' | Functional Version', ''),
          originalInput: inputMethod === 'paste' ? recipeText : inputMethod === 'describe' ? description : recipeUrl,
          inputMethod,
          healingDiet,
          preferences: selectedPreferences,
          mealType,
          transformedRecipe: result,
        },
      })
      setSavedId(res.id)
      push('Recipe saved!')
    } catch (e) {
      push(e.message, 'error')
    }
  }

  const shareRecipe = async () => {
    if (!savedId) {
      push('Save recipe first to share', 'info')
      return
    }
    await navigator.clipboard.writeText(`${window.location.origin}/recipe/${savedId}`)
    push('Link copied!')
  }

  const showLimitBanner = usage.limit != null && usage.used >= usage.limit

  return (
    <div className="space-y-6">
      <section className="rounded-3xl bg-white p-6 shadow-card">
        <p className="text-sm font-semibold uppercase tracking-wide text-terracotta">Functional Recipe Intelligence</p>
        <h1 className="mt-2 text-3xl font-extrabold md:text-5xl">Transform any recipe into a functional nutrition powerhouse.</h1>
        <p className="mt-3 max-w-3xl text-sm text-charcoal/80 md:text-base">FxRecipe AI upgrades your recipes using healing-food principles: no seed oils, no processed ingredients, lower inflammation, and protocol-aligned swaps.</p>
      </section>

      <section className="rounded-3xl bg-white p-5 shadow-card">
        <h2 className="text-xl font-bold">Recipe Transformer</h2>
        <div className="mt-4 flex flex-wrap gap-2">
          <button type="button" onClick={() => setInputMethod('paste')} className={`min-h-11 rounded-xl px-4 text-sm font-semibold ${inputMethod === 'paste' ? 'bg-sage text-white' : 'bg-cream'}`}>Paste a Recipe</button>
          <button type="button" onClick={() => setInputMethod('describe')} className={`min-h-11 rounded-xl px-4 text-sm font-semibold ${inputMethod === 'describe' ? 'bg-sage text-white' : 'bg-cream'}`}>Describe a Recipe</button>
          <button type="button" onClick={() => setInputMethod('url')} className={`min-h-11 rounded-xl px-4 text-sm font-semibold ${inputMethod === 'url' ? 'bg-sage text-white' : 'bg-cream'}`}>Recipe URL</button>
        </div>

        <div className="mt-4 space-y-3">
          {inputMethod === 'paste' && (
            <textarea value={recipeText} onChange={(e) => setRecipeText(e.target.value)} className="min-h-44 w-full rounded-2xl border border-sage/30 p-3" placeholder="Paste ingredients and instructions here..." />
          )}

          {inputMethod === 'describe' && (
            <div className="grid gap-3 md:grid-cols-2">
              <select value={mealType} onChange={(e) => setMealType(e.target.value)} className="min-h-11 rounded-xl border border-sage/30 px-3">{['breakfast', 'lunch', 'dinner', 'snack', 'dessert'].map((type) => <option key={type}>{type}</option>)}</select>
              <input value={description} onChange={(e) => setDescription(e.target.value)} className="min-h-11 rounded-xl border border-sage/30 px-3" placeholder="Describe the dish, ingredients, and preferences" />
            </div>
          )}

          {inputMethod === 'url' && (
            <input value={recipeUrl} onChange={(e) => setRecipeUrl(e.target.value)} className="min-h-11 w-full rounded-xl border border-sage/30 px-3" placeholder="https://example.com/recipe-page" />
          )}

          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-semibold">Healing Diet Protocol</label>
              <select value={healingDiet} onChange={(e) => setHealingDiet(e.target.value)} className="min-h-11 w-full rounded-xl border border-sage/30 px-3">{healingDiets.map((diet) => <option key={diet}>{diet}</option>)}</select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold">Additional Preferences</label>
              <div className="grid grid-cols-2 gap-2 rounded-xl border border-sage/20 p-2">
                {preferences.map((pref) => (
                  <label key={pref} className="flex items-center gap-2 text-xs">
                    <input type="checkbox" checked={selectedPreferences.includes(pref)} onChange={() => handlePreference(pref)} />
                    {pref}
                  </label>
                ))}
              </div>
            </div>
          </div>

          <button type="button" disabled={!canTransform} onClick={transformRecipe} className="min-h-11 rounded-xl bg-terracotta px-4 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50">Transform with FxRecipe AI</button>
          <p className="text-sm text-charcoal/70">{usage.unlimited ? 'Unlimited transformations enabled for testing' : `${usage.used} of ${usage.limit} free transformations used this month`}</p>

          {showLimitBanner && (
            <div className="rounded-2xl border border-terracotta/30 bg-terracotta/10 p-3 text-sm">
              <p className="font-semibold">You've used all 3 free transformations this month. Upgrade to FxRecipe Pro for unlimited access.</p>
              <div className="mt-2 flex gap-2">
                <input value={waitlistEmail} onChange={(e) => setWaitlistEmail(e.target.value)} placeholder="Enter email for Pro waitlist" className="min-h-11 flex-1 rounded-xl border border-sage/30 px-3" />
                <button className="min-h-11 rounded-xl bg-sage px-4 text-white" onClick={() => push('Added to Pro waitlist!')}>Join Waitlist</button>
              </div>
            </div>
          )}
        </div>

        {loading && <div className="mt-4 rounded-2xl bg-cream p-4 text-center"><div className="mx-auto mb-2 h-10 w-10 animate-spin rounded-full border-4 border-sage/20 border-t-sage" /><p className="font-semibold text-sage">{message}</p></div>}
      </section>

      <RecipeOutput data={result} onSave={saveRecipe} onFavorite={() => push('Added to favorites!')} onShare={shareRecipe} onRemix={() => setResult(null)} savedId={savedId} authed={isAuthed} onPromptLogin={() => setShowAuthModal(true)} />

      <section className="grid gap-4 md:grid-cols-2">
        <article className="rounded-3xl bg-white p-5 shadow-card"><h3 className="text-xl font-bold">Join {stats.totalRecipes || 0} people transforming their recipes</h3><p className="mt-2 text-sm text-charcoal/75">FxRecipe AI community keeps growing with every functional swap.</p></article>
        <article className="rounded-3xl bg-white p-5 shadow-card"><h3 className="text-xl font-bold">How it works</h3><ol className="mt-2 list-decimal space-y-1 pl-5 text-sm"><li>Paste, describe, or add a recipe URL</li><li>Choose your healing protocol</li><li>Get your functional version instantly</li><li>Save, share, and remix</li></ol></article>
      </section>

      <section className="rounded-3xl bg-white p-5 shadow-card">
        <div className="mb-3 flex items-center justify-between"><h3 className="text-xl font-bold">Featured Recipes</h3><Link className="text-sm font-semibold text-sage" to="/idea-board">Browse All</Link></div>
        <div className="grid gap-3 md:grid-cols-3">{stats.featured.length ? stats.featured.map((f) => <Link key={f.id} to={`/recipe/${f.id}`} className="rounded-2xl border border-sage/20 p-3"><p className="font-semibold">{f.recipe_name}</p><p className="text-xs text-charcoal/70">{f.healing_diet}</p></Link>) : <p className="text-sm text-charcoal/70">No public recipes yet.</p>}</div>
      </section>

      <section className="rounded-3xl bg-white p-5 shadow-card">
        <h3 className="text-xl font-bold">FAQ</h3>
        <div className="mt-3 space-y-2 text-sm">
          <p><strong>What is functional nutrition?</strong> Nutrition focused on removing inflammatory inputs and adding therapeutic foods.</p>
          <p><strong>What healing diets do you support?</strong> 9 protocols including anti-inflammatory, AIP, low FODMAP, keto, paleo and more.</p>
          <p><strong>How many free transformations?</strong> 3 per month on the free plan.</p>
          <p><strong>Can I save recipes?</strong> Yes, with a free account.</p>
        </div>
      </section>

      <Modal open={showAuthModal} title="Create a free account to save recipes" onClose={() => setShowAuthModal(false)}>
        <p className="text-sm">Sign up in under a minute and keep every transformed recipe in your Recipe Box.</p>
        <div className="mt-3 flex gap-2"><Link onClick={() => setShowAuthModal(false)} to="/signup" className="min-h-11 rounded-xl bg-sage px-4 py-2 text-sm font-semibold text-white">Sign Up</Link><Link onClick={() => setShowAuthModal(false)} to="/login" className="min-h-11 rounded-xl border border-sage/30 px-4 py-2 text-sm font-semibold">Login</Link></div>
      </Modal>
    </div>
  )
}
