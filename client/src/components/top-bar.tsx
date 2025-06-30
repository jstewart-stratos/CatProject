import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Search, Bell } from "lucide-react";
import SearchDialog from "./search-dialog";

interface TopBarProps {
  title: string;
  subtitle: string;
}

export default function TopBar({ title, subtitle }: TopBarProps) {
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  const handleSearchClick = () => {
    setIsSearchOpen(true);
  };

  // Add global keyboard listener
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setIsSearchOpen(true);
      }
    };

    document.addEventListener('keydown', handleGlobalKeyDown);
    return () => document.removeEventListener('keydown', handleGlobalKeyDown);
  }, []);

  return (
    <header className="hidden lg:block bg-white shadow-sm border-b border-slate-200 px-4 lg:px-6 py-4 fixed top-0 right-0 left-64 z-40">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl lg:text-2xl font-bold text-slate-800">{title}</h1>
          <p className="text-sm lg:text-base text-slate-600">{subtitle}</p>
        </div>
        
        <div className="flex items-center space-x-2 lg:space-x-4">
          <Button
            variant="outline"
            className="hidden sm:flex w-40 lg:w-80 justify-start text-slate-500 font-normal"
            onClick={handleSearchClick}
          >
            <Search className="h-4 w-4 mr-2" />
            <span className="hidden lg:inline">Search clients, accounts...</span>
            <span className="lg:hidden">Search...</span>
            <div className="ml-auto hidden lg:flex items-center gap-1">
              <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-slate-100 px-1.5 font-mono text-[10px] font-medium text-slate-600">
                <span className="text-xs">⌘</span>K
              </kbd>
            </div>
          </Button>

          <Button
            variant="outline"
            size="sm"
            className="sm:hidden"
            onClick={handleSearchClick}
          >
            <Search className="h-4 w-4" />
          </Button>
          
          <Button variant="ghost" size="sm" className="relative">
            <Bell className="h-5 w-5" />
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
              3
            </span>
          </Button>
        </div>
      </div>

      <SearchDialog open={isSearchOpen} onOpenChange={setIsSearchOpen} />
    </header>
  );
}
