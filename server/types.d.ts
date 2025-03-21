// Type declarations for JavaScript modules
declare module './auth.js' {
  import { Express } from 'express';
  export function setupAuth(app: Express): void;
}

declare module './mailer.js' {
  export const mailer: {
    sendOtp(to: string, otp: string): Promise<void>;
  };
}

// Type augmentation for Express Request
declare global {
  namespace Express {
    interface Request {
      isAuthenticated(): boolean;
      user?: {
        id: number;
        email: string;
        isAdmin: boolean;
        faculty: string;
        [key: string]: any;
      };
      login(user: any, callback: (err: any) => void): void;
      logout(callback: (err: any) => void): void;
    }
  }
}