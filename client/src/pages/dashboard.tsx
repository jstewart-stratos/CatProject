import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { isUnauthorizedError } from "@/lib/authUtils";
import Sidebar from "@/components/sidebar";
import TopBar from "@/components/top-bar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Users, Wallet, TrendingUp, Clock, ArrowUp, FileEdit, PieChart as PieChartIcon, BarChart3, Activity } from "lucide-react";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

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

  const { data: businessMetrics, isLoading: metricsLoading } = useQuery({
    queryKey: ["/api/dashboard/business-metrics"],
    enabled: isAuthenticated,
  });

  if (isLoading || !isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Sidebar currentView="dashboard" />
      <div className="lg:ml-64 pt-16 lg:pt-0">
        <TopBar 
          title="Dashboard" 
          subtitle="Overview of your data management system"
        />
        
        <div className="p-4 lg:p-6 lg:pt-20">
          {/* Enhanced Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
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
                      Active portfolio
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
                    <p className="text-slate-600 text-sm mt-1 flex items-center">
                      <Wallet className="h-3 w-3 mr-1" />
                      Managed accounts
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
                    <p className="text-slate-600 text-sm font-medium">Draft Progress</p>
                    <p className="text-3xl font-bold text-slate-800">
                      {statsLoading ? "..." : stats?.draftStats?.totalDrafts || 0}
                    </p>
                    <p className="text-amber-600 text-sm mt-1 flex items-center">
                      <FileEdit className="h-3 w-3 mr-1" />
                      In progress
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-amber-100 rounded-lg flex items-center justify-center">
                    <FileEdit className="h-6 w-6 text-amber-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-slate-600 text-sm font-medium">Portfolio Value</p>
                    <p className="text-3xl font-bold text-slate-800">
                      ${statsLoading ? "..." : (Number(stats?.totalPortfolioValue || 0) / 1000000).toFixed(1)}M
                    </p>
                    <p className="text-purple-600 text-sm mt-1 flex items-center">
                      <TrendingUp className="h-3 w-3 mr-1" />
                      Assets under mgmt
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
                    <p className="text-slate-600 text-sm font-medium">Today's Activity</p>
                    <p className="text-3xl font-bold text-slate-800">
                      {statsLoading ? "..." : stats?.todayUpdates || 0}
                    </p>
                    <p className="text-slate-600 text-sm mt-1 flex items-center">
                      <Activity className="h-3 w-3 mr-1" />
                      Data updates
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-slate-100 rounded-lg flex items-center justify-center">
                    <Activity className="h-6 w-6 text-slate-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
          
          {/* Priority 1: Enhanced Business Metrics */}
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-6">
              <BarChart3 className="h-6 w-6 text-slate-700" />
              <h2 className="text-xl font-semibold text-slate-800">Business Intelligence</h2>
              <Badge variant="secondary">Priority 1</Badge>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-6 mb-6">
              {/* Account Type Breakdown */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-slate-600">Account Type Distribution</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {metricsLoading ? (
                      <p className="text-slate-500 text-sm">Loading...</p>
                    ) : (
                      (businessMetrics?.accountTypeBreakdown || []).map((item, index) => (
                        <div key={index} className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div 
                              className="w-3 h-3 rounded-full" 
                              style={{ backgroundColor: ['#3b82f6', '#10b981', '#f59e0b', '#ef4444'][index % 4] }}
                            ></div>
                            <span className="text-sm font-medium">{item.type}</span>
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-semibold">{item.count}</div>
                            <div className="text-xs text-slate-500">{item.percentage}%</div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Program Type Analytics */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-slate-600">Program Type Analytics</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {metricsLoading ? (
                      <p className="text-slate-500 text-sm">Loading...</p>
                    ) : (
                      (businessMetrics?.programTypeAnalytics || []).map((item, index) => (
                        <div key={index} className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div 
                              className="w-3 h-3 rounded-full" 
                              style={{ backgroundColor: ['#8b5cf6', '#06b6d4', '#84cc16', '#f97316'][index % 4] }}
                            ></div>
                            <span className="text-sm font-medium">{item.type}</span>
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-semibold">{item.count}</div>
                            <div className="text-xs text-slate-500">{item.percentage}%</div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Account Status Pipeline */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-slate-600">Account Status Pipeline</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {metricsLoading ? (
                      <p className="text-slate-500 text-sm">Loading...</p>
                    ) : (
                      (businessMetrics?.accountStatusPipeline || []).map((item, index) => {
                        const statusColors = {
                          'active': '#10b981',
                          'pending': '#f59e0b', 
                          'suspended': '#ef4444',
                          'closed': '#6b7280'
                        };
                        return (
                          <div key={index} className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div 
                                className="w-3 h-3 rounded-full" 
                                style={{ backgroundColor: statusColors[item.status?.toLowerCase()] || '#6b7280' }}
                              ></div>
                              <span className="text-sm font-medium capitalize">{item.status}</span>
                            </div>
                            <div className="text-right">
                              <div className="text-sm font-semibold">{item.count}</div>
                              <div className="text-xs text-slate-500">{item.percentage}%</div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Registration Type Insights */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-slate-600">Registration Insights</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {metricsLoading ? (
                      <p className="text-slate-500 text-sm">Loading...</p>
                    ) : (
                      (businessMetrics?.registrationTypeInsights || []).slice(0, 6).map((item, index) => (
                        <div key={index} className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div 
                              className="w-3 h-3 rounded-full" 
                              style={{ backgroundColor: ['#dc2626', '#059669', '#0891b2', '#7c3aed', '#db2777', '#ea580c'][index % 6] }}
                            ></div>
                            <span className="text-xs font-medium truncate">{item.type}</span>
                          </div>
                          <div className="text-right">
                            <div className="text-xs font-semibold">{item.count}</div>
                            <div className="text-xs text-slate-500">{item.percentage}%</div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
          
          {/* Business Metrics Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PieChartIcon className="h-5 w-5" />
                  Account Types
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  {statsLoading ? (
                    <div className="h-full bg-slate-50 rounded-lg flex items-center justify-center">
                      <p className="text-slate-500">Loading...</p>
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={stats?.accountTypeBreakdown || []}
                          cx="50%"
                          cy="50%"
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="count"
                          label={({ accountType, count }) => `${accountType}: ${count}`}
                        >
                          {(stats?.accountTypeBreakdown || []).map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'][index % 5]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Program Types
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  {statsLoading ? (
                    <div className="h-full bg-slate-50 rounded-lg flex items-center justify-center">
                      <p className="text-slate-500">Loading...</p>
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={stats?.programTypeBreakdown || []}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="programType" />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="count" fill="#10b981" />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Account Status</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {statsLoading ? (
                    <p className="text-slate-500">Loading...</p>
                  ) : (
                    (stats?.accountStatusBreakdown || []).map((status, index) => (
                      <div key={index} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Badge 
                            variant={status.status === 'active' ? 'default' : status.status === 'pending' ? 'secondary' : 'destructive'}
                          >
                            {status.status}
                          </Badge>
                        </div>
                        <span className="font-medium">{status.count}</span>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
          
          {/* Additional Business Insights */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <Card>
              <CardHeader>
                <CardTitle>Registration Types</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {statsLoading ? (
                    <p className="text-slate-500">Loading...</p>
                  ) : (
                    (stats?.registrationTypeBreakdown || []).map((reg, index) => {
                      const total = stats?.activeAccounts || 1;
                      const percentage = Math.round((reg.count / total) * 100);
                      return (
                        <div key={index} className="space-y-2">
                          <div className="flex items-center justify-between text-sm">
                            <span className="font-medium">{reg.registrationType}</span>
                            <span className="text-slate-600">{reg.count} ({percentage}%)</span>
                          </div>
                          <Progress value={percentage} className="h-2" />
                        </div>
                      );
                    })
                  )}
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
          
          {/* Draft Management Overview */}
          {!statsLoading && stats?.draftStats && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Draft Onboarding</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <span className="text-2xl font-bold">{stats.draftStats.draftOnboarding}</span>
                    <Badge variant="outline">In Progress</Badge>
                  </div>
                  <p className="text-sm text-slate-600 mt-2">Client applications in progress</p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>Draft Accounts</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <span className="text-2xl font-bold">{stats.draftStats.draftAccounts}</span>
                    <Badge variant="outline">Pending</Badge>
                  </div>
                  <p className="text-sm text-slate-600 mt-2">Account applications being prepared</p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>Completion Rate</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <span className="text-2xl font-bold">
                      {stats.totalClients > 0 
                        ? Math.round((stats.totalClients / (stats.totalClients + stats.draftStats.totalDrafts)) * 100)
                        : 0}%
                    </span>
                    <Badge variant="default">Metric</Badge>
                  </div>
                  <p className="text-sm text-slate-600 mt-2">Draft to client conversion rate</p>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
