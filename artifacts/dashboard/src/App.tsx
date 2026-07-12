import { useEffect, useRef } from "react";
import { ClerkProvider, SignIn, SignUp, Show, useClerk } from '@clerk/react';
import { publishableKeyFromHost } from '@clerk/react/internal';
import { shadcn } from '@clerk/themes';
import { Switch, Route, Link, useLocation, Router as WouterRouter, Redirect } from 'wouter';
import { QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";

import Home from "./pages/Home";
import Queue from "./pages/Queue";
import DraftEditor from "./pages/DraftEditor";
import Seo from "./pages/Seo";
import Engine from "./pages/Engine";
import VoiceSettings from "./pages/VoiceSettings";
import { queryClient } from "./lib/queryClient";

const clerkPubKey = publishableKeyFromHost(
  window.location.hostname,
  import.meta.env.VITE_CLERK_PUBLISHABLE_KEY,
);

const clerkProxyUrl = import.meta.env.VITE_CLERK_PROXY_URL;
const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

function stripBase(path: string): string {
  return basePath && path.startsWith(basePath)
    ? path.slice(basePath.length) || "/"
    : path;
}

if (!clerkPubKey) {
  throw new Error('Missing VITE_CLERK_PUBLISHABLE_KEY in .env file');
}

const clerkAppearance = {
  theme: shadcn,
  cssLayerName: "clerk",
  options: {
    logoPlacement: "inside" as const,
    logoLinkUrl: basePath || "/",
    logoImageUrl: `${window.location.origin}${basePath}/logo.svg`,
  },
  variables: {
    colorPrimary: "hsl(15 100% 50%)",
    colorForeground: "hsl(0 0% 9%)",
    colorMutedForeground: "hsl(0 0% 45%)",
    colorDanger: "hsl(0 84% 60%)",
    colorBackground: "hsl(0 0% 100%)",
    colorInput: "hsl(0 0% 100%)",
    colorInputForeground: "hsl(0 0% 9%)",
    colorNeutral: "hsl(0 0% 90%)",
    fontFamily: "Inter, system-ui, sans-serif",
    borderRadius: "0.25rem",
  },
  elements: {
    rootBox: "w-full flex justify-center",
    cardBox: "bg-white rounded-md border border-border w-[400px] max-w-full overflow-hidden shadow-sm",
    card: "!shadow-none !border-0 !bg-transparent !rounded-none",
    footer: "!shadow-none !border-0 !bg-transparent !rounded-none",
    headerTitle: "text-foreground font-bold tracking-tight text-xl",
    headerSubtitle: "text-muted-foreground",
    socialButtonsBlockButtonText: "text-foreground font-medium",
    formFieldLabel: "text-foreground font-medium",
    footerActionLink: "text-primary hover:text-primary/90 font-medium",
    footerActionText: "text-muted-foreground",
    dividerText: "text-muted-foreground",
    identityPreviewEditButton: "text-primary hover:text-primary/90",
    formFieldSuccessText: "text-green-600",
    alertText: "text-foreground",
    logoBox: "mb-2 h-8 flex justify-center",
    logoImage: "h-8 object-contain",
    socialButtonsBlockButton: "border border-border hover:bg-secondary transition-colors text-foreground",
    formButtonPrimary: "bg-primary hover:bg-primary/90 text-white font-medium transition-colors shadow-none",
    formFieldInput: "border-border focus:border-primary focus:ring-1 focus:ring-primary text-foreground bg-background",
    footerAction: "text-sm",
    dividerLine: "bg-border",
    alert: "border border-border bg-secondary",
    otpCodeFieldInput: "border-border focus:border-primary text-foreground",
    formFieldRow: "mb-4",
    main: "gap-4",
  },
};

const clerkLocalization = {
  signIn: {
    start: {
      title: "Sign in to SignalAI",
      subtitle: "The editorial desk awaits",
    },
  },
  signUp: {
    start: {
      title: "Join the SignalAI desk",
      subtitle: "Create your editor account to continue",
    },
  },
};

function SignInPage() {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-background px-4">
      <SignIn routing="path" path={`${basePath}/sign-in`} signUpUrl={`${basePath}/sign-up`} />
    </div>
  );
}

function SignUpPage() {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-background px-4">
      <SignUp routing="path" path={`${basePath}/sign-up`} signInUrl={`${basePath}/sign-in`} />
    </div>
  );
}

function ClerkQueryClientCacheInvalidator() {
  const { addListener } = useClerk();
  const queryClient = useQueryClient();
  const prevUserIdRef = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    const unsubscribe = addListener(({ user }) => {
      const userId = user?.id ?? null;
      if (
        prevUserIdRef.current !== undefined &&
        prevUserIdRef.current !== userId
      ) {
        queryClient.clear();
      }
      prevUserIdRef.current = userId;
    });
    return unsubscribe;
  }, [addListener, queryClient]);

  return null;
}

function ClerkProviderWithRoutes() {
  const [, setLocation] = useLocation();

  return (
    <ClerkProvider
      publishableKey={clerkPubKey}
      proxyUrl={clerkProxyUrl}
      appearance={clerkAppearance}
      localization={clerkLocalization}
      signInUrl={`${basePath}/sign-in`}
      signUpUrl={`${basePath}/sign-up`}
      routerPush={(to) => setLocation(stripBase(to))}
      routerReplace={(to) => setLocation(stripBase(to), { replace: true })}
    >
      <QueryClientProvider client={queryClient}>
        <ClerkQueryClientCacheInvalidator />
        <TooltipProvider>
          <Switch>
            <Route path="/" component={Home} />
            <Route path="/sign-in/*?" component={SignInPage} />
            <Route path="/sign-up/*?" component={SignUpPage} />
            
            <Route path="/queue">
              <Show when="signed-in"><Queue /></Show>
              <Show when="signed-out"><Redirect to="/" /></Show>
            </Route>

            <Route path="/drafts/:id">
              <Show when="signed-in"><DraftEditor /></Show>
              <Show when="signed-out"><Redirect to="/" /></Show>
            </Route>

            <Route path="/seo">
              <Show when="signed-in"><Seo /></Show>
              <Show when="signed-out"><Redirect to="/" /></Show>
            </Route>

            <Route path="/engine">
              <Show when="signed-in"><Engine /></Show>
              <Show when="signed-out"><Redirect to="/" /></Show>
            </Route>

            <Route path="/voice">
              <Show when="signed-in"><VoiceSettings /></Show>
              <Show when="signed-out"><Redirect to="/" /></Show>
            </Route>

            <Route>
              <div className="p-8 min-h-screen flex items-center justify-center flex-col gap-4 text-center">
                <h1 className="text-4xl font-bold">404</h1>
                <p className="text-muted-foreground">Page not found</p>
                <Link href="/" className="text-primary hover:underline">Go back home</Link>
              </div>
            </Route>
          </Switch>
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    </ClerkProvider>
  );
}

function App() {
  return (
    <WouterRouter base={basePath}>
      <ClerkProviderWithRoutes />
    </WouterRouter>
  );
}

export default App;
