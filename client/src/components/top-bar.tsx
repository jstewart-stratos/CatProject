import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Bell } from "lucide-react";

interface TopBarProps {
  title: string;
  subtitle: string;
}

export default function TopBar({ title, subtitle }: TopBarProps) {
  const [search, setSearch] = useState("");

  return (
    <header className="bg-white shadow-sm border-b border-slate-200 px-6 py-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">{title}</h1>
          <p className="text-slate-600">{subtitle}</p>
        </div>
        
        <div className="flex items-center space-x-4">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
            <Input
              type="text"
              placeholder="Search clients, accounts..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-80 pl-10"
            />
          </div>
          
          <Button variant="ghost" size="sm" className="relative">
            <Bell className="h-5 w-5" />
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
              3
            </span>
          </Button>
        </div>
      </div>
    </header>
  );
}
