import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import { useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/lib/auth";
import NotFound from "@/pages/not-found";

import LoginPage from "@/pages/LoginPage";
import TotpPage from "@/pages/TotpPage";

import StudentDashboardPage from "@/pages/student/DashboardPage";
import StudentCoursesPage from "@/pages/student/CoursesPage";
import LearnPage from "@/pages/student/LearnPage";
import StudentBadgesPage from "@/pages/student/BadgesPage";
import StudentCertificatesPage from "@/pages/student/CertificatesPage";
import StudentAnalyticsPage from "@/pages/student/AnalyticsPage";
import StudentSettingsPage from "@/pages/student/SettingsPage";

import AdminDashboardPage from "@/pages/admin/DashboardPage";
import AdminCoursesPage from "@/pages/admin/CoursesPage";
import CourseEditorPage from "@/pages/admin/CourseEditorPage";
import AdminStudentsPage from "@/pages/admin/StudentsPage";
import AdminBadgesPage from "@/pages/admin/BadgesPage";
import AdminCertificatesPage from "@/pages/admin/CertificatesPage";
import AdminSettingsPage from "@/pages/admin/SettingsPage";
import AdminAuditLogPage from "@/pages/admin/AuditLogPage";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 30_000 },
  },
});

function ProtectedRoute({
  component: Component,
  role,
}: {
  component: React.ComponentType;
  role?: "ADMIN" | "STUDENT";
}) {
  const { user, isLoading } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!isLoading && !user) setLocation("/login");
    if (!isLoading && user && role && user.role !== role) {
      setLocation(user.role === "ADMIN" ? "/admin/dashboard" : "/student/dashboard");
    }
  }, [isLoading, user, role]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!user || (role && user.role !== role)) return null;

  return <Component />;
}

function RootRedirect() {
  const { user, isLoading } = useAuth();
  const [, setLocation] = useLocation();
  useEffect(() => {
    if (!isLoading) {
      setLocation(user ? (user.role === "ADMIN" ? "/admin/dashboard" : "/student/dashboard") : "/login");
    }
  }, [isLoading, user]);
  return null;
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={RootRedirect} />
      <Route path="/login" component={LoginPage} />
      <Route path="/admin/totp" component={TotpPage} />

      <Route path="/student/dashboard" component={() => <ProtectedRoute component={StudentDashboardPage} role="STUDENT" />} />
      <Route path="/student/courses" component={() => <ProtectedRoute component={StudentCoursesPage} role="STUDENT" />} />
      <Route path="/student/courses/:id/learn" component={() => <ProtectedRoute component={LearnPage} role="STUDENT" />} />
      <Route path="/student/badges" component={() => <ProtectedRoute component={StudentBadgesPage} role="STUDENT" />} />
      <Route path="/student/certificates" component={() => <ProtectedRoute component={StudentCertificatesPage} role="STUDENT" />} />
      <Route path="/student/analytics" component={() => <ProtectedRoute component={StudentAnalyticsPage} role="STUDENT" />} />
      <Route path="/student/settings" component={() => <ProtectedRoute component={StudentSettingsPage} role="STUDENT" />} />

      <Route path="/admin/dashboard" component={() => <ProtectedRoute component={AdminDashboardPage} role="ADMIN" />} />
      <Route path="/admin/courses" component={() => <ProtectedRoute component={AdminCoursesPage} role="ADMIN" />} />
      <Route path="/admin/courses/:id/edit" component={() => <ProtectedRoute component={CourseEditorPage} role="ADMIN" />} />
      <Route path="/admin/students" component={() => <ProtectedRoute component={AdminStudentsPage} role="ADMIN" />} />
      <Route path="/admin/badges" component={() => <ProtectedRoute component={AdminBadgesPage} role="ADMIN" />} />
      <Route path="/admin/certificates" component={() => <ProtectedRoute component={AdminCertificatesPage} role="ADMIN" />} />
      <Route path="/admin/settings" component={() => <ProtectedRoute component={AdminSettingsPage} role="ADMIN" />} />
      <Route path="/admin/audit-log" component={() => <ProtectedRoute component={AdminAuditLogPage} role="ADMIN" />} />

      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <AuthProvider>
            <Router />
          </AuthProvider>
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
