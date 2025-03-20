import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    let errorMessage = '';
    
    try {
      // Try to parse as JSON first
      const errorData = await res.json();
      
      if (errorData.message) {
        errorMessage = errorData.message;
      } else if (errorData.errors) {
        // Format validation errors
        const errors = errorData.errors;
        errorMessage = Object.keys(errors)
          .map(key => `${key}: ${errors[key]}`)
          .join(', ');
      } else {
        errorMessage = JSON.stringify(errorData);
      }
    } catch (e) {
      // If it's not JSON, get the text
      try {
        errorMessage = await res.text();
      } catch (textError) {
        errorMessage = res.statusText;
      }
    }
    
    const error = new Error(`${res.status}: ${errorMessage}`);
    // @ts-ignore
    error.response = res;
    throw error;
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  const res = await fetch(url, {
    method,
    headers: data ? { "Content-Type": "application/json" } : {},
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  // Clone the response before checking it, so we can still use it later
  const resClone = res.clone();
  await throwIfResNotOk(resClone);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const res = await fetch(queryKey[0] as string, {
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    // Clone the response before checking it
    const resClone = res.clone();
    await throwIfResNotOk(resClone);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
