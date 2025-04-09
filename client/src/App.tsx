import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import AuthPage from "@/pages/auth-page";
import RegisterPage from "@/pages/register-page";
import ResetPasswordPage from "@/pages/reset-password-page";
import Dashboard from "@/pages/dashboard-redesigned"; // Using the redesigned dashboard
import Results from "@/pages/results";
import Guidelines from "@/pages/guidelines";
import VerifyVote from "@/pages/verify-vote";
import AdminDashboard from "@/pages/admin-dashboard-new";
import AdminCandidates from "@/pages/admin-candidates";
import { ProtectedRoute, AdminProtectedRoute } from "./lib/protected-route";
import { AuthProvider } from "./hooks/use-auth";
import { Web3Provider } from "./hooks/use-web3";
import { CSRFProvider } from "./hooks/use-csrf";

function Router() {
  return (
    <Switch>
      {/* Student routes */}
      <ProtectedRoute path="/" component={Dashboard} />
      <ProtectedRoute path="/results" component={Results} />
      <ProtectedRoute path="/guidelines" component={Guidelines} />
      <ProtectedRoute path="/verify-vote" component={VerifyVote} />
      
      {/* Admin routes - using AdminProtectedRoute to ensure admin validation */}
      <AdminProtectedRoute path="/admin" component={AdminDashboard} />
      <AdminProtectedRoute path="/admin/elections" component={AdminDashboard} />
      <AdminProtectedRoute path="/admin/candidates" component={AdminCandidates} />
      <AdminProtectedRoute path="/admin/voters" component={AdminDashboard} />
      <AdminProtectedRoute path="/admin/settings" component={AdminDashboard} />
      
      {/* Auth routes */}
      <Route path="/auth" component={AuthPage} />
      <Route path="/register" component={RegisterPage} />
      <Route path="/auth/reset-password" component={ResetPasswordPage} />
      
      {/* 404 route */}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <CSRFProvider>
        <AuthProvider>
          <Web3Provider>
            <Router />
            <Toaster />
          </Web3Provider>
        </AuthProvider>
      </CSRFProvider>
    </QueryClientProvider>
  );
}

export default App;
