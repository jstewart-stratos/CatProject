import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Database, BarChart3, Users, Wallet, ArrowLeftRight, UserCog, UsersIcon, LogOut, UserPlus } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

interface SidebarProps {
  currentView: string;
}

export default function Sidebar({ currentView }: SidebarProps) {
  const [location] = useLocation();
  const { user } = useAuth();

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      window.location.href = '/';
    } catch (error) {
      console.error('Logout error:', error);
      // Fallback: redirect to landing page anyway
      window.location.href = '/';
    }
  };

  const allMenuItems = [
    { id: "dashboard", path: "/", label: "Dashboard", icon: BarChart3, adminOnly: false },
    { id: "clients", path: "/clients", label: "Clients", icon: Users, adminOnly: false },
    { id: "client-onboarding-full", path: "/client-onboarding-full", label: "Client Onboarding", icon: UserPlus, adminOnly: false },
    { id: "accounts", path: "/accounts", label: "Accounts", icon: Wallet, adminOnly: false },
    { id: "import-export", path: "/import-export", label: "Import/Export", icon: ArrowLeftRight, adminOnly: false },
    { id: "users", path: "/users", label: "User Management", icon: UserCog, adminOnly: true },
    { id: "groups", path: "/groups", label: "Groups", icon: UsersIcon, adminOnly: true },
  ];

  // Filter menu items based on user role
  const menuItems = allMenuItems.filter(item => {
    if (item.adminOnly) {
      return user?.role === 'admin' || user?.role === 'transition_specialist';
    }
    return true;
  });

  return (
    <div className="fixed inset-y-0 left-0 w-64 bg-white shadow-lg z-30">
      <div className="flex flex-col h-full">
        <div className="flex items-center px-6 py-4 border-b border-slate-200">
          <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center">
            <Database className="h-6 w-6 text-white" />
          </div>
          <span className="ml-3 text-xl font-bold text-slate-800">DataFlow</span>
        </div>
        
        <nav className="flex-1 px-4 py-6">
          <div className="space-y-2">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentView === item.id || location === item.path;
              
              return (
                <Link key={item.id} href={item.path}>
                  <Button 
                    variant="ghost" 
                    className={`w-full justify-start ${
                      isActive 
                        ? 'bg-blue-50 text-blue-600 hover:bg-blue-50 hover:text-blue-600' 
                        : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <Icon className="h-5 w-5 mr-3" />
                    {item.label}
                  </Button>
                </Link>
              );
            })}
          </div>
        </nav>
        
        <div className="px-4 py-4 border-t border-slate-200">
          <div className="flex items-center mb-4">
            <div className="w-10 h-10 bg-slate-400 rounded-full flex items-center justify-center">
              <Users className="h-5 w-5 text-white" />
            </div>
            <div className="ml-3 flex-1">
              <p className="text-sm font-medium text-slate-800">
                {user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.username || 'User' : 'Loading...'}
              </p>
              <p className="text-xs text-slate-600">
                {user ? (user.role === 'admin' ? 'Administrator' : 
                        user.role === 'transition_specialist' ? 'Transition Specialist' : 
                        user.role === 'user' ? 'User' : 
                        user.role === 'viewer' ? 'Viewer' : 
                        user.role) : ''}
              </p>
            </div>
            <Button variant="ghost" size="sm" onClick={handleLogout}>
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
