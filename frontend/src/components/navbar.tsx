"use client";
import { useTheme } from "next-themes";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "./ui/button";
import { LogIn, LogOut, Moon, Settings, Sun } from "lucide-react";
import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";

const DEFAULT_AVATAR =
  "https://www.htgtrading.co.uk/wp-content/uploads/2016/03/no-user-image-square.jpg";

export function Navbar() {
  const { theme, setTheme } = useTheme();
  const pathname = usePathname();
  const { isAuthed, isLoading, logout, user } = useAuth();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const avatarSrc = user?.profile_picture || DEFAULT_AVATAR;
  const avatarFallback =
    (
      user?.name?.charAt(0) ||
      user?.email?.charAt(0) ||
      user?.id?.toString().charAt(0) ||
      "?"
    )?.toUpperCase() || "?";

  async function handleLogout() {
    await logout();
    router.push("/login");
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60 px-6">
      <div className="mx-auto flex h-14 max-w-screen-2xl items-center md:px-6 lg:px-8">
        {/* Desktop Navigation Section */}
        <div className="mr-4 hidden md:flex">
          <Link href="/" className="mr-6 flex items-center space-x-2">
            <span className="hidden font-bold sm:inline-block">Events App</span>
          </Link>

          <nav className="flex items-center gap-4 text-sm lg:gap-6">
            {isAuthed && (
              <Link
                href="/events"
                className={`transition-colors hover:text-foreground/80 ${
                  pathname?.startsWith("/events") && pathname !== "/events/new"
                    ? "text-foreground"
                    : "text-foreground/60"
                }`}
              >
                Events
              </Link>
            )}
            {!isLoading && isAuthed && (
              <Link
                href="/events/new"
                className={`transition-colors hover:text-foreground/80 ${
                  pathname === "/events/new"
                    ? "text-foreground"
                    : "text-foreground/60"
                }`}
              >
                Create Event
              </Link>
            )}
          </nav>
        </div>

        {/* Mobile Navigation */}
        <div className="mr-2 md:hidden">
          <Link href="/" className="font-bold">
            Events
          </Link>
        </div>

        {/* Right Side Actions */}
        <div className="flex flex-1 items-center justify-between space-x-2 md:justify-end">
          <div className="w-full flex-1 md:w-auto md:flex-none" />

          <nav className="flex items-center gap-2">
            {/* Theme Toggle */}
            <Button
              variant="ghost"
              size="icon"
              aria-label="Toggle theme"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            >
              {mounted ? (
                theme === "dark" ? (
                  <Sun className="h-[1.2rem] w-[1.2rem]" />
                ) : (
                  <Moon className="h-[1.2rem] w-[1.2rem]" />
                )
              ) : (
                <Sun className="h-[1.2rem] w-[1.2rem]" />
              )}
              <span className="sr-only">Toggle theme</span>
            </Button>

            {/* Auth Buttons - Updates immediately when auth state changes */}
            {!isLoading ? (
              !isAuthed ? (
                <Button asChild size="sm">
                  <Link href="/login">
                    <LogIn className="mr-2 h-4 w-4" />
                    Login
                  </Link>
                </Button>
              ) : (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="rounded-full h-9 w-9 p-0"
                    >
                      <Avatar className="h-9 w-9">
                        <AvatarImage
                          src={avatarSrc}
                          alt={user?.name ?? user?.email ?? "User avatar"}
                        />
                        <AvatarFallback>{avatarFallback}</AvatarFallback>
                      </Avatar>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-60">
                    <DropdownMenuLabel className="font-normal">
                      <div className="flex flex-col gap-1">
                        <span className="text-sm font-semibold">
                          {user?.name || "User"} (#Id: {user?.id ?? "—"})
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {user?.email ?? "No email available"}
                        </span>
                      </div>
                    </DropdownMenuLabel>
                    <DropdownMenuGroup>
                      <DropdownMenuItem asChild>
                        <Button size="sm" variant="ghost">
                          <Link
                            href="/settings"
                            className="flex items-center gap-1"
                          >
                            <Settings className="mr-2 h-4 w-4" />
                            Settings
                          </Link>
                        </Button>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Button size="sm" variant="ghost" onClick={handleLogout}>
                          <div className="flex items-center gap-1">
                            <LogOut className="mr-2 h-4 w-4 text-destructive" />
                            <span className="text-destructive">Log out</span>
                          </div>
                        </Button>
                      </DropdownMenuItem>
                    </DropdownMenuGroup>
                  </DropdownMenuContent>
                </DropdownMenu>
              )
            ) : (
              <Button asChild size="sm" disabled>
                <Link href="/login">
                  <LogIn className="mr-2 h-4 w-4" />
                  Login
                </Link>
              </Button>
            )}
          </nav>
        </div>
      </div>
    </header>
  );
}
