import { Link } from 'react-router-dom'
import Badge from './Badge'

export default function RecipeOutput({ data, onSave, onShare, onRemix, onFavorite, savedId, authed, onPromptLogin }) {
  if (!data) return null

  return (
    <section className="mt-6 space-y-4 rounded-3xl bg-white p-5 shadow-card">
      <h2 className="text-2xl font-bold">{data.recipeName}</h2>
      <div className="flex flex-wrap gap-2">
        {data.badges.map((badge) => <span key={badge} className="rounded-full bg-sage/15 px-3 py-1 text-xs font-semibold text-sage">{badge}</span>)}
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <h3 className="mb-2 text-lg font-semibold">Ingredient Transformations</h3>
          <ul className="space-y-2">
            {data.transformedIngredients.map((item, index) => (
              <li key={`${item.action}-${index}`} className="rounded-2xl border border-slate-100 p-3">
                <div className="mb-1 flex items-center gap-2"><Badge action={item.action} /><p className="text-sm font-semibold">{item.original}{item.replacement ? ` → ${item.replacement}` : ''}</p></div>
                <p className="text-xs text-charcoal/70" title={item.reason}>Reason: {item.reason}</p>
              </li>
            ))}
          </ul>
        </div>
        <div className="space-y-4">
          <div><h3 className="text-lg font-semibold">Updated Instructions</h3><ol className="mt-2 list-decimal space-y-2 pl-5 text-sm">{data.instructions.map((instruction) => <li key={instruction}>{instruction}</li>)}</ol></div>
          <div className="rounded-2xl bg-cream p-3 text-sm"><p><strong>Prep:</strong> {data.prepTime}</p><p><strong>Cook:</strong> {data.cookTime}</p><p><strong>Servings:</strong> {data.servings}</p><p><strong>Inflammatory Load:</strong> <span className="uppercase text-sage">{data.inflammatoryLoad}</span></p></div>
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <article className="rounded-2xl border border-sage/20 p-4"><h3 className="font-semibold">Transformation Summary</h3><p className="mt-2 text-sm">{data.summary}</p><ul className="mt-2 list-disc pl-5 text-sm">{data.healthBenefits.map((benefit) => <li key={benefit}>{benefit}</li>)}</ul></article>
        <article className="rounded-2xl border border-terracotta/20 p-4"><h3 className="font-semibold">Nutrition Comparison</h3><div className="mt-2 grid grid-cols-2 gap-2 text-sm"><div className="font-semibold">Original</div><div className="font-semibold">Functional</div><div>{data.nutritionComparison.original.calories} cal</div><div>{data.nutritionComparison.transformed.calories} cal</div><div>{data.nutritionComparison.original.protein}g protein</div><div>{data.nutritionComparison.transformed.protein}g protein</div><div>{data.nutritionComparison.original.carbs}g carbs</div><div>{data.nutritionComparison.transformed.carbs}g carbs</div><div>{data.nutritionComparison.original.fat}g fat</div><div>{data.nutritionComparison.transformed.fat}g fat</div></div></article>
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
