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
import AccountForm from "@/pages/account-form";
import ClientOnboarding from "@/pages/client-onboarding-simple";

function Router() {
  const { isAuthenticated, isLoading } = useAuth();

  return (
    <Switch>
      {isLoading || !isAuthenticated ? (
        <>
          <Route path="/" component={Landing} />
          <Route path="/client-onboarding" component={ClientOnboarding} />
        </>
      ) : (
        <>
          <Route path="/" component={Dashboard} />
          <Route path="/clients" component={Clients} />
          <Route path="/client-onboarding" component={ClientOnboarding} />
          <Route path="/accounts" component={Accounts} />
          <Route path="/account-form" component={AccountForm} />
          <Route path="/import-export" component={ImportExport} />
          <Route path="/users" component={Users} />
          <Route path="/groups" component={Groups} />
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
