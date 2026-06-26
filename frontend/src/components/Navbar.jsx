import { NavLink } from 'react-router-dom';

export default function Navbar() {
  const navClass = ({ isActive }) =>
    `px-4 py-2 rounded-xl font-semibold transition-all duration-200 ${
      isActive
        ? 'bg-orange-500 text-white shadow-md'
        : 'text-orange-700 dark:text-orange-300 hover:bg-orange-100 dark:hover:bg-slate-700'
    }`;

  return (
    <nav className="w-full max-w-[1000px] flex items-center justify-center gap-3 py-4 px-4 flex-wrap">
      <NavLink to="/" className={navClass}>
        Dashboard
      </NavLink>

      <NavLink to="/analytics" className={navClass}>
        Analytics
      </NavLink>

      <NavLink to="/settings" className={navClass}>
        Settings
      </NavLink>

      <NavLink to="/archive" className={navClass}>
        📦 Archive
      </NavLink>

      <NavLink to="/focus" className={navClass}>
        🎯 Focus
      </NavLink>
    </nav>
  );
}