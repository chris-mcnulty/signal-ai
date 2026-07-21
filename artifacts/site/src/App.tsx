import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import { ThemeProvider } from "@/context/ThemeContext";

import Home from "@/pages/home";
import Article from "@/pages/article";
import CaseStudies from "@/pages/case-studies";
import CaseStudy from "@/pages/case-study";
import SpotlightsList from "@/pages/spotlights";
import SpotlightDetail from "@/pages/spotlight";
import News from "@/pages/news";
import UseCases from "@/pages/use-cases";
import Opinion from "@/pages/opinion";
import About from "@/pages/about";
import AuthorPage from "@/pages/author";
import PrivacyPage from "@/pages/privacy";
import UnsubscribePage from "@/pages/unsubscribe";
import { SeoHead } from "@/lib/seo";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
    },
  },
});

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/articles/:slug" component={Article} />
      <Route path="/case-studies" component={CaseStudies} />
      <Route path="/case-studies/:slug" component={CaseStudy} />
      <Route path="/spotlights" component={SpotlightsList} />
      <Route path="/spotlights/:slug" component={SpotlightDetail} />
      <Route path="/news" component={News} />
      <Route path="/use-cases" component={UseCases} />
      <Route path="/opinion" component={Opinion} />
      <Route path="/about" component={About} />
      <Route path="/authors/:slug" component={AuthorPage} />
      <Route path="/privacy" component={PrivacyPage} />
      <Route path="/unsubscribe" component={UnsubscribePage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <SeoHead />
            <Router />
          </WouterRouter>
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;
