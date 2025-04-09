import { createContext, ReactNode, useContext, useEffect, useState } from "react";
import { useToast } from "@/hooks/use-toast";

type CSRFContextType = {
  csrfToken: string | null;
  isLoading: boolean;
  error: Error | null;
  refreshToken: () => Promise<string | null>;
};

export const CSRFContext = createContext<CSRFContextType | null>(null);

export function CSRFProvider({ children }: { children: ReactNode }) {
  const [csrfToken, setCsrfToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const { toast } = useToast();

  const fetchToken = async (): Promise<string | null> => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await fetch("/api/csrf-token", {
        credentials: "include",
        headers: {
          "Cache-Control": "no-cache",
        }
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch CSRF token: ${response.status}`);
      }
      
      const data = await response.json();
      setCsrfToken(data.csrfToken);
      return data.csrfToken;
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);
      console.error("Failed to fetch CSRF token:", error);
      toast({
        title: "Error",
        description: "Failed to fetch security token. Some actions may not work.",
        variant: "destructive",
      });
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchToken();
  }, []);

  return (
    <CSRFContext.Provider
      value={{
        csrfToken,
        isLoading,
        error,
        refreshToken: fetchToken,
      }}
    >
      {children}
    </CSRFContext.Provider>
  );
}

export function useCSRF() {
  const context = useContext(CSRFContext);
  if (!context) {
    throw new Error("useCSRF must be used within a CSRFProvider");
  }
  return context;
}