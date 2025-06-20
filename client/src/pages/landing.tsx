import { useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Database, UserPlus } from "lucide-react";

export default function Landing() {
  const handleLogin = () => {
    window.location.href = "/api/login";
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardContent className="pt-6">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-blue-500 rounded-xl flex items-center justify-center mx-auto mb-4">
              <Database className="h-8 w-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-slate-800 mb-2">Welcome to DataFlow</h1>
            <p className="text-slate-600">Sign in to manage your client data</p>
          </div>
          
          <div className="space-y-4">
            <Button 
              onClick={handleLogin}
              className="w-full"
              size="lg"
            >
              <UserPlus className="h-4 w-4 mr-2" />
              Sign In with Replit
            </Button>
            
            <div className="text-center text-sm text-slate-600">
              <p>Secure authentication powered by Replit</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
