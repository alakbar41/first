import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import AuthPage from "@/pages/auth-page";
import RegisterPage from "@/pages/register-page";
import Dashboard from "@/pages/dashboard-redesigned"; // Using the redesigned dashboard
import Results from "@/pages/results";
import Guidelines from "@/pages/guidelines";
import AdminDashboard from "@/pages/admin-dashboard";
import AdminCandidates from "@/pages/admin-candidates";
import { ProtectedRoute } from "./lib/protected-route";
import { AuthProvider } from "./hooks/use-auth";

function Router() {
  return (
    <Switch>
      {/* Student routes */}
      <ProtectedRoute path="/" component={Dashboard} />
      <ProtectedRoute path="/results" component={Results} />
      <ProtectedRoute path="/guidelines" component={Guidelines} />
      
      {/* Admin routes */}
      <ProtectedRoute path="/admin" component={AdminDashboard} />
      <ProtectedRoute path="/admin/elections" component={AdminDashboard} />
      <ProtectedRoute path="/admin/candidates" component={AdminCandidates} />
      <ProtectedRoute path="/admin/voters" component={AdminDashboard} />
      <ProtectedRoute path="/admin/settings" component={AdminDashboard} />
      
      {/* Auth routes */}
      <Route path="/auth" component={AuthPage} />
      <Route path="/register" component={RegisterPage} />
      
      {/* 404 route */}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Router />
        <Toaster />
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
