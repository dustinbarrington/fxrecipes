const styles = {
  SWAP: 'bg-blue-100 text-blue-800',
  ADD: 'bg-green-100 text-green-800',
  REMOVE: 'bg-red-100 text-red-800',
  KEEP: 'bg-slate-200 text-slate-700',
}

export default function Badge({ action }) {
  return <span className={`rounded-full px-3 py-1 text-xs font-bold ${styles[action]}`}>{action}</span>
}
