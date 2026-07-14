// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { Router } from "wouter";
import { memoryLocation } from "wouter/memory-location";
import React from "react";

vi.mock("@workspace/api-client-react", () => ({
  setAuthTokenGetter: vi.fn(),
}));

vi.mock("../lib/auth", () => ({
  AuthProvider: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
  useAuth: () => ({
    isLoggedIn: false,
    editorStatus: "unknown",
    editorEmail: null,
    login: vi.fn(),
    logout: vi.fn(),
  }),
}));

vi.mock("../lib/queryClient", () => ({
  queryClient: {
    defaultOptions: {},
    getQueryData: vi.fn(),
    setQueryData: vi.fn(),
    invalidateQueries: vi.fn(),
  },
}));

vi.mock("@tanstack/react-query", () => ({
  QueryClientProvider: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
  useQuery: vi.fn(() => ({ data: undefined, isLoading: false })),
  useMutation: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
}));

vi.mock("@/components/ui/toaster", () => ({
  Toaster: () => null,
}));

vi.mock("@/components/ui/tooltip", () => ({
  TooltipProvider: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
}));

vi.mock("../pages/Home", () => ({ default: () => <div>Home</div> }));
vi.mock("../pages/Queue", () => ({ default: () => <div>Queue</div> }));
vi.mock("../pages/Schedule", () => ({ default: () => <div>Schedule</div> }));
vi.mock("../pages/DraftEditor", () => ({ default: () => <div>DraftEditor</div> }));
vi.mock("../pages/Seo", () => ({ default: () => <div>Seo</div> }));
vi.mock("../pages/Engine", () => ({ default: () => <div>Engine</div> }));
vi.mock("../pages/VoiceSettings", () => ({ default: () => <div>VoiceSettings</div> }));
vi.mock("../pages/AccessPending", () => ({ default: () => <div>AccessPending</div> }));
vi.mock("../pages/ImageLibrary", () => ({ default: () => <div>ImageLibrary</div> }));

const { Routes } = await import("../App");

afterEach(cleanup);

describe("real Routes component — /app/callback renders null, not 404", () => {
  it("renders nothing at /app/callback (MSAL popup callback page is blank)", () => {
    const { hook } = memoryLocation({ path: "/app/callback" });

    const { container } = render(
      <Router hook={hook}>
        <Routes />
      </Router>
    );

    expect(
      screen.queryByText("Page not found"),
      "/app/callback must NOT trigger the 404 fallback route"
    ).toBeNull();

    expect(
      screen.queryByRole("heading", { name: /404/i }),
      "/app/callback must NOT render a 404 heading"
    ).toBeNull();

    expect(
      container.firstChild,
      "Route /app/callback renders null — container should be empty"
    ).toBeNull();
  });

  it("wildcard 404 fallback fires for truly unknown routes", () => {
    const { hook } = memoryLocation({ path: "/totally-unknown-path" });

    render(
      <Router hook={hook}>
        <Routes />
      </Router>
    );

    expect(
      screen.getByText("Page not found"),
      "Unknown paths must reach the 404 fallback"
    ).toBeTruthy();
  });

  it("login page loads at / (not 404)", () => {
    const { hook } = memoryLocation({ path: "/" });

    render(
      <Router hook={hook}>
        <Routes />
      </Router>
    );

    expect(
      screen.queryByText("Page not found"),
      "/ must not render the 404 page"
    ).toBeNull();
  });
});
