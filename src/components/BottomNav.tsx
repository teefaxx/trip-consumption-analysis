import { NavLink } from 'react-router'

const links = [
  { to: '/', label: 'Track', end: true },
  { to: '/history', label: 'History', end: false },
  { to: '/about', label: 'About', end: false },
] as const

export default function BottomNav() {
  return (
    <nav className="flex shrink-0 border-t border-gray-200 bg-white pb-[env(safe-area-inset-bottom)]">
      {links.map((link) => (
        <NavLink
          key={link.to}
          to={link.to}
          end={link.end}
          className={({ isActive }) =>
            `flex flex-1 items-center justify-center py-3 text-sm font-medium ${
              isActive ? 'text-gray-900' : 'text-gray-400'
            }`
          }
        >
          {link.label}
        </NavLink>
      ))}
    </nav>
  )
}
