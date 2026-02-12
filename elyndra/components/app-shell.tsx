"use client";

import { useRole } from "@/lib/role-context";
import { RoleSwitcher } from "@/components/role-switcher";
import type { CurrentUser } from "@/lib/role-context";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { LayoutDashboard, Inbox, Settings, ArrowRight } from "lucide-react";

interface AppShellProps {
  children: React.ReactNode;
  allUsers: CurrentUser[];
}

export function AppShell({ children, allUsers }: AppShellProps) {
  const { currentUser } = useRole();
  const pathname = usePathname();
  const router = useRouter();
  const prevRole = useRef(currentUser?.role);

  // Navigate to the correct view when role changes
  useEffect(() => {
    if (currentUser && currentUser.role !== prevRole.current) {
      prevRole.current = currentUser.role;
      if (currentUser.role === "COORDINATOR") {
        router.push("/coordinator");
      } else if (currentUser.role === "HOME_MANAGER") {
        router.push("/home");
      }
    }
  }, [currentUser, router]);

  const isCoordinator = currentUser?.role === "COORDINATOR";
  const isHomeManager = currentUser?.role === "HOME_MANAGER";

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="border-b bg-white sticky top-0 z-50">
        <div className="max-w-screen-2xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href="/" className="font-semibold text-lg tracking-tight">
              Elyndra
            </Link>
            <nav className="flex items-center gap-1">
              {isCoordinator && (
                <Link
                  href="/coordinator"
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors",
                    pathname.startsWith("/coordinator")
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  )}
                >
                  <LayoutDashboard className="h-4 w-4" />
                  Referral Board
                </Link>
              )}
              {isHomeManager && (
                <>
                  <Link
                    href="/home"
                    className={cn(
                      "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors",
                      pathname === "/home" || pathname.startsWith("/home/request")
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted"
                    )}
                  >
                    <Inbox className="h-4 w-4" />
                    Requests Inbox
                  </Link>
                  <Link
                    href="/home/settings"
                    className={cn(
                      "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors",
                      pathname === "/home/settings"
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted"
                    )}
                  >
                    <Settings className="h-4 w-4" />
                    Home Settings
                  </Link>
                </>
              )}
            </nav>
          </div>
          <div className="flex items-center gap-3">
            {currentUser && (
              <span className="text-xs px-2 py-1 rounded-full bg-muted text-muted-foreground">
                {isCoordinator
                  ? "Coordinator"
                  : currentUser.homeName
                  ? `${currentUser.homeName}`
                  : "Home Manager"}
              </span>
            )}
            <RoleSwitcher allUsers={allUsers} />
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1">
        {!currentUser ? (
          <div className="max-w-screen-2xl mx-auto px-4 py-20 text-center">
            <h2 className="text-xl font-semibold mb-2">Welcome to Elyndra</h2>
            <p className="text-muted-foreground mb-4">
              Select a user from the dropdown to get started.
            </p>
            <ArrowRight className="h-5 w-5 mx-auto text-muted-foreground animate-pulse" />
          </div>
        ) : (
          <div className="max-w-screen-2xl mx-auto px-4 py-6">
            {children}
          </div>
        )}
      </main>
    </div>
  );
}
