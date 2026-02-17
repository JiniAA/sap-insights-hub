import { useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { LayoutDashboard, Users, Shield, Terminal, Menu, X, ChevronLeft } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { label: "Overview", path: "/", icon: LayoutDashboard },
  { label: "Users", path: "/users", icon: Users },
  { label: "Roles", path: "/roles", icon: Shield },
  { label: "TCodes", path: "/tcodes", icon: Terminal },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();

  return (
    <div className="flex min-h-screen w-full">
      {/* Sidebar */}
      <aside
        className={cn(
          "flex flex-col bg-sidebar text-sidebar-foreground border-r border-sidebar-border transition-all duration-200 sticky top-0 h-screen overflow-y-auto shrink-0",
          collapsed ? "w-16" : "w-60"
        )}
      >
        {/* Logo area */}
        <div className="flex items-center justify-between h-14 px-4 border-b border-sidebar-border">
          {!collapsed && (
            <span className="text-base font-bold tracking-tight text-sidebar-primary">
              SAP Analytics
            </span>
          )}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="p-1.5 rounded-md hover:bg-sidebar-accent transition-colors text-sidebar-foreground"
          >
            {collapsed ? <Menu size={18} /> : <ChevronLeft size={18} />}
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 py-3 space-y-1 px-2">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors",
                  isActive
                    ? "bg-sidebar-accent text-sidebar-primary"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                )}
              >
                <item.icon size={18} />
                {!collapsed && <span>{item.label}</span>}
              </NavLink>
            );
          })}
        </nav>

        {/* Footer */}
        {!collapsed && (
          <div className="p-4 border-t border-sidebar-border text-xs text-sidebar-foreground/50">
            Demo Data Mode
          </div>
        )}
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        <div className="p-6 max-w-[1400px] mx-auto space-y-6">
          {children}
        </div>
      </main>
    </div>
  );
}
