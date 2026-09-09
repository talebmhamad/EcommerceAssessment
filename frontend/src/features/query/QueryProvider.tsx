"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const retiredClients = new WeakSet<QueryClient>();

export function isSessionQueryClientActive(client: QueryClient): boolean {
  return !retiredClients.has(client);
}
export function createSessionQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        refetchOnWindowFocus: false,
        retry: 1,
        staleTime: 30_000
      }
    }
  });
}

export function replaceSessionQueryClient(client: QueryClient): QueryClient {
  retiredClients.add(client);
  void client.cancelQueries();
  client.clear();
  // Late mutation callbacks retain the discarded client, never the new session.
  return createSessionQueryClient();
}

export function QueryProvider({
  children,
  client
}: Readonly<{
  children: React.ReactNode;
  client: QueryClient;
}>): React.ReactElement {
  return (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
}
