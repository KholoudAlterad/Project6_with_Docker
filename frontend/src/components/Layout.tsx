import { ReactNode, useState } from "react";
import { Menu, X, User, Users, ListTodo, Search, LogOut, Settings } from "lucide-react";
import { FlowerLogo } from "./icons/FlowerLogo";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";

interface LayoutProps {
  children: ReactNode;
  currentUser?: {
    email: string;
    role: "admin" | "user";
    isVerified: boolean;
  };
  avatarUrl?: string | null;
  onNavigate?: (page: string) => void;
  currentPage?: string;
  onLogout?: () => void;
}

export function Layout({
  children,
  currentUser,
  avatarUrl,
  onNavigate = () => {},
  currentPage = "my-todos",
  onLogout = () => {},
}: LayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const navigation = [
    { id: "my-todos", label: "My Todos", icon: ListTodo, adminOnly: false },
    { id: "profile", label: "Profile", icon: User, adminOnly: false },
    { id: "settings", label: "Settings", icon: Settings, adminOnly: false },
    { id: "users", label: "Users", icon: Users, adminOnly: true },
    { id: "all-todos", label: "All Todos", icon: ListTodo, adminOnly: true },
  ];

  const visibleNav = navigation.filter(
    (item) => !item.adminOnly || currentUser?.role === "admin"
  );

  return (
    <div className="min-h-screen bg-bg">
      {/* Top Bar */}
      <header className="bg-surface border-b border-border sticky top-0 z-50">
        <div className="flex items-center justify-between px-4 h-16">
          <div className="flex items-center gap-4">
            {/* Mobile Menu Toggle */}
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="lg:hidden p-2 hover:bg-muted rounded-lg"
            >
              {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>

            {/* Logo */}
            <div className="flex items-center gap-2">
              <FlowerLogo className="w-10 h-10" />
              <span className="text-text-900">LeafTasks</span>
            </div>
          </div>

          {/* Search - Desktop */}
          <div className="hidden md:flex items-center flex-1 max-w-md mx-8">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-600" />
              <Input
                placeholder="Search tasks..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-muted border-border"
              />
            </div>
          </div>

          {/* User Avatar */}
          {currentUser && (
            <div className="flex items-center gap-3">
              <div className="hidden sm:flex flex-col items-end">
                <span className="text-sm text-text-900">{currentUser.email}</span>
                <Badge
                  variant={currentUser.role === "admin" ? "default" : "secondary"}
                  className="text-xs"
                >
                  {currentUser.role}
                </Badge>
              </div>
              <Avatar>
                {avatarUrl ? (
                  <AvatarImage src={avatarUrl} alt={currentUser.email} />
                ) : (
                  <AvatarFallback className="flex size-full items-center justify-center rounded-full bg-primary text-primary-foreground">
                    {currentUser.email.charAt(0).toUpperCase()}
                  </AvatarFallback>
                )}
              </Avatar>
            </div>
          )}
        </div>

        {/* Mobile Search */}
        <div className="md:hidden px-4 pb-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-600" />
            <Input
              placeholder="Search tasks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-muted border-border"
            />
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar - Desktop */}
        <aside className="hidden lg:flex flex-col w-64 flex-shrink-0 bg-surface border-r border-border min-h-[calc(100vh-4rem)] sticky top-16">
          <nav className="flex-1 p-4 space-y-2">
            {visibleNav.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => onNavigate(item.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${
                    currentPage === item.id
                      ? "bg-primary text-primary-foreground"
                      : "text-text-600 hover:bg-muted"
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
          <div className="p-4 border-t border-border">
            <Button
              variant="ghost"
              onClick={onLogout}
              className="w-full justify-start gap-3 text-text-600"
            >
              <LogOut className="w-5 h-5" />
              Logout
            </Button>
          </div>
        </aside>

        {/* Mobile Sidebar Overlay */}
        {sidebarOpen && (
          <div
            className="lg:hidden fixed inset-0 bg-black/50 z-40 top-16"
            onClick={() => setSidebarOpen(false)}
          >
            <aside
              className="w-64 bg-surface h-full"
              onClick={(e) => e.stopPropagation()}
            >
              <nav className="p-4 space-y-2">
                {visibleNav.map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        onNavigate(item.id);
                        setSidebarOpen(false);
                      }}
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${
                        currentPage === item.id
                          ? "bg-primary text-primary-foreground"
                          : "text-text-600 hover:bg-muted"
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </nav>
              <div className="p-4 border-t border-border">
                <Button
                  variant="ghost"
                  onClick={onLogout}
                  className="w-full justify-start gap-3 text-text-600"
                >
                  <LogOut className="w-5 h-5" />
                  Logout
                </Button>
              </div>
            </aside>
          </div>
        )}

        {/* Main Content */}
        <main className="min-w-0 flex-1 p-4 md:p-6 lg:p-8">{children}</main>
      </div>

      {/* Bottom Navigation - Mobile Only */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-surface border-t border-border z-50">
        <div className="flex justify-around p-2">
          {visibleNav.slice(0, 4).map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className={`flex flex-col items-center gap-1 px-4 py-2 rounded-lg min-w-[64px] ${
                  currentPage === item.id
                    ? "text-primary"
                    : "text-text-600"
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="text-xs">{item.label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
