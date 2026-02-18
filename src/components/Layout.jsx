import { NavLink } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const navItems = [
  { to: '/', label: 'Transform' },
  { to: '/idea-board', label: 'Idea Board' },
  { to: '/recipe-box', label: 'Recipe Box' },
]

const mobileNav = [
  { to: '/', icon: '🍴', text: 'Transform' },
  { to: '/idea-board', icon: '💡', text: 'Ideas' },
  { to: '/recipe-box', icon: '📦', text: 'Box' },
  { to: '/profile', icon: '👤', text: 'Profile' },
]

const navClass = ({ isActive }) =>
  `text-sm font-semibold transition ${isActive ? 'text-sage' : 'text-charcoal/80 hover:text-sage'}`

export default function Layout({ children }) {
  const { user, logout } = useAuth()
  const buildVersion = import.meta.env.VITE_BUILD_VERSION || 'dev'
  return (
    <div className="min-h-screen pb-24 md:pb-8">
      <header className="sticky top-0 z-20 border-b border-sage/20 bg-cream/95 backdrop-blur">
        <nav className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <NavLink to="/" className="text-lg font-extrabold text-charcoal">FxRecipe <span className="text-sage">AI</span></NavLink>
          <div className="hidden items-center gap-5 md:flex">
            {navItems.map((item) => <NavLink key={item.to} to={item.to} className={navClass}>{item.label}</NavLink>)}
            {user ? (
              <button onClick={logout} className="rounded-xl border border-sage/40 px-3 py-2 text-sm font-semibold">Logout</button>
            ) : (
              <>
                <NavLink to="/login" className="rounded-xl border border-sage/40 px-3 py-2 text-sm font-semibold">Login</NavLink>
                <NavLink to="/signup" className="rounded-xl bg-sage px-3 py-2 text-sm font-semibold text-white">Sign Up</NavLink>
              </>
            )}
          </div>
        </nav>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
      <div className="pointer-events-none fixed bottom-16 left-3 z-20 rounded-lg bg-charcoal/80 px-2 py-1 text-[10px] text-white md:bottom-3">
        Build version: {buildVersion}
      </div>
      <div className="fixed bottom-0 left-0 right-0 z-30 border-t border-sage/20 bg-white md:hidden">
        <div className="grid grid-cols-4">
          {mobileNav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => `flex min-h-14 flex-col items-center justify-center text-xs font-medium ${isActive ? 'text-sage' : 'text-charcoal/70'}`}
            >
              <span>{item.icon}</span><span>{item.text}</span>
            </NavLink>
          ))}
        </div>
      </div>
    </div>
  )
}
