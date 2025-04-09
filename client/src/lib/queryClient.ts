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

// Global CSRF token cache for use when CSRF context isn't available
let globalCsrfToken: string | null = null;

// Helper to get the CSRF token via a dedicated call
async function fetchCsrfToken(): Promise<string | null> {
  try {
    const res = await fetch('/api/csrf-token', {
      credentials: 'include',
      headers: {
        "Cache-Control": "no-cache",
      }
    });
    
    if (!res.ok) {
      console.error(`Failed to fetch CSRF token, status: ${res.status}`);
      return null;
    }
    
    const data = await res.json();
    globalCsrfToken = data.csrfToken;
    return data.csrfToken;
  } catch (error) {
    console.error('Error fetching CSRF token:', error);
    return null;
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
  csrfToken?: string | null,
): Promise<Response> {
  // Skip CSRF for GET, HEAD, OPTIONS
  const needsCsrfToken = !['GET', 'HEAD', 'OPTIONS'].includes(method.toUpperCase());
  
  let token = csrfToken || globalCsrfToken;
  
  // If we need a token but don't have one, fetch it
  if (needsCsrfToken && !token) {
    token = await fetchCsrfToken();
  }
  
  // Prepare headers
  const headers: Record<string, string> = {};
  
  if (data) {
    headers["Content-Type"] = "application/json";
  }
  
  if (token && needsCsrfToken) {
    headers["X-CSRF-Token"] = token;
  }
  
  // Include token in body as fallback
  let finalData = data;
  if (data && typeof data === 'object' && needsCsrfToken && token) {
    finalData = { ...data, _csrf: token };
  } else if (needsCsrfToken && token && !data) {
    // For DELETE requests with no body, create one with just the token
    finalData = { _csrf: token };
  }
  
  // Make the request
  const res = await fetch(url, {
    method,
    headers,
    body: finalData ? JSON.stringify(finalData) : undefined,
    credentials: "include",
  });

  // If we got a 403 with CSRF error, try to refresh the token and retry once
  if (res.status === 403) {
    try {
      const errorData = await res.clone().json();
      if (errorData.message?.includes('CSRF token')) {
        console.log('CSRF token error, refreshing and retrying...');
        // Refresh token
        const newToken = await fetchCsrfToken();
        if (newToken) {
          // Retry with new token
          return apiRequest(method, url, data, newToken);
        }
      }
    } catch (e) {
      // Failed to parse JSON, continue with normal error handling
    }
  }

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
