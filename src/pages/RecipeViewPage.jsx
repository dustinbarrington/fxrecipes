import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import RecipeOutput from '../components/RecipeOutput'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { api } from '../utils/api'

export default function RecipeViewPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { token, isAuthed } = useAuth()
  const { push } = useToast()
  const [recipe, setRecipe] = useState(null)

  useEffect(() => {
    api(`/api/recipes/${id}`).then((data) => {
      setRecipe(data)
      document.title = `${data.recipe_name} | FxRecipe AI`
      const desc = document.querySelector('meta[name="description"]') || (() => {
        const m = document.createElement('meta'); m.name = 'description'; document.head.appendChild(m); return m
      })()
      desc.setAttribute('content', `Functional nutrition version of ${data.original_name}`)
    }).catch(() => {})
  }, [id])

  if (!recipe) return <div className="rounded-3xl bg-white p-5 shadow-card">Loading recipe…</div>

  return (
    <section className="space-y-3">
      <Link to="/idea-board" className="text-sm font-semibold text-sage">← Back to Idea Board</Link>
      <RecipeOutput
        data={recipe.transformed_recipe}
        authed={isAuthed}
        savedId={recipe.id}
        onSave={async () => {
          if (!isAuthed) return push('Please log in to save', 'info')
          await api('/api/recipes/save', { method: 'POST', token, body: { recipeName: recipe.recipe_name, originalName: recipe.original_name, originalInput: recipe.original_input, inputMethod: recipe.input_method, healingDiet: recipe.healing_diet, preferences: recipe.preferences, mealType: recipe.meal_type, transformedRecipe: recipe.transformed_recipe } })
          push('Recipe saved!')
        }}
        onFavorite={async () => { push('Added to favorites!') }}
        onShare={async () => { await navigator.clipboard.writeText(window.location.href); push('Link copied!') }}
        onRemix={async () => { await api(`/api/recipes/${id}/remix`, { method: 'POST' }); navigate('/', { state: { remixRecipe: recipe } }) }}
        onPromptLogin={() => navigate('/login', { state: { from: `/recipe/${id}` } })}
      />
    </section>
  )
}
