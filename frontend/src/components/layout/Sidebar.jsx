import { NavLink } from "react-router-dom";
import { BookOpen, BarChart2, PenLine, LogOut, X, LayoutDashboard } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { to: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/write",     icon: PenLine,         label: "Write"     },
  { to: "/browse",    icon: BookOpen,         label: "Browse"    },
  { to: "/trackers",  icon: BarChart2,        label: "Trackers"  },
];

export default function Sidebar({ onClose }) {
  const { user, signOut } = useAuth();

  return (
    <div className="flex flex-col h-full bg-card border-r border-border">
      {/* Brand */}
      <div className="flex items-center justify-between h-16 px-5 border-b border-border shrink-0">
        <span className="font-serif text-lg font-semibold text-foreground tracking-tight">
          Journal
        </span>
        {onClose && (
          <button
            onClick={onClose}
            aria-label="Close menu"
            className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {NAV_ITEMS.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            onClick={onClose}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                isActive
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground",
              )
            }
          >
            <Icon className="w-4 h-4 shrink-0" />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* User */}
      <div className="px-3 py-4 border-t border-border shrink-0">
        {user && (
          <p className="px-3 py-1.5 mb-1 text-xs text-muted-foreground truncate">
            {user.email}
          </p>
        )}
        <button
          onClick={signOut}
          className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
        >
          <LogOut className="w-4 h-4 shrink-0" />
          Sign out
        </button>
      </div>
    </div>
  );
}
