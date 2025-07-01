import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Database, BarChart3, Users, Wallet, ArrowLeftRight, UserCog, UsersIcon, LogOut, UserPlus, FileText, Menu, X, Upload, Home, FileSignature } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useState } from "react";
import logoImage from "@assets/Sunray Mark Only - Solid (2)_1751050129011.png";

interface SidebarProps {
  currentView: string;
}

export default function Sidebar({ currentView }: SidebarProps) {
  const [location] = useLocation();
  const { user } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

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
    { id: "households", path: "/households", label: "Households", icon: Home, adminOnly: false },
    { id: "client-agreements", path: "/client-agreements", label: "Client Agreements", icon: FileSignature, adminOnly: false },
    { id: "client-onboarding-full", path: "/client-onboarding-full", label: "Client Onboarding", icon: UserPlus, adminOnly: false },
    { id: "accounts", path: "/accounts", label: "Accounts", icon: Wallet, adminOnly: false },

    { id: "csv-upload", path: "/csv-upload", label: "CSV Upload", icon: Upload, adminOnly: false },
    { id: "import-export", path: "/import-export", label: "Import/Export", icon: ArrowLeftRight, adminOnly: false },
    { id: "audit-logs", path: "/audit-logs", label: "Audit Logs", icon: FileText, adminOnly: false },
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
    <>
      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 bg-white shadow-lg z-50">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center">
            <img 
              src={logoImage} 
              alt="CatPrep Logo" 
              className="w-8 h-8 object-contain"
            />
            <span className="ml-2 text-lg font-bold text-slate-800">CatPrep</span>
          </div>
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="p-2"
          >
            {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </Button>
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-40" onClick={() => setIsMobileMenuOpen(false)} />
      )}

      {/* Desktop Sidebar & Mobile Sliding Menu */}
      <div className={`
        fixed inset-y-0 left-0 w-64 bg-white shadow-lg z-50 transform transition-transform duration-300 ease-in-out
        lg:translate-x-0
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <div className="flex flex-col h-full">
          {/* Desktop Header */}
          <div className="hidden lg:flex items-center px-6 py-4 border-b border-slate-200">
            <div className="w-10 h-10 flex items-center justify-center">
              <img 
                src={logoImage} 
                alt="CatPrep Logo" 
                className="w-10 h-10 object-contain"
              />
            </div>
            <span className="ml-3 text-xl font-bold text-slate-800">CatPrep</span>
          </div>

          {/* Mobile Header Inside Sidebar */}
          <div className="lg:hidden flex items-center justify-between px-6 py-4 border-b border-slate-200">
            <div className="flex items-center">
              <img 
                src={logoImage} 
                alt="CatPrep Logo" 
                className="w-8 h-8 object-contain"
              />
              <span className="ml-2 text-lg font-bold text-slate-800">CatPrep</span>
            </div>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => setIsMobileMenuOpen(false)}
              className="p-2"
            >
              <X className="h-5 w-5" />
            </Button>
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
                      onClick={() => setIsMobileMenuOpen(false)}
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
                  {user ? `${(user as any).firstName || ''} ${(user as any).lastName || ''}`.trim() || (user as any).username || 'User' : 'Loading...'}
                </p>
                <p className="text-xs text-slate-600">
                  {user ? ((user as any).role === 'admin' ? 'Administrator' : 
                          (user as any).role === 'transition_specialist' ? 'Transition Specialist' : 
                          (user as any).role === 'user' ? 'User' : 
                          (user as any).role === 'viewer' ? 'Viewer' : 
                          (user as any).role) : ''}
                </p>
              </div>
              <Button variant="ghost" size="sm" onClick={handleLogout}>
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
