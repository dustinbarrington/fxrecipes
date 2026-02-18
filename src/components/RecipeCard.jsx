import { Link } from 'react-router-dom'

export default function RecipeCard({ recipe, onFavorite, onDelete, onRemix, compact = false }) {
  const swaps = recipe.transformed_recipe?.transformedIngredients?.filter((i) => i.action === 'SWAP').slice(0, 3) || []
  return (
    <article className="break-inside-avoid rounded-2xl border border-sage/20 bg-white p-4 shadow-card transition hover:-translate-y-0.5">
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-lg font-bold leading-tight">{recipe.recipe_name}</h3>
        {onFavorite && <button onClick={onFavorite} className="text-xl">{recipe.is_favorite ? '★' : '☆'}</button>}
      </div>
      {recipe.original_name && <p className="text-xs text-charcoal/60">Original: {recipe.original_name}</p>}
      <div className="mt-2 flex flex-wrap gap-2 text-xs">
        <span className="rounded-full bg-sage/15 px-2 py-1 text-sage">{recipe.healing_diet}</span>
        <span className="rounded-full bg-terracotta/15 px-2 py-1 text-terracotta capitalize">{recipe.meal_type}</span>
      </div>
      {!compact && (
        <ul className="mt-3 space-y-1 text-xs text-charcoal/80">
          {swaps.map((s, idx) => <li key={idx}>• {s.original} → {s.replacement}</li>)}
        </ul>
      )}

      {recipe.email && <p className="mt-2 text-xs text-charcoal/60">Transformed by {recipe.email.split('@')[0]}</p>}
      <div className="mt-3 flex flex-wrap gap-2 text-xs text-charcoal/70">
        <span>💾 {recipe.save_count || 0}</span>
        <span>🔁 {recipe.remix_count || 0}</span>
        <span>{new Date(recipe.created_at).toLocaleDateString()}</span>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <Link to={`/recipe/${recipe.id}`} className="min-h-11 rounded-xl border border-sage/30 px-3 py-2 text-sm font-semibold">View Recipe</Link>
        {onRemix && <button onClick={onRemix} className="min-h-11 rounded-xl bg-sage px-3 py-2 text-sm font-semibold text-white">Remix</button>}
        {onDelete && <button onClick={onDelete} className="min-h-11 rounded-xl border border-red-200 px-3 py-2 text-sm">Delete</button>}
      </div>
    </article>
  )
}
