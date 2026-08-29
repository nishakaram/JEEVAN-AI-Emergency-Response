const COLORS = {
  Critical: 'bg-red-100 text-red-700 border-red-300',
  Moderate: 'bg-amber-100 text-amber-700 border-amber-300',
  Low: 'bg-emerald-100 text-emerald-700 border-emerald-300',
}

function SeverityBadge({ severity }) {
  const classes = COLORS[severity] || 'bg-slate-100 text-slate-600 border-slate-300'
  return (
    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold border ${classes}`}>
      {severity || 'Unknown'}
    </span>
  )
}

export default SeverityBadge
