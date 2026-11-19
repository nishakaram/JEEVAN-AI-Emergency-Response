import { Link, NavLink } from 'react-router-dom'

// Shared top bar used by all four pages (Home, Tracking, Dashboard,
// Profile). Navigation only — it has no state and makes no API calls.
// NavLink highlights the current page; "/" uses `end` so Home is not
// highlighted on every route.
const NAV_ITEMS = [
  { to: '/', label: 'Home', end: true },
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/profile', label: 'Profile' },
]

// JEEVAN brand mark: a red heart outline with a navy pulse (ECG) line,
// on a white rounded square. Inline SVG — no icon library, no image file,
// no network request. Decorative: the "JEEVAN" text beside it carries
// the accessible name, so the SVG is hidden from screen readers.
function LogoMark() {
  return (
    <span className="flex items-center justify-center shrink-0 w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-white">
      <svg
        viewBox="0 0 24 24"
        className="w-4 h-4 sm:w-5 sm:h-5"
        fill="none"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        focusable="false"
      >
        <path
          className="stroke-emergency"
          d="M12 20.5C5 15.5 3 12 3 8.8C3 6.2 5 4.2 7.6 4.2C9.4 4.2 11 5.1 12 6.6C13 5.1 14.6 4.2 16.4 4.2C19 4.2 21 6.2 21 8.8C21 12 19 15.5 12 20.5Z"
        />
        <path className="stroke-navy" d="M3.5 12.5H8L10 9L13 16L15 12.5H20.5" />
      </svg>
    </span>
  )
}

function AppHeader() {
  return (
    <header className="w-full bg-navy text-white">
      {/* Row 1 — brand on the left, navigation on the right, all on one
          horizontal centre line (items-center, fixed row height). */}
      <div className="max-w-4xl mx-auto px-3 sm:px-4 h-14 flex items-center justify-between gap-2 sm:gap-4">
        <Link
          to="/"
          className="flex items-center gap-3 min-w-0 rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-navy"
        >
          <span className="flex items-center gap-2 sm:gap-2.5">
            <LogoMark />
            <span className="text-base sm:text-lg font-bold tracking-wide leading-none">
              JEEVAN
            </span>
          </span>
          <span className="hidden sm:block h-4 w-px bg-navy-400" aria-hidden="true" />
          <span className="hidden sm:block text-sm text-navy-200 leading-none truncate">
            AI-assisted emergency response
          </span>
        </Link>

        <nav aria-label="Main navigation" className="flex items-center gap-0.5 sm:gap-1 shrink-0">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `inline-flex items-center h-9 px-1.5 sm:px-3 rounded-md text-sm font-medium whitespace-nowrap transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-navy ${
                  isActive
                    ? 'bg-white text-navy'
                    : 'text-navy-100 hover:bg-white/10 hover:text-white'
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </div>

      {/* Row 2 — slim disclaimer strip, same container width and padding
          as row 1, text centred. The two sentences sit on separate lines
          on narrower screens and join into one line on large screens. */}
      <div className="bg-navy-900 border-t border-white/10">
        <div className="max-w-4xl mx-auto px-3 sm:px-4 py-2 min-h-[2rem] flex items-center justify-center">
          <p className="text-xs leading-snug text-center text-navy-200">
            <span className="block lg:inline">
              Prototype for demonstration — demo responders, simulated notifications, illustrative
              ETAs.
            </span>{' '}
            <span className="block lg:inline">Not a real emergency service.</span>
          </p>
        </div>
      </div>
    </header>
  )
}

export default AppHeader