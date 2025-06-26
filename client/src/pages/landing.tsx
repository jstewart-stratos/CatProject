import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Database, LogIn, AlertCircle } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function Landing() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const queryClient = useQueryClient();

  const loginMutation = useMutation({
    mutationFn: async (credentials: { username: string; password: string }) => {
      return await apiRequest('POST', '/api/auth/login', credentials);
    },
    onSuccess: (data) => {
      // Invalidate auth query to trigger re-fetch and authentication
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (username && password) {
      loginMutation.mutate({ username, password });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="text-center">
            <div className="w-16 h-16 bg-blue-500 rounded-xl flex items-center justify-center mx-auto mb-4">
              <Database className="h-8 w-8 text-white" />
            </div>
            <CardTitle className="text-2xl font-bold text-slate-800">Welcome to DataFlow</CardTitle>
            <p className="text-slate-600 mt-2">Sign in to manage your client data</p>
          </div>
        </CardHeader>
        
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {loginMutation.error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  {(loginMutation.error as any)?.message || "Login failed. Please check your credentials."}
                </AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter your username"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                required
              />
            </div>

            <Button 
              type="submit"
              className="w-full"
              size="lg"
              disabled={!username || !password || loginMutation.isPending}
            >
              <LogIn className="h-4 w-4 mr-2" />
              {loginMutation.isPending ? "Signing In..." : "Sign In"}
            </Button>
          </form>
          
          <div className="text-center text-sm text-slate-600 mt-4">
            <p>Secure authentication with username and password</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
