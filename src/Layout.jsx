
import React, { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { 
  Building2, 
  LogOut
} from "lucide-react";
import { User as UserEntity } from "@/entities/User";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function Layout({ children, currentPageName }) {
  const location = useLocation();
  const [user, setUser] = React.useState(null);

  React.useEffect(() => {
    const loadUser = async () => {
      try {
        const userData = await UserEntity.me();
        setUser(userData);
      } catch (error) {
        // For demo purposes, if no user is logged in, create a dummy admin
        // so the admin panel is viewable.
        setUser({
            full_name: 'Demo Admin',
            role: 'admin'
        });
        console.error("Not logged in, using demo user. Error:", error);
      }
    };
    loadUser();
  }, []);

  useEffect(() => {
    const title = 'Monthly Business Review';
    const description = 'A platform to monitor the health and outlook of your region and the US brokerage business.';
    // IMPORTANT: Replace this with the full, public URL to your app's logo
    const imageUrl = 'https://your-ay-logo.com/logo.png'; // Placeholder
    const pageUrl = window.location.href; // Use current page URL

    // Set page title
    document.title = title;

    // Helper to set or create a meta tag
    const setMetaTag = (attr, key, content) => {
        let element = document.querySelector(`meta[${attr}='${key}']`);
        if (!element) {
            element = document.createElement('meta');
            element.setAttribute(attr, key);
            document.head.appendChild(element);
        }
        element.setAttribute('content', content);
    };

    setMetaTag('name', 'description', description);
    setMetaTag('property', 'og:title', title);
    setMetaTag('property', 'og:description', description);
    setMetaTag('property', 'og:image', imageUrl);
    setMetaTag('property', 'og:url', pageUrl);
    setMetaTag('property', 'og:type', 'website');

    // Set favicon
    let favicon = document.querySelector("link[rel~='icon']");
    if (!favicon) {
        favicon = document.createElement('link');
        favicon.rel = 'icon';
        document.head.appendChild(favicon);
    }
    favicon.href = imageUrl;

  }, []);

  const handleLogout = async () => {
    // In demo mode, just navigate home. The real logout is disabled.
    alert("Logout is disabled in demo mode. Returning to home page.");
    window.location.href = createPageUrl('Dashboard');
  };

  // Don't show sidebar layout for these pages
  const noLayoutPages = ["Dashboard", "RMDLogin", "AdminLogin", "MonthlyReport"];
  if (noLayoutPages.includes(currentPageName)) {
    return children;
  }

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-slate-50 to-blue-50">
      <style>{`
          :root {
            --primary: 30 58 138;
            --primary-foreground: 248 250 252;
            --secondary: 245 158 11;
            --secondary-foreground: 30 58 138;
            --accent: 239 246 255;
            --accent-foreground: 30 58 138;
            --background: 248 250 252;
            --foreground: 30 58 138;
            --card: 255 255 255;
            --card-foreground: 30 58 138;
            --border: 226 232 240;
            --muted: 241 245 249;
            --muted-foreground: 100 116 139;
          }
        `}</style>
        
      <main className="flex flex-col h-screen">
        <header className="bg-white/80 backdrop-blur-sm sticky top-0 z-10 border-b border-slate-200 px-6 py-3 shadow-sm flex justify-between items-center">
          {/* Left side: App Logo and Page Title */}
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl flex items-center justify-center shadow-lg">
              <Building2 className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-xl font-bold text-slate-800">
              {currentPageName.replace(/([A-Z])/g, ' $1').trim()}
            </h1>
          </div>

          {/* Right side: User Profile and Logout */}
          {user && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-auto p-0 rounded-full">
                  <div className="flex items-center gap-3">
                    <div className="text-right hidden sm:block">
                      <p className="font-medium text-slate-900 text-sm truncate">
                        {user.full_name || 'User'}
                      </p>
                      <p className="text-xs text-slate-500 truncate capitalize">
                        {user.role || 'User'}
                      </p>
                    </div>
                    <Avatar className="w-10 h-10">
                      <AvatarFallback className="bg-blue-100 text-blue-700 font-semibold">
                        {user.full_name?.charAt(0)?.toUpperCase() || 'U'}
                      </AvatarFallback>
                    </Avatar>
                  </div>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem onClick={handleLogout}>
                  <LogOut className="w-4 h-4 mr-2" />
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </header>

        <div className="flex-1 overflow-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
