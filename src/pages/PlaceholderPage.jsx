export default function PlaceholderPage({ title, description }) {
  return (
    <section className="rounded-3xl bg-white p-8 shadow-card">
      <h1 className="text-2xl font-bold">{title}</h1>
      <p className="mt-2 text-charcoal/80">{description}</p>
      <p className="mt-4 text-sm text-sage">Coming in a later phase.</p>
    </section>
  )
}
