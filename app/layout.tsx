import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import { Activity, Boxes, Gauge, HeartPulse, Home, RadioTower, Settings, Server } from "lucide-react";
import "./globals.css";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "HomeLab Command Center",
  description: "Single-pane Unraid dashboard for Docker, uptime, speed, media, and alerts."
};

const navItems = [
  { href: "/overview", label: "Overview", icon: Home },
  { href: "/server", label: "Server", icon: Server },
  { href: "/docker", label: "Docker", icon: Boxes },
  { href: "/uptime", label: "Uptime", icon: HeartPulse },
  { href: "/speedtest", label: "Speedtest", icon: Gauge },
  { href: "/media", label: "Media", icon: RadioTower },
  { href: "/settings", label: "Settings", icon: Settings }
];

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body>
        <div className="flex min-h-screen">
          <aside className="fixed inset-y-0 left-0 hidden w-72 border-r border-border/60 bg-background/70 p-4 backdrop-blur-xl lg:block">
            <Link href="/overview" className="mb-8 flex items-center gap-3 rounded-lg px-2 py-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary text-primary-foreground shadow-glow">
                <Activity className="h-5 w-5" />
              </div>
              <div>
                <div className="text-sm font-semibold">HomeLab</div>
                <div className="text-xs text-muted-foreground">Command Center</div>
              </div>
            </Link>
            <nav className="space-y-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </aside>
          <main className="min-w-0 flex-1 lg:pl-72">
            <div className="mx-auto w-full max-w-7xl px-4 py-5 sm:px-6 lg:px-8">
              <div className="mb-5 flex gap-2 overflow-x-auto rounded-lg border border-border/60 bg-background/70 p-2 backdrop-blur lg:hidden">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <Link key={item.href} href={item.href} className="flex shrink-0 items-center gap-2 rounded-md px-3 py-2 text-sm text-muted-foreground">
                      <Icon className="h-4 w-4" />
                      {item.label}
                    </Link>
                  );
                })}
              </div>
              {children}
            </div>
          </main>
        </div>
      </body>
    </html>
  );
}
