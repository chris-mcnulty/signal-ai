import { QueryClient } from "@tanstack/react-query";

function isAuthError(error: unknown): boolean {
  const status = (error as { status?: number } | null)?.status;
  return status === 401 || status === 403;
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Retry once on transient failures, but never on auth errors — a real
      // 401/403 means the session is gone and retrying won't help.
      retry: (failureCount, error) => {
        if (isAuthError(error)) return false;
        return failureCount < 1;
      },
      refetchOnWindowFocus: false,
    },
  },
});
