import { Link } from 'react-router-dom'
import Badge from './Badge'

function buildTransformedIngredients(data) {
  if (Array.isArray(data.revisedIngredientList) && data.revisedIngredientList.length) return data.revisedIngredientList
  return (data.transformedIngredients || []).map((item) => item.replacement || item.original)
}

export default function RecipeOutput({ data, onSave, onShare, onRemix, onFavorite, savedId, authed, onPromptLogin }) {
  if (!data) return null

  const original = data.originalRecipe || { name: 'Original Recipe', ingredients: [], instructions: [] }
  const transformedIngredients = buildTransformedIngredients(data)
  const reasoning = data.changeExplanation || data.transformedIngredients?.filter((c) => c.action !== 'KEEP').map((c) => `${c.original} → ${c.replacement}: ${c.reason}`) || []

  return (
    <section className="mt-6 space-y-4 rounded-3xl bg-white p-5 shadow-card">
      <h2 className="text-2xl font-bold">{data.recipeName}</h2>
      <div className="flex flex-wrap gap-2">
        {(data.badges || []).map((badge) => <span key={badge} className="rounded-full bg-sage/15 px-3 py-1 text-xs font-semibold text-sage">{badge}</span>)}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <article className="rounded-2xl border border-slate-200 p-4">
          <h3 className="text-lg font-semibold">Original Recipe</h3>
          <p className="text-sm text-charcoal/70">{original.name}</p>
          <h4 className="mt-3 font-semibold">Ingredients</h4>
          <ul className="list-disc pl-5 text-sm">{(original.ingredients || []).map((i) => <li key={`o-${i}`}>{i}</li>)}</ul>
          <h4 className="mt-3 font-semibold">Instructions</h4>
          <ol className="list-decimal pl-5 text-sm">{(original.instructions || []).map((i, idx) => <li key={`oi-${idx}`}>{i}</li>)}</ol>
        </article>

        <article className="rounded-2xl border border-sage/30 bg-sage/5 p-4">
          <h3 className="text-lg font-semibold">Transformed Recipe</h3>
          <h4 className="mt-3 font-semibold">Revised Ingredients</h4>
          <ul className="list-disc pl-5 text-sm">{transformedIngredients.map((i, idx) => <li key={`t-${idx}`}>{i}</li>)}</ul>
          <h4 className="mt-3 font-semibold">Revised Instructions</h4>
          <ol className="list-decimal pl-5 text-sm">{(data.instructions || []).map((i, idx) => <li key={`ti-${idx}`}>{i}</li>)}</ol>
        </article>
      </div>

      <div>
        <h3 className="mb-2 text-lg font-semibold">What changed and why</h3>
        {reasoning.length ? (
          <ul className="space-y-2">
            {reasoning.map((entry, idx) => <li key={`r-${idx}`} className="rounded-xl border border-terracotta/20 bg-terracotta/5 p-2 text-sm">{entry}</li>)}
          </ul>
        ) : (
          <p className="text-sm text-charcoal/70">No major changes were required for the selected criteria.</p>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <article className="rounded-2xl border border-sage/20 p-4"><h3 className="font-semibold">Transformation Summary</h3><p className="mt-2 text-sm">{data.summary}</p><ul className="mt-2 list-disc pl-5 text-sm">{(data.healthBenefits || []).map((benefit) => <li key={benefit}>{benefit}</li>)}</ul></article>
        <article className="rounded-2xl border border-terracotta/20 p-4"><h3 className="font-semibold">Nutrition Comparison</h3><div className="mt-2 grid grid-cols-2 gap-2 text-sm"><div className="font-semibold">Original</div><div className="font-semibold">Functional</div><div>{data.nutritionComparison.original.calories} cal</div><div>{data.nutritionComparison.transformed.calories} cal</div><div>{data.nutritionComparison.original.protein}g protein</div><div>{data.nutritionComparison.transformed.protein}g protein</div><div>{data.nutritionComparison.original.carbs}g carbs</div><div>{data.nutritionComparison.transformed.carbs}g carbs</div><div>{data.nutritionComparison.original.fat}g fat</div><div>{data.nutritionComparison.transformed.fat}g fat</div></div></article>
      </div>

      <div className="grid gap-2">
        <h3 className="text-lg font-semibold">Ingredient Transformations</h3>
        {(data.transformedIngredients || []).map((item, index) => (
          <div key={`${item.action}-${index}`} className="rounded-2xl border border-slate-100 p-3">
            <div className="mb-1 flex items-center gap-2"><Badge action={item.action} /><p className="text-sm font-semibold">{item.original}{item.replacement ? ` → ${item.replacement}` : ''}</p></div>
            <p className="text-xs text-charcoal/70">Reason: {item.reason}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-2 pt-2">
        <button type="button" onClick={authed ? onSave : onPromptLogin} className="min-h-11 rounded-xl border border-sage/30 px-4 text-sm font-semibold hover:bg-sage/10">Save to Recipe Box</button>
        <button type="button" onClick={authed ? onFavorite : onPromptLogin} className="min-h-11 rounded-xl border border-sage/30 px-4 text-sm font-semibold hover:bg-sage/10">Favorite</button>
        {savedId ? <Link className="min-h-11 rounded-xl border border-sage/30 px-4 py-2 text-sm font-semibold" to={`/recipe/${savedId}`}>Open Saved</Link> : null}
        <button type="button" onClick={onShare} className="min-h-11 rounded-xl border border-sage/30 px-4 text-sm font-semibold hover:bg-sage/10">Share</button>
        <button type="button" className="min-h-11 rounded-xl border border-sage/30 px-4 text-sm font-semibold">Download PDF (Phase 2)</button>
        <button type="button" onClick={onRemix} className="min-h-11 rounded-xl bg-sage px-4 text-sm font-semibold text-white">Remix</button>
      </div>
    </section>
  )
}
