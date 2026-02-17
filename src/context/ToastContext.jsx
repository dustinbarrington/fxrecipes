import { createContext, useContext, useMemo, useState } from 'react'

const ToastContext = createContext(null)

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const push = (message, type = 'success') => {
    const id = Date.now() + Math.random()
    setToasts((prev) => [...prev, { id, message, type }])
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3000)
  }

  const value = useMemo(() => ({ push }), [])

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="fixed bottom-20 right-4 z-50 space-y-2 md:bottom-4">
        {toasts.map((t) => (
          <div key={t.id} className={`min-w-48 rounded-xl px-4 py-3 text-sm text-white shadow-card ${t.type === 'error' ? 'bg-red-500' : t.type === 'info' ? 'bg-blue-500' : 'bg-sage'}`}>
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  return useContext(ToastContext)
}
