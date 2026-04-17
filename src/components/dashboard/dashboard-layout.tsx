"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";

type NavItem = {
  label: string;
  href: string;
};

interface DashboardLayoutProps {
  children: React.ReactNode;
  navItems: NavItem[];
  footer?: React.ReactNode;
}

export function DashboardLayout({
  children,
  navItems,
  footer,
}: DashboardLayoutProps) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-gray-50">
      <aside className="fixed left-0 top-0 z-40 flex h-screen w-64 flex-col border-r bg-white">
        <div className="flex h-16 items-center gap-2 border-b px-6">
          <div className="h-8 w-8 rounded-lg bg-primary" />
          <Link href="/dashboard" className="text-lg font-bold">
            CreatorMatch
          </Link>
        </div>
        <nav className="flex-1 p-4">
          <ul className="space-y-1">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={`block rounded-lg px-4 py-2.5 text-sm ${
                      isActive
                        ? "bg-primary/10 font-medium text-primary"
                        : "text-muted-foreground hover:bg-gray-100"
                    }`}
                  >
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
        <div className="border-t p-4">
          {footer}
          <button
            type="button"
            onClick={() => signOut({ callbackUrl: "/" })}
            className="mt-2 w-full rounded-lg px-4 py-2.5 text-left text-sm text-red-600 hover:bg-red-50"
          >
            Sign Out
          </button>
        </div>
      </aside>
      <main className="ml-64 p-8">{children}</main>
    </div>
  );
}
