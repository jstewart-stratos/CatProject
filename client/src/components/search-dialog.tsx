import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, User, FileText, ArrowRight } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useLocation } from "wouter";

interface SearchResult {
  id: number;
  type: "client" | "account";
  title: string;
  subtitle: string;
  description: string;
  url: string;
}

interface SearchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function SearchDialog({ open, onOpenChange }: SearchDialogProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [, setLocation] = useLocation();

  const { data: searchResults, isLoading } = useQuery({
    queryKey: ["/api/search", searchTerm],
    queryFn: async () => {
      if (!searchTerm || searchTerm.trim().length < 2) {
        return { results: [], totalFound: 0 };
      }
      
      const params = new URLSearchParams();
      params.append("q", searchTerm.trim());
      params.append("limit", "10");
      
      const response = await fetch(`/api/search?${params.toString()}`);
      if (!response.ok) {
        throw new Error("Search failed");
      }
      return response.json();
    },
    enabled: !!searchTerm && searchTerm.trim().length >= 2,
  });

  const handleResultClick = (result: SearchResult) => {
    setLocation(result.url);
    onOpenChange(false);
    setSearchTerm("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      onOpenChange(false);
      setSearchTerm("");
    }
    if (e.key === "Enter" && searchResults?.results?.length > 0) {
      handleResultClick(searchResults.results[0]);
    }
  };

  // Reset search when dialog opens/closes
  useEffect(() => {
    if (!open) {
      setSearchTerm("");
    }
  }, [open]);

  const getResultIcon = (type: string) => {
    switch (type) {
      case "client":
        return <User className="h-4 w-4" />;
      case "account":
        return <FileText className="h-4 w-4" />;
      default:
        return <Search className="h-4 w-4" />;
    }
  };

  const getResultBadgeColor = (type: string) => {
    switch (type) {
      case "client":
        return "bg-blue-100 text-blue-800";
      case "account":
        return "bg-green-100 text-green-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl" onKeyDown={handleKeyDown}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Global Search
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
            <Input
              type="text"
              placeholder="Search clients, accounts, Rep ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
              autoFocus
            />
          </div>

          {/* Search Results */}
          <div className="max-h-96 overflow-y-auto">
            {isLoading && searchTerm.length >= 2 && (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                <span className="ml-2 text-sm text-slate-600">Searching...</span>
              </div>
            )}

            {searchResults?.results?.length === 0 && searchTerm.length >= 2 && !isLoading && (
              <div className="flex flex-col items-center justify-center py-8 text-slate-500">
                <Search className="h-8 w-8 mb-2" />
                <p>No results found for "{searchTerm}"</p>
                <p className="text-sm">Try different keywords or check spelling</p>
              </div>
            )}

            {searchResults?.results?.length > 0 && (
              <div className="space-y-2">
                <div className="text-sm text-slate-600 mb-3">
                  Found {searchResults.totalFound} result{searchResults.totalFound !== 1 ? 's' : ''}
                </div>
                
                {searchResults.results.map((result: SearchResult) => (
                  <Button
                    key={`${result.type}-${result.id}`}
                    variant="ghost"
                    className="w-full justify-start h-auto p-3 hover:bg-slate-50"
                    onClick={() => handleResultClick(result)}
                  >
                    <div className="flex items-start gap-3 w-full">
                      <div className="mt-0.5">
                        {getResultIcon(result.type)}
                      </div>
                      
                      <div className="flex-1 text-left">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium">{result.title}</span>
                          <Badge 
                            variant="secondary" 
                            className={`text-xs ${getResultBadgeColor(result.type)}`}
                          >
                            {result.type}
                          </Badge>
                        </div>
                        
                        {result.subtitle && (
                          <div className="text-sm text-slate-600 mb-1">
                            {result.subtitle}
                          </div>
                        )}
                        
                        <div className="text-xs text-slate-500">
                          {result.description}
                        </div>
                      </div>
                      
                      <ArrowRight className="h-4 w-4 text-slate-400 mt-0.5" />
                    </div>
                  </Button>
                ))}
              </div>
            )}

            {searchTerm.length > 0 && searchTerm.length < 2 && (
              <div className="flex items-center justify-center py-8 text-slate-500">
                <p className="text-sm">Type at least 2 characters to search</p>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}