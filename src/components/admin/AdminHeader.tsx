import { Search, LogOut, User } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useSidebar } from "@/components/ui/sidebar";
import { useAuth } from "@/hooks/useAuth";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { NotificationsDropdown } from "@/components/NotificationsDropdown";
import { useTheme } from "@/contexts/ThemeContext";
import { useSiteSettingsOptional } from "@/contexts/SiteSettingsContext";
import logoLightDefault from "@/assets/logo-light-new.png";
import logoDarkDefault from "@/assets/logo-red-lion.png";

export function AdminHeader() {
  const { toggleSidebar } = useSidebar();
  const { user, signOut } = useAuth();
  const { effectiveTheme } = useTheme();
  const siteSettings = useSiteSettingsOptional();

  const lightLogo = siteSettings?.logos?.light_logo || logoLightDefault;
  const darkLogo = siteSettings?.logos?.dark_logo || logoDarkDefault;
  const brandTitle = siteSettings?.settings?.site_title || "Admin Panel";
  const currentLogo = effectiveTheme === 'dark' ? darkLogo : lightLogo;

  return (
    <header className="h-16 border-b border-border bg-card flex items-center px-6 justify-between">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={toggleSidebar}>
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
            <path fill="currentColor" d="M22 4H2v4h20zM2 10h20v4H2zm0 6h20v4H2z" />
          </svg>
        </Button>

        <div className="flex items-center gap-2">
          <img src={currentLogo} alt={`${brandTitle} admin logo`} className="h-8 w-auto" loading="eager" />
        </div>
      </div>

      <div className="flex-1 max-w-md mx-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search movies, series..." className="pl-10 bg-background" />
        </div>
      </div>

      <div className="flex items-center gap-2">
        <NotificationsDropdown />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="rounded-full">
              <Avatar>
                <AvatarFallback>
                  <User className="h-4 w-4" />
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium leading-none">{user?.email}</p>
                <p className="text-xs leading-none text-muted-foreground">Admin</p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => signOut()}>
              <LogOut className="mr-2 h-4 w-4" />
              <span>Log out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}

