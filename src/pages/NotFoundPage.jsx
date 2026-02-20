import { Link } from 'react-router-dom'

export default function NotFoundPage() {
  return (
    <div className="mx-auto max-w-lg rounded-3xl bg-white p-8 text-center shadow-card">
      <h1 className="text-3xl font-bold">404</h1>
      <p className="mt-2">Page not found.</p>
      <Link className="mt-4 inline-block rounded-xl bg-sage px-4 py-2 text-white" to="/">Return Home</Link>
    </div>
  )
}
