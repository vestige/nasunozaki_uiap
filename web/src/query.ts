import { QueryClient } from "@tanstack/react-query";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: Number.POSITIVE_INFINITY,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});

export const queryKeys = {
  device: ["webhid", "device"] as const,
  connectionMessage: ["webhid", "connection-message"] as const,
  featureReport: ["webhid", "feature-report"] as const,
  roundTrip: ["webhid", "round-trip"] as const,
};
