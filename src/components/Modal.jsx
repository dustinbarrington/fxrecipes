export default function Modal({ open, title, onClose, children }) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-40 flex items-end bg-black/40 md:items-center md:justify-center">
      <div className="w-full rounded-t-3xl bg-white p-5 md:w-[28rem] md:rounded-3xl">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-lg font-bold">{title}</h3>
          <button onClick={onClose} className="rounded-full bg-cream px-3 py-1">×</button>
        </div>
        {children}
      </div>
    </div>
  )
}
