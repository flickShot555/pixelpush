"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  BarChart3,
  CalendarDays,
  LayoutDashboard,
  Palette,
  Settings,
  User,
} from "lucide-react";

import { useTheme } from "@/lib/theme";

const NAV_ITEMS: Array<{ href: string; label: string; icon: React.ReactNode }> = [
  { href: "/dashboard", label: "Dashboard", icon: <LayoutDashboard size={18} /> },
  { href: "/design", label: "Design", icon: <Palette size={18} /> },
  { href: "/schedule", label: "Schedule", icon: <CalendarDays size={18} /> },
  { href: "/progress", label: "Progress", icon: <BarChart3 size={18} /> },
  { href: "/profile", label: "Profile", icon: <User size={18} /> },
  { href: "/settings", label: "Settings", icon: <Settings size={18} /> },
];

function shouldHideSidebar(pathname: string): boolean {
  if (pathname === "/") return true;
  if (pathname === "/test") return true;
  if (pathname.startsWith("/onboarding")) return true;
  if (pathname.startsWith("/pricing")) return true;
  if (pathname.startsWith("/u/")) return true;
  return false;
}

function isActive(href: string, pathname: string): boolean {
  if (href === "/dashboard") return pathname === "/dashboard";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? "/";
  const { theme } = useTheme();
  const { data: session } = useSession();

  const hideSidebar = shouldHideSidebar(pathname);

  if (hideSidebar) return <>{children}</>;

  return (
    <div
      style={{
        height: "100vh",
        minHeight: "100vh",
        background: theme.bg,
        color: theme.text,
        fontFamily: "var(--pp-font-body)",
        overflow: "hidden",
      }}
    >
      <div style={{ display: "flex", height: "100vh" }}>
        <aside
          style={{
            width: 64,
            flex: "0 0 64px",
            height: "100vh",
            background: theme.surface,
            borderRight: `1px solid ${theme.border}`,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            padding: 12,
            gap: 10,
          }}
        >
          <div
            title="PixelPush"
            aria-label="PixelPush"
            style={{
              width: 40,
              height: 40,
              borderRadius: theme.borderRadius,
              background: `linear-gradient(135deg, ${theme.g3}, ${theme.g4})`,
              border: `1px solid ${theme.accentBorder}`,
            }}
          />

          <nav
            aria-label="Sidebar"
            style={{
              width: "100%",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 8,
              marginTop: 6,
            }}
          >
            {NAV_ITEMS.map((item) => {
              const active = isActive(item.href, pathname);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  title={item.label}
                  aria-label={item.label}
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: theme.borderRadius,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    textDecoration: "none",
                    background: active ? theme.accentBg : "transparent",
                    border: active
                      ? `1px solid ${theme.accentBorder}`
                      : `1px solid transparent`,
                    color: theme.text,
                  }}
                >
                  <span aria-hidden style={{ lineHeight: 0 }}>{item.icon}</span>
                </Link>
              );
            })}
          </nav>

          <div style={{ flex: 1 }} />

          <div
            title={session?.user?.name ?? session?.user?.email ?? "Not signed in"}
            aria-label="User"
            style={{
              width: 40,
              height: 40,
              borderRadius: 999,
              border: `1px solid ${theme.border}`,
              background: theme.surface2,
              overflow: "hidden",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {session?.user?.image ? (
              <img
                src={session.user.image}
                alt=""
                width={40}
                height={40}
                style={{ width: 40, height: 40, objectFit: "cover" }}
              />
            ) : (
              <User aria-hidden size={18} color={theme.muted} />
            )}
          </div>
        </aside>

        <div
          style={{
            flex: 1,
            minWidth: 0,
            height: "100vh",
            overflowY: "auto",
            overflowX: "hidden",
          }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
