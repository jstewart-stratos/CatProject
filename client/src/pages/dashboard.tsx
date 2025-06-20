import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { isUnauthorizedError } from "@/lib/authUtils";
import Sidebar from "@/components/sidebar";
import TopBar from "@/components/top-bar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Wallet, TrendingUp, Clock, ArrowUp } from "lucide-react";

export default function Dashboard() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();

  // Redirect to home if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
      return;
    }
  }, [isAuthenticated, isLoading, toast]);

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["/api/dashboard/stats"],
    enabled: isAuthenticated,
  });

  const { data: recentActivity, isLoading: activityLoading } = useQuery({
    queryKey: ["/api/audit-logs"],
    enabled: isAuthenticated,
  });

  if (isLoading || !isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Sidebar currentView="dashboard" />
      <div className="ml-64">
        <TopBar 
          title="Dashboard" 
          subtitle="Overview of your data management system"
        />
        
        <div className="p-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-slate-600 text-sm font-medium">Total Clients</p>
                    <p className="text-3xl font-bold text-slate-800">
                      {statsLoading ? "..." : stats?.totalClients || 0}
                    </p>
                    <p className="text-emerald-600 text-sm mt-1 flex items-center">
                      <ArrowUp className="h-3 w-3 mr-1" />
                      +12% from last month
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Users className="h-6 w-6 text-blue-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-slate-600 text-sm font-medium">Active Accounts</p>
                    <p className="text-3xl font-bold text-slate-800">
                      {statsLoading ? "..." : stats?.activeAccounts || 0}
                    </p>
                    <p className="text-emerald-600 text-sm mt-1 flex items-center">
                      <ArrowUp className="h-3 w-3 mr-1" />
                      +8% from last month
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-emerald-100 rounded-lg flex items-center justify-center">
                    <Wallet className="h-6 w-6 text-emerald-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-slate-600 text-sm font-medium">Total Portfolio Value</p>
                    <p className="text-3xl font-bold text-slate-800">
                      ${statsLoading ? "..." : (Number(stats?.totalPortfolioValue || 0) / 1000000).toFixed(1)}M
                    </p>
                    <p className="text-emerald-600 text-sm mt-1 flex items-center">
                      <ArrowUp className="h-3 w-3 mr-1" />
                      +15% from last month
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                    <TrendingUp className="h-6 w-6 text-purple-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-slate-600 text-sm font-medium">Data Updates Today</p>
                    <p className="text-3xl font-bold text-slate-800">
                      {statsLoading ? "..." : stats?.todayUpdates || 0}
                    </p>
                    <p className="text-slate-600 text-sm mt-1 flex items-center">
                      <Clock className="h-3 w-3 mr-1" />
                      Last update 2 min ago
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-amber-100 rounded-lg flex items-center justify-center">
                    <Clock className="h-6 w-6 text-amber-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
          
          {/* Charts and Recent Activity */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <Card>
              <CardHeader>
                <CardTitle>Account Growth</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64 bg-slate-50 rounded-lg flex items-center justify-center">
                  <p className="text-slate-500">Chart visualization area</p>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {activityLoading ? (
                    <p className="text-slate-500">Loading activity...</p>
                  ) : recentActivity?.logs?.length > 0 ? (
                    recentActivity.logs.slice(0, 5).map((activity: any, index: number) => (
                      <div key={index} className="flex items-start space-x-3">
                        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                          <span className="text-blue-600 text-xs font-medium">
                            {activity.action[0].toUpperCase()}
                          </span>
                        </div>
                        <div className="flex-1">
                          <p className="text-sm text-slate-800">
                            {activity.action} {activity.entityType}: <span className="font-medium">{activity.entityId}</span>
                          </p>
                          <p className="text-xs text-slate-500">
                            {new Date(activity.createdAt).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-slate-500">No recent activity</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
