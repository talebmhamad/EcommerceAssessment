import type { QueryClient, UseMutationOptions } from "@tanstack/react-query";
import { getStoredAccessToken } from "@/features/auth/auth-storage";
import { queryKeys } from "@/features/query/query-keys";
import { isSessionQueryClientActive } from "@/features/query/QueryProvider";

export const cartQueryKey = queryKeys.cart;
export const cartMutationKey = ["cart", "mutation"] as const;

export function createCartMutationOptions<TData, TVariables>(
  queryClient: QueryClient,
  options: {
    mutationFn: (variables: TVariables) => Promise<TData>;
    onSuccess?: (data: TData, variables: TVariables) => void | Promise<void>;
    onError?: (error: Error, variables: TVariables) => void;
  }
): UseMutationOptions<TData, Error, TVariables> {
  const accessToken = getStoredAccessToken();
  const isCurrentSession = (): boolean =>
    isSessionQueryClientActive(queryClient) && accessToken === getStoredAccessToken();

  return {
    mutationKey: cartMutationKey,
    // All cart writes, including add and checkout, finish in request order.
    scope: { id: "cart" },
    mutationFn: async (variables) => {
      await queryClient.cancelQueries({ queryKey: cartQueryKey });
      if (!isCurrentSession()) {
        throw new Error("Your session has changed. Please try again.");
      }
      return options.mutationFn(variables);
    },
    onSuccess: async (data, variables) => {
      await queryClient.cancelQueries({ queryKey: cartQueryKey });
      if (isCurrentSession()) {
        await options.onSuccess?.(data, variables);
      }
    },
    onError: (error, variables) => {
      if (isCurrentSession()) {
        options.onError?.(error, variables);
      }
    },
    onSettled: async () => {
      if (isCurrentSession()) {
        await queryClient.cancelQueries({ queryKey: cartQueryKey });
        // Keep the mutation pending until the authoritative cart is refreshed,
        // even if navigation has unmounted the original cart view.
        await queryClient.invalidateQueries({
          queryKey: cartQueryKey,
          refetchType: "all"
        });
      }
    }
  };
}
