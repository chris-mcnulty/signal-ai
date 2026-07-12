import { Show, useClerk } from "@clerk/react";
import { Redirect, Link } from "wouter";

export default function Home() {
  return (
    <>
      <Show when="signed-in">
        <Redirect to="/queue" />
      </Show>
      <Show when="signed-out">
        <div className="min-h-[100dvh] flex flex-col bg-background selection:bg-primary selection:text-white">
          <header className="px-6 h-16 flex items-center border-b border-border/50">
            <div className="flex items-center gap-2 font-bold tracking-tight text-lg">
              <div className="w-6 h-6 bg-primary rounded-sm flex items-center justify-center">
                <div className="w-2 h-2 bg-white rounded-full"></div>
              </div>
              SignalAI
            </div>
            <div className="ml-auto">
              <Link href="/sign-in" className="text-sm font-medium hover:text-primary transition-colors">
                Sign In
              </Link>
            </div>
          </header>
          <main className="flex-1 flex flex-col items-center justify-center p-6 text-center max-w-2xl mx-auto">
            <div className="w-12 h-12 bg-primary/10 text-primary rounded-xl flex items-center justify-center mb-8 mx-auto">
              <div className="w-4 h-4 bg-primary rounded-sm"></div>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-foreground mb-4">
              The Editorial Desk
            </h1>
            <p className="text-lg text-muted-foreground mb-8 text-balance">
              Separate the signal from the AI noise. A high-density control center for reviewing, editing, and scheduling content.
            </p>
            <div className="flex gap-4 items-center justify-center">
              <Link href="/sign-in" className="h-10 px-8 bg-primary hover:bg-primary/90 text-white font-medium rounded-md inline-flex items-center justify-center transition-colors">
                Access Dashboard
              </Link>
            </div>
          </main>
        </div>
      </Show>
    </>
  );
}
