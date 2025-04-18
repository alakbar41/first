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
import VerifyVote from "@/pages/verify-vote";
import AdminDashboard from "@/pages/admin-dashboard-new";
import AdminCandidates from "@/pages/admin-candidates";
import TicketsPage from "@/pages/tickets-page";
import AdminTickets from "@/pages/admin-tickets";
import AdminArchitecture from "@/pages/admin-architecture";
import AdminBlockchain from "@/pages/admin-blockchain";
import { SettingsPage } from "@/pages/settings";
import { ProtectedRoute, AdminProtectedRoute } from "./lib/protected-route";
import { FC, ReactNode } from 'react';
import { AuthProvider } from "./hooks/use-auth";
import { Web3Provider } from "./hooks/use-web3";
import { StudentIdWeb3Provider } from "./hooks/use-student-id-web3";
import { CSRFProvider } from "./hooks/use-csrf";
import { ThemeProvider } from "./hooks/use-theme";

function Router() {
  return (
    <Switch>
      {/* Student routes */}
      <ProtectedRoute path="/" component={Dashboard} />
      <ProtectedRoute path="/results" component={Results} />
      <ProtectedRoute path="/guidelines" component={Guidelines} />
      <ProtectedRoute path="/verify-vote" component={VerifyVote} />
      <ProtectedRoute path="/tickets" component={TicketsPage} />
      <ProtectedRoute path="/settings" component={SettingsPage} />
      
      {/* Admin routes - using AdminProtectedRoute to ensure admin validation */}
      <AdminProtectedRoute path="/admin" component={AdminDashboard} />
      <AdminProtectedRoute path="/admin/elections" component={AdminDashboard} />
      <AdminProtectedRoute path="/admin/candidates" component={AdminCandidates} />
      <AdminProtectedRoute path="/admin/tickets" component={AdminTickets} />
      <AdminProtectedRoute path="/admin/voters" component={AdminDashboard} />
      <AdminProtectedRoute path="/admin/settings" component={AdminDashboard} />
      <AdminProtectedRoute path="/admin/blockchain" component={AdminBlockchain} />
      <AdminProtectedRoute path="/admin-architecture" component={AdminArchitecture} />
      
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
      <CSRFProvider>
        <AuthProvider>
          <ThemeProvider>
            <Web3Provider>
              <StudentIdWeb3Provider>
                <Router />
                <Toaster />
              </StudentIdWeb3Provider>
            </Web3Provider>
          </ThemeProvider>
        </AuthProvider>
      </CSRFProvider>
    </QueryClientProvider>
  );
}

export default App;
