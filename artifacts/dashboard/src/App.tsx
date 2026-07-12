import { Switch, Route, Link, Router as WouterRouter, Redirect } from 'wouter';
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";

import Home from "./pages/Home";
import Queue from "./pages/Queue";
import DraftEditor from "./pages/DraftEditor";
import Seo from "./pages/Seo";
import Engine from "./pages/Engine";
import VoiceSettings from "./pages/VoiceSettings";
import { queryClient } from "./lib/queryClient";
import { AuthProvider, useAuth } from "./lib/auth";

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

function ProtectedRoute({ component: Component }: { component: React.ComponentType }) {
  const { isLoggedIn } = useAuth();
  return isLoggedIn ? <Component /> : <Redirect to="/" />;
}

function Routes() {
  return (
    <Switch>
      <Route path="/" component={Home} />

      <Route path="/queue">
        <ProtectedRoute component={Queue} />
      </Route>

      <Route path="/drafts/:id">
        <ProtectedRoute component={DraftEditor} />
      </Route>

      <Route path="/seo">
        <ProtectedRoute component={Seo} />
      </Route>

      <Route path="/engine">
        <ProtectedRoute component={Engine} />
      </Route>

      <Route path="/voice">
        <ProtectedRoute component={VoiceSettings} />
      </Route>

      <Route>
        <div className="p-8 min-h-screen flex items-center justify-center flex-col gap-4 text-center">
          <h1 className="text-4xl font-bold">404</h1>
          <p className="text-muted-foreground">Page not found</p>
          <Link href="/" className="text-primary hover:underline">Go back home</Link>
        </div>
      </Route>
    </Switch>
  );
}

function App() {
  return (
    <WouterRouter base={basePath}>
      <AuthProvider>
        <QueryClientProvider client={queryClient}>
          <TooltipProvider>
            <Routes />
            <Toaster />
          </TooltipProvider>
        </QueryClientProvider>
      </AuthProvider>
    </WouterRouter>
  );
}

export default App;
