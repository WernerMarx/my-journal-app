import { useState } from "react";
import { Menu } from "lucide-react";
import { cn } from "@/lib/utils";
import Sidebar from "./Sidebar";

export default function AppShell({ children }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-background">
      {/* ── Desktop sidebar (fixed) ── */}
      <aside className="hidden md:flex md:flex-col md:fixed md:inset-y-0 md:w-64 z-20">
        <Sidebar />
      </aside>

      {/* ── Mobile: backdrop ── */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/40 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* ── Mobile: slide-in drawer ── */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 w-64 flex flex-col md:hidden transition-transform duration-200 ease-out",
          mobileOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <Sidebar onClose={() => setMobileOpen(false)} />
      </aside>

      {/* ── Content area ── */}
      <div className="flex flex-col flex-1 md:pl-64">
        {/* Mobile top bar */}
        <header className="sticky top-0 z-10 flex items-center gap-3 px-4 h-14 bg-card border-b border-border md:hidden">
          <button
            onClick={() => setMobileOpen(true)}
            aria-label="Open navigation"
            className="p-1.5 -ml-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
          >
            <Menu className="w-5 h-5" />
          </button>
          <span className="font-serif font-semibold text-foreground">Journal</span>
        </header>

        <main className="flex-1 px-4 py-8 md:px-10 md:py-10">
          <div className="max-w-4xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
