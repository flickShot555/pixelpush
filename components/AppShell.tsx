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
import { BackButton } from "@/components/ui/BackButton";
import { PwaInstallButton } from "@/components/pwa/PwaInstallButton";

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
  if (pathname === "/login") return true;
  if (pathname === "/signup") return true;
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

  const showBackButton =
    hideSidebar && pathname !== "/" && !pathname.startsWith("/pricing");

  if (hideSidebar)
    return (
      <>
        {showBackButton ? <BackButton /> : null}
        {children}
      </>
    );

  return (
    <div
      style={{
        height: "100dvh",
        minHeight: "100dvh",
        background: theme.bg,
        color: theme.text,
        fontFamily: "var(--pp-font-body)",
        overflow: "hidden",
      }}
    >
      {/* Desktop layout (sidebar) */}
      <div className="hidden md:flex" style={{ height: "100%" }}>
        <aside
          style={{
            width: 64,
            flex: "0 0 64px",
            height: "100%",
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
                  aria-current={active ? "page" : undefined}
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

          <PwaInstallButton mode="icon" label="Download PixelPush" />

          <div style={{ height: 10 }} />

          <Link
            href="/profile"
            title={session?.user?.name ?? session?.user?.email ?? "Not signed in"}
            aria-label="Profile"
            style={{ textDecoration: "none" }}
          >
            <div
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
          </Link>
        </aside>

        <div
          style={{
            flex: 1,
            minWidth: 0,
            height: "100%",
            overflowY: "auto",
            overflowX: "hidden",
            WebkitOverflowScrolling: "touch",
          }}
        >
          {children}
        </div>
      </div>

      {/* Mobile layout (top bar + bottom nav) */}
      <div className="md:hidden" style={{ height: "100%" }}>
        <div
          style={{
            height: "100%",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              flex: 1,
              minHeight: 0,
              overflowY: "auto",
              overflowX: "hidden",
              WebkitOverflowScrolling: "touch",
              paddingBottom: "calc(90px + env(safe-area-inset-bottom))",
            }}
          >
            <div
              style={{
                position: "sticky",
                top: 0,
                zIndex: 40,
                height: "calc(56px + env(safe-area-inset-top))",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                paddingLeft: 16,
                paddingRight: 16,
                paddingTop: "env(safe-area-inset-top)",
                background: theme.surface,
                borderBottom: `1px solid ${theme.border}`,
              }}
            >
              <div
                style={{
                  fontFamily: "var(--pp-font-head)",
                  fontWeight: 800,
                  letterSpacing: "-0.02em",
                }}
              >
                PixelPush
              </div>
              <PwaInstallButton label="Download" />
            </div>

            {children}
          </div>

          <nav
            aria-label="Bottom navigation"
            style={{
              position: "fixed",
              left: 0,
              right: 0,
              bottom: 0,
              height: "calc(72px + env(safe-area-inset-bottom))",
              paddingBottom: "env(safe-area-inset-bottom)",
              background: theme.surface,
              borderTop: `1px solid ${theme.border}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-around",
              zIndex: 50,
            }}
          >
            {NAV_ITEMS.map((item) => {
              const active = isActive(item.href, pathname);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-label={item.label}
                  aria-current={active ? "page" : undefined}
                  style={{
                    flex: 1,
                    minWidth: 0,
                    textDecoration: "none",
                    color: theme.text,
                    padding: "10px 0",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 4,
                    background: active ? theme.accentBg : "transparent",
                    borderTop: active
                      ? `2px solid ${theme.accentBorder}`
                      : "2px solid transparent",
                  }}
                >
                  <span aria-hidden style={{ lineHeight: 0 }}>{item.icon}</span>
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      color: active ? theme.text : theme.muted,
                      letterSpacing: "0.01em",
                    }}
                  >
                    {item.label}
                  </span>
                </Link>
              );
            })}
          </nav>
        </div>
      </div>
    </div>
  );
}
