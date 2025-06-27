import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import NotFound from "@/pages/not-found";
import Landing from "@/pages/landing";
import Dashboard from "@/pages/dashboard";
import Clients from "@/pages/clients";
import Accounts from "@/pages/accounts";
import ImportExport from "@/pages/import-export";
import Users from "@/pages/users";
import Groups from "@/pages/groups";
import AccountFormEnhanced from "@/pages/account-form-enhanced";
import ClientDetails from "@/pages/client-details";
import AuditLogs from "@/pages/audit-logs";

import ClientOnboardingFull from "@/pages/client-onboarding-full";

function Router() {
  const { isAuthenticated, isLoading } = useAuth();

  return (
    <Switch>
      {isLoading || !isAuthenticated ? (
        <>
          <Route path="/" component={Landing} />
          <Route path="/client-onboarding-full" component={ClientOnboardingFull} />
        </>
      ) : (
        <>
          <Route path="/" component={Dashboard} />
          <Route path="/clients" component={Clients} />
          <Route path="/clients/:id" component={ClientDetails} />
          <Route path="/client-onboarding-full" component={ClientOnboardingFull} />
          <Route path="/accounts" component={Accounts} />
          <Route path="/account-form" component={AccountFormEnhanced} />
          <Route path="/account-form-enhanced" component={AccountFormEnhanced} />
          <Route path="/import-export" component={ImportExport} />
          <Route path="/users" component={Users} />
          <Route path="/groups" component={Groups} />
          <Route path="/audit-logs" component={AuditLogs} />
        </>
      )}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
