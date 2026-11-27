"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { Breadcrumbs, type Crumb } from "./breadcrumbs";
import { logout } from "@/app/actions";

const navigation = [
  ["Dashboard", "/dashboard", "M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h7v7h-7z"],
  ["Projects", "/projects", "M3 21h18 M5 21V8l7-5 7 5v13 M9 21v-7h6v7"],
  ["Subcontractors", "/subcontractors", "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2 M16 4a4 4 0 0 1 0 8 M22 21v-2a4 4 0 0 0-3-4 M13 8a4 4 0 1 1-8 0 4 4 0 0 1 8 0"],
  ["Expenses", "/expenses", "M5 3h14v18l-3-2-4 2-4-2-3 2z M8 8h8 M8 12h8"],
  ["Approvals", "/approvals", "M20 11v9H4V4h12 M8 11l4 4 9-10"],
  ["Reports", "/reports", "M3 3v18h18 M8 16v-4 M13 16V8 M18 16V5"],
  ["Master data", "/master-data", "M4 4h16v5H4z M4 15h16v5H4z M8 9v6m8-6v6"],
  ["Users", "/users", "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8z M4 21a8 8 0 0 1 16 0"],
  ["Audit log", "/audit-logs", "M3 12a9 9 0 1 1 3 7 M3 5v7h7 M12 7v5l4 2"],
] as const;

export function Theme() {
  const [dark, setDark] = useState(false);
  useEffect(() => {
    const start = (localStorage.getItem("ccbm-theme") ?? (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light")) === "dark";
    document.documentElement.classList.toggle("dark", start);
    setDark(start);
  }, []);
  return <button type="button" className="button secondary" onClick={() => {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("ccbm-theme", next ? "dark" : "light");
  }}>{dark ? "Light mode" : "Dark mode"}</button>;
}

export function Shell({ name, role, trail, children }: { name: string; role: string; trail: Crumb[]; children: ReactNode }) {
  const path = usePathname();
  const visible = navigation.filter(([, href]) =>
    (!["/users", "/audit-logs", "/master-data"].includes(href) || role === "ADMIN") && (href !== "/approvals" || role !== "SUBCONTRACTOR"));
  const activeHref = path.startsWith("/assignments/") ? "/projects" : "/" + path.split("/")[1];
  const roleLabel = { ADMIN: "Administrator", MANAGER: "Project manager", SUBCONTRACTOR: "Subcontractor" }[role as "ADMIN" | "MANAGER" | "SUBCONTRACTOR"];
  const initials = name.trim().split(/\s+/).slice(0, 2).map(word => word[0]).join("").toUpperCase();
  return <div className="workspace min-h-screen lg:grid lg:grid-cols-[248px_minmax(0,1fr)]">
    <a href="#main" className="sr-only focus:not-sr-only">Skip to content</a>
    <aside className="workspace-sidebar flex flex-col lg:sticky lg:top-0 lg:h-dvh lg:overflow-y-auto">
      <Link href="/dashboard" className="workspace-brand">
        <span className="brand-mark" aria-hidden="true">
          <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 20h18M5 20V9l7-5v16m0-10 7 3v7M8 11v1m0 3v1m8-1v1"/>
          </svg>
        </span>
        <span>Trimonia</span>
      </Link>
      <nav aria-label="Main navigation" className="workspace-nav">
        {visible.map(([label, href, icon]) => <Link key={href} href={href}
          aria-current={href === activeHref ? "page" : undefined}>
          <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round"><path d={icon}/></svg>
          {label}
        </Link>)}
      </nav>
      <div className="workspace-account">
        <span className="account-avatar" aria-hidden="true">{initials}</span>
        <div className="min-w-0"><p className="truncate font-semibold text-white">{name}</p><p className="text-xs text-slate-400">{roleLabel}</p></div>
      </div>
    </aside>
    <div className="min-w-0">
      <header className="workspace-header">
        <Breadcrumbs trail={activeHref === "/dashboard" ? trail : [
          { label: role === "ADMIN" ? "Admin workspace" : "Workspace", href: "/dashboard" }, ...trail,
        ]}/>
        <div className="flex items-center gap-2"><Theme/><form action={logout}><button className="button secondary">Sign out</button></form></div>
      </header>
      <main id="main" className="workspace-main mx-auto grid max-w-[1440px] gap-5 p-4 sm:gap-6 sm:p-7 xl:p-9">{children}</main>
    </div>
  </div>;
}
