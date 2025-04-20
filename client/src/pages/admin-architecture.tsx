import React from 'react';
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { AdminSidebar } from "@/components/admin/admin-sidebar";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { Loader2 } from "lucide-react";

export default function AdminArchitecture() {
  const { user, isLoading } = useAuth();
  const [_, navigate] = useLocation();

  // Redirect non-admin users
  React.useEffect(() => {
    if (!isLoading && (!user || !user.isAdmin)) {
      navigate("/auth");
    }
  }, [user, isLoading]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-border" />
      </div>
    );
  }

  if (!user || !user.isAdmin) {
    return null;
  }

  return (
    <div className="grid grid-cols-[240px_1fr] h-screen bg-background">
      <AdminSidebar user={user} />
      <div className="overflow-auto p-6">
        <div className="max-w-[1200px] mx-auto">
          <h1 className="text-3xl font-bold tracking-tight mb-4">
            System Architecture
          </h1>
          <p className="text-muted-foreground mb-8">
            Comprehensive overview of the ADA University Voting System's architectural design,
            deployment strategy, and component interactions.
          </p>
          
          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="frontend">Frontend</TabsTrigger>
              <TabsTrigger value="backend">Backend</TabsTrigger>
              <TabsTrigger value="blockchain">Blockchain</TabsTrigger>
              <TabsTrigger value="deployment">Deployment</TabsTrigger>
            </TabsList>
            
            <TabsContent value="overview" className="space-y-6 mt-6">
              <Card className="p-6">
                <h2 className="text-2xl font-bold mb-4">System Architecture Overview</h2>
                
                <div className="rounded-md border bg-muted p-6 mb-6">
                  <div className="architecture-diagram flex justify-center">
                    <svg width="800" height="500" viewBox="0 0 800 500" className="border rounded-lg bg-white">
                      {/* Main container outlines */}
                      <rect x="50" y="50" width="700" height="400" rx="10" fill="#f5f5f5" stroke="#d1d5db" strokeWidth="2" />
                      
                      {/* Client Layer */}
                      <rect x="80" y="80" width="180" height="340" rx="5" fill="#dbeafe" stroke="#93c5fd" strokeWidth="2" />
                      <text x="170" y="110" fontSize="16" textAnchor="middle" fontWeight="bold">Client Layer</text>
                      
                      <rect x="100" y="130" width="140" height="70" rx="5" fill="#fff" stroke="#93c5fd" strokeWidth="1" />
                      <text x="170" y="165" textAnchor="middle" fontSize="12">Student Interface</text>
                      
                      <rect x="100" y="220" width="140" height="70" rx="5" fill="#fff" stroke="#93c5fd" strokeWidth="1" />
                      <text x="170" y="255" textAnchor="middle" fontSize="12">Admin Interface</text>
                      
                      <rect x="100" y="310" width="140" height="70" rx="5" fill="#fff" stroke="#93c5fd" strokeWidth="1" />
                      <text x="170" y="345" textAnchor="middle" fontSize="12">MetaMask Integration</text>
                      
                      {/* Server Layer */}
                      <rect x="310" y="80" width="180" height="340" rx="5" fill="#d1fae5" stroke="#6ee7b7" strokeWidth="2" />
                      <text x="400" y="110" fontSize="16" textAnchor="middle" fontWeight="bold">Server Layer</text>
                      
                      <rect x="330" y="130" width="140" height="70" rx="5" fill="#fff" stroke="#6ee7b7" strokeWidth="1" />
                      <text x="400" y="165" textAnchor="middle" fontSize="12">Express API</text>
                      
                      <rect x="330" y="220" width="140" height="70" rx="5" fill="#fff" stroke="#6ee7b7" strokeWidth="1" />
                      <text x="400" y="255" textAnchor="middle" fontSize="12">Authentication</text>
                      
                      <rect x="330" y="310" width="140" height="70" rx="5" fill="#fff" stroke="#6ee7b7" strokeWidth="1" />
                      <text x="400" y="345" textAnchor="middle" fontSize="12">Token Management</text>
                      
                      {/* Data Layer */}
                      <rect x="540" y="80" width="180" height="150" rx="5" fill="#fee2e2" stroke="#fca5a5" strokeWidth="2" />
                      <text x="630" y="110" fontSize="16" textAnchor="middle" fontWeight="bold">Data Layer</text>
                      
                      <rect x="560" y="130" width="140" height="70" rx="5" fill="#fff" stroke="#fca5a5" strokeWidth="1" />
                      <text x="630" y="165" textAnchor="middle" fontSize="12">PostgreSQL</text>
                      
                      {/* Blockchain Layer */}
                      <rect x="540" y="270" width="180" height="150" rx="5" fill="#ddd6fe" stroke="#c4b5fd" strokeWidth="2" />
                      <text x="630" y="300" fontSize="16" textAnchor="middle" fontWeight="bold">Blockchain Layer</text>
                      
                      <rect x="560" y="320" width="140" height="70" rx="5" fill="#fff" stroke="#c4b5fd" strokeWidth="1" />
                      <text x="630" y="355" textAnchor="middle" fontSize="12">Ethereum Sepolia</text>
                      
                      {/* Connection lines */}
                      <line x1="260" y1="165" x2="330" y2="165" stroke="#000" strokeWidth="1" strokeDasharray="5,5" />
                      <line x1="260" y1="255" x2="330" y2="255" stroke="#000" strokeWidth="1" strokeDasharray="5,5" />
                      <line x1="260" y1="345" x2="560" y2="345" stroke="#000" strokeWidth="1" strokeDasharray="5,5" />
                      
                      <line x1="470" y1="165" x2="560" y2="165" stroke="#000" strokeWidth="1" strokeDasharray="5,5" />
                      <line x1="400" y1="290" x2="400" y2="310" stroke="#000" strokeWidth="1" />
                      <line x1="470" y1="345" x2="560" y2="345" stroke="#000" strokeWidth="1" strokeDasharray="5,5" />
                    </svg>
                  </div>
                </div>
                
                <p className="text-sm mb-4">
                  The ADA University Voting System employs a hybrid architecture that combines traditional web technologies with blockchain for secure voting. The system is divided into four main layers:
                </p>
                
                <ul className="list-disc pl-6 space-y-2 text-sm">
                  <li><span className="font-semibold">Client Layer:</span> React.js with TypeScript frontend providing separate interfaces for students and administrators, with integrated MetaMask for blockchain interactions.</li>
                  <li><span className="font-semibold">Server Layer:</span> Node.js/Express backend handling API requests, authentication, and serving as the bridge between frontend and both database and blockchain.</li>
                  <li><span className="font-semibold">Data Layer:</span> PostgreSQL database storing user accounts, election metadata, candidate information, and voting tokens.</li>
                  <li><span className="font-semibold">Blockchain Layer:</span> Ethereum Sepolia testnet providing immutable and transparent vote recording through smart contracts.</li>
                </ul>
                
                <h3 className="text-xl font-bold mt-6 mb-3">Key Design Principles</h3>
                <ul className="list-disc pl-6 space-y-2 text-sm">
                  <li><span className="font-semibold">Separation of Concerns:</span> Clear division between authentication, business logic, and vote recording.</li>
                  <li><span className="font-semibold">Hybrid Data Storage:</span> Traditional database for user management and application data, blockchain for immutable vote recording.</li>
                  <li><span className="font-semibold">Two-Layer Security:</span> Session-based authentication plus blockchain transaction signing.</li>
                  <li><span className="font-semibold">Fail-Safe Voting:</span> Transaction verification with automatic vote reset for failed blockchain transactions.</li>
                  <li><span className="font-semibold">Scalable Architecture:</span> Container-based deployment with horizontal scaling capabilities.</li>
                </ul>
              </Card>
            </TabsContent>
            
            <TabsContent value="frontend" className="space-y-6 mt-6">
              <Card className="p-6">
                <h2 className="text-2xl font-bold mb-4">Frontend Architecture</h2>
                
                <div className="rounded-md border bg-muted p-4 mb-6">
                  <pre className="text-xs whitespace-pre-wrap">
{`
Frontend Technologies:
├── React.js with TypeScript
├── TanStack Query (React Query) for data fetching
├── Shadcn UI components
├── Tailwind CSS for styling
├── Ethers.js for blockchain integration
└── Web3 provider abstraction
`}
                  </pre>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  <div>
                    <h3 className="text-lg font-bold mb-2">Component Structure</h3>
                    <p className="text-sm">
                      The frontend is organized into modular components with clear separation between UI elements, business logic, and blockchain interactions. Key component categories include:
                    </p>
                    <ul className="list-disc pl-6 space-y-1 text-sm mt-2">
                      <li>Page components (Admin/Student views)</li>
                      <li>Shared UI components</li>
                      <li>Blockchain interaction components</li>
                      <li>Form components with validation</li>
                      <li>Authentication components</li>
                    </ul>
                  </div>
                  
                  <div>
                    <h3 className="text-lg font-bold mb-2">State Management</h3>
                    <p className="text-sm">
                      State management employs React hooks and context API for local state, with TanStack Query for server state. This architecture provides:
                    </p>
                    <ul className="list-disc pl-6 space-y-1 text-sm mt-2">
                      <li>Automatic data refetching and caching</li>
                      <li>Optimistic updates for responsive UI</li>
                      <li>Global authentication state</li>
                      <li>Web3 connection state management</li>
                      <li>Form state with validation</li>
                    </ul>
                  </div>
                </div>
                
                <h3 className="text-lg font-bold mb-2">Web3 Integration</h3>
                <p className="text-sm mb-4">
                  The frontend integrates with blockchain through a custom Web3 service abstraction layer that:
                </p>
                <ul className="list-disc pl-6 space-y-1 text-sm">
                  <li>Manages MetaMask connection state</li>
                  <li>Handles network detection and switching</li>
                  <li>Provides optimized transaction parameters</li>
                  <li>Implements transaction receipt verification</li>
                  <li>Centralizes contract interaction methods</li>
                  <li>Manages nonce calculation for transactions</li>
                </ul>
                
                <h3 className="text-lg font-bold mt-6 mb-2">Routing Structure</h3>
                <div className="rounded-md border bg-muted p-4">
                  <pre className="text-xs whitespace-pre-wrap">
{`
Routes:
├── / (Home)
├── /auth (Login/Registration)
├── /admin-dashboard (Admin Dashboard)
├── /admin-candidates (Candidate Management)
├── /admin-tickets (Support Tickets)
├── /admin-architecture (System Architecture)
├── /dashboard (Student Dashboard)
├── /tickets-page (Student Tickets)
├── /results (Election Results)
└── /verify-vote (Vote Verification)
`}
                  </pre>
                </div>
              </Card>
            </TabsContent>
            
            <TabsContent value="backend" className="space-y-6 mt-6">
              <Card className="p-6">
                <h2 className="text-2xl font-bold mb-4">Backend Architecture</h2>
                
                <div className="rounded-md border bg-muted p-4 mb-6">
                  <pre className="text-xs whitespace-pre-wrap">
{`
Backend Technologies:
├── Node.js with Express
├── PostgreSQL with Drizzle ORM
├── Passport.js for authentication
├── Bcrypt for password hashing
├── CSRF protection middleware
└── Email service for notifications
`}
                  </pre>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  <div>
                    <h3 className="text-lg font-bold mb-2">API Structure</h3>
                    <p className="text-sm">
                      The backend implements a RESTful API following standard HTTP methods and status codes. Key API categories include:
                    </p>
                    <ul className="list-disc pl-6 space-y-1 text-sm mt-2">
                      <li>Authentication endpoints</li>
                      <li>User management</li>
                      <li>Election management</li>
                      <li>Candidate management</li>
                      <li>Voting token issuance and verification</li>
                      <li>Ticket management</li>
                    </ul>
                  </div>
                  
                  <div>
                    <h3 className="text-lg font-bold mb-2">Middleware Stack</h3>
                    <p className="text-sm">
                      Express middleware provides modular functionality for request processing:
                    </p>
                    <ul className="list-disc pl-6 space-y-1 text-sm mt-2">
                      <li>CORS handling</li>
                      <li>JSON body parsing</li>
                      <li>Session management</li>
                      <li>CSRF protection</li>
                      <li>Authentication verification</li>
                      <li>Role-based access control</li>
                      <li>Error handling</li>
                    </ul>
                  </div>
                </div>
                
                <h3 className="text-lg font-bold mb-2">Database Schema</h3>
                <div className="rounded-md border bg-muted p-4 mb-6">
                  <pre className="text-xs whitespace-pre-wrap">
{`
Database Schema:
├── users
│   ├── id (PK)
│   ├── email
│   ├── password (hashed)
│   ├── faculty
│   └── isAdmin
├── pendingUsers (for registration/password reset)
├── elections
│   ├── id (PK)
│   ├── name
│   ├── description
│   ├── startDate
│   ├── endDate
│   ├── status
│   └── blockchainId (references blockchain deployment)
├── candidates
│   ├── id (PK)
│   ├── fullName
│   ├── studentId
│   ├── faculty
│   └── status
├── electionCandidates (junction table)
├── votingTokens
│   ├── token (PK)
│   ├── userId (FK)
│   ├── electionId (FK)
│   ├── issued
│   └── used
└── tickets (for feedback system)
`}
                  </pre>
                </div>
                
                <h3 className="text-lg font-bold mb-2">Security Measures</h3>
                <p className="text-sm mb-4">
                  The backend implements multiple security layers:
                </p>
                <ul className="list-disc pl-6 space-y-1 text-sm">
                  <li>Password hashing with bcrypt (10 rounds)</li>
                  <li>Session-based authentication with secure cookies</li>
                  <li>CSRF token validation for state-changing operations</li>
                  <li>Input validation with Zod schemas</li>
                  <li>Parameterized queries to prevent SQL injection</li>
                  <li>One-time voting tokens linked to user accounts</li>
                  <li>Rate limiting for authentication attempts</li>
                </ul>
              </Card>
            </TabsContent>
            
            <TabsContent value="blockchain" className="space-y-6 mt-6">
              <Card className="p-6">
                <h2 className="text-2xl font-bold mb-4">ADA University Voting Blockchain Architecture</h2>
                
                <div className="rounded-md border bg-white p-6 mb-6 shadow-md">
                  <div className="system-architecture flex justify-center">
                    <svg width="900" height="650" viewBox="0 0 900 650" className="border rounded-lg bg-white shadow-inner">
                      {/* Header */}
                      <text x="450" y="35" fontSize="22" textAnchor="middle" fontWeight="bold" fill="#4c1d95">ADA University Voting System - System Architecture</text>
                      <line x1="200" y1="45" x2="700" y2="45" stroke="#8b5cf6" strokeWidth="2" />
                      <text x="450" y="65" fontSize="11" textAnchor="middle" fill="#64748b">A secure, transparent voting platform powered by Ethereum Sepolia blockchain technology</text>
                      
                      {/* System containers */}
                      <g>
                        {/* Frontend container */}
                        <rect x="50" y="80" width="800" height="120" rx="5" fill="#f0f9ff" stroke="#0ea5e9" strokeWidth="2" />
                        <text x="450" y="100" fontSize="16" textAnchor="middle" fontWeight="bold" fill="#0369a1">Frontend Layer</text>
                        
                        {/* Frontend components */}
                        <rect x="80" y="120" width="160" height="60" rx="3" fill="white" stroke="#0ea5e9" strokeWidth="1" />
                        <text x="160" y="140" fontSize="12" textAnchor="middle" fontWeight="bold" fill="#0369a1">Admin Portal</text>
                        <text x="160" y="160" fontSize="9" textAnchor="middle" fill="#0369a1">React + TypeScript</text>
                        <text x="160" y="172" fontSize="8" textAnchor="middle" fill="#64748b">Election & Candidate Management</text>
                        
                        <rect x="370" y="120" width="160" height="60" rx="3" fill="white" stroke="#0ea5e9" strokeWidth="1" />
                        <text x="450" y="140" fontSize="12" textAnchor="middle" fontWeight="bold" fill="#0369a1">Blockchain Interface</text>
                        <text x="450" y="160" fontSize="9" textAnchor="middle" fill="#0369a1">Ethers.js + Web3Provider</text>
                        <text x="450" y="172" fontSize="8" textAnchor="middle" fill="#64748b">Smart Contract Interaction</text>
                        
                        <rect x="660" y="120" width="160" height="60" rx="3" fill="white" stroke="#0ea5e9" strokeWidth="1" />
                        <text x="740" y="140" fontSize="12" textAnchor="middle" fontWeight="bold" fill="#0369a1">Student Portal</text>
                        <text x="740" y="160" fontSize="9" textAnchor="middle" fill="#0369a1">React + TypeScript</text>
                        <text x="740" y="172" fontSize="8" textAnchor="middle" fill="#64748b">Voting & Election Results</text>
                      </g>
                      
                      {/* User flows container */}
                      <g>
                        <rect x="50" y="210" width="800" height="220" rx="5" fill="#f5f3ff" stroke="#8b5cf6" strokeWidth="2" />
                        <text x="450" y="230" fontSize="16" textAnchor="middle" fontWeight="bold" fill="#6d28d9">User Workflows</text>
                        
                        {/* Left column - Admin Path */}
                        <rect x="80" y="250" width="330" height="160" rx="5" fill="#f8fafc" stroke="#e2e8f0" strokeWidth="2" />
                        <text x="245" y="270" fontSize="14" textAnchor="middle" fontWeight="bold" fill="#1e293b">Admin Flow</text>
                        
                        {/* Admin Steps */}
                        <g>
                          <rect x="100" y="290" width="70" height="30" rx="15" fill="#f8fafc" stroke="#8b5cf6" strokeWidth="2" />
                          <text x="135" y="310" fontSize="10" textAnchor="middle" fontWeight="bold">Create</text>
                          
                          <rect x="200" y="290" width="70" height="30" rx="15" fill="#f8fafc" stroke="#8b5cf6" strokeWidth="2" />
                          <text x="235" y="310" fontSize="10" textAnchor="middle" fontWeight="bold">Configure</text>
                          
                          <rect x="300" y="290" width="70" height="30" rx="15" fill="#f8fafc" stroke="#8b5cf6" strokeWidth="2" />
                          <text x="335" y="310" fontSize="10" textAnchor="middle" fontWeight="bold">Deploy</text>
                          
                          <rect x="100" y="360" width="70" height="30" rx="15" fill="#f8fafc" stroke="#8b5cf6" strokeWidth="2" />
                          <text x="135" y="380" fontSize="10" textAnchor="middle" fontWeight="bold">Activate</text>
                          
                          <rect x="200" y="360" width="70" height="30" rx="15" fill="#f8fafc" stroke="#8b5cf6" strokeWidth="2" />
                          <text x="235" y="380" fontSize="10" textAnchor="middle" fontWeight="bold">Monitor</text>
                          
                          <rect x="300" y="360" width="70" height="30" rx="15" fill="#f8fafc" stroke="#8b5cf6" strokeWidth="2" />
                          <text x="335" y="380" fontSize="10" textAnchor="middle" fontWeight="bold">Finalize</text>
                        </g>
                        
                        {/* Admin flow arrows */}
                        <line x1="170" y1="305" x2="200" y2="305" stroke="#8b5cf6" strokeWidth="1.5" />
                        <polygon points="195,302 200,305 195,308" fill="#8b5cf6" />
                        
                        <line x1="270" y1="305" x2="300" y2="305" stroke="#8b5cf6" strokeWidth="1.5" />
                        <polygon points="295,302 300,305 295,308" fill="#8b5cf6" />
                        
                        <path d="M 335,320 C 335,340 335,340 335,360" stroke="#8b5cf6" strokeWidth="1.5" fill="none" />
                        <polygon points="332,355 335,360 338,355" fill="#8b5cf6" />
                        
                        <line x1="300" y1="375" x2="270" y2="375" stroke="#8b5cf6" strokeWidth="1.5" />
                        <polygon points="275,372 270,375 275,378" fill="#8b5cf6" />
                        
                        <line x1="200" y1="375" x2="170" y2="375" stroke="#8b5cf6" strokeWidth="1.5" />
                        <polygon points="175,372 170,375 175,378" fill="#8b5cf6" />
                        
                        <path d="M 100,375 C 80,375 80,325 100,305" stroke="#8b5cf6" strokeWidth="1.5" fill="none" />
                        <polygon points="97,310 100,305 103,310" fill="#8b5cf6" />
                        
                        {/* Right column - Student Path */}
                        <rect x="490" y="250" width="330" height="160" rx="5" fill="#f8fafc" stroke="#e2e8f0" strokeWidth="2" />
                        <text x="655" y="270" fontSize="14" textAnchor="middle" fontWeight="bold" fill="#1e293b">Student Flow</text>
                        
                        {/* Student Steps */}
                        <g>
                          <rect x="510" y="290" width="70" height="30" rx="15" fill="#f8fafc" stroke="#3b82f6" strokeWidth="2" />
                          <text x="545" y="310" fontSize="10" textAnchor="middle" fontWeight="bold">Login</text>
                          
                          <rect x="610" y="290" width="70" height="30" rx="15" fill="#f8fafc" stroke="#3b82f6" strokeWidth="2" />
                          <text x="645" y="310" fontSize="10" textAnchor="middle" fontWeight="bold">Connect</text>
                          
                          <rect x="710" y="290" width="70" height="30" rx="15" fill="#f8fafc" stroke="#3b82f6" strokeWidth="2" />
                          <text x="745" y="310" fontSize="10" textAnchor="middle" fontWeight="bold">Browse</text>
                          
                          <rect x="510" y="360" width="70" height="30" rx="15" fill="#f8fafc" stroke="#3b82f6" strokeWidth="2" />
                          <text x="545" y="380" fontSize="10" textAnchor="middle" fontWeight="bold">Confirm</text>
                          
                          <rect x="610" y="360" width="70" height="30" rx="15" fill="#f8fafc" stroke="#3b82f6" strokeWidth="2" />
                          <text x="645" y="380" fontSize="10" textAnchor="middle" fontWeight="bold">Sign Tx</text>
                          
                          <rect x="710" y="360" width="70" height="30" rx="15" fill="#f8fafc" stroke="#3b82f6" strokeWidth="2" />
                          <text x="745" y="380" fontSize="10" textAnchor="middle" fontWeight="bold">Vote</text>
                          
                          {/* MetaMask icon */}
                          <image href="data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIzMiIgaGVpZ2h0PSIzMiIgdmlld0JveD0iMCAwIDMyIDMyIj48cGF0aCBmaWxsLXJ1bGU9ImV2ZW5vZGQiIGNsaXAtcnVsZT0iZXZlbm9kZCIgZD0iTTE2IDMyQzI0Ljg0IDMyIDMyIDI0Ljg0IDMyIDE2QzMyIDcuMTYgMjQuODQgMCAxNiAwQzcuMTYgMCAwIDcuMTYgMCAxNkMwIDI0Ljg0IDcuMTYgMzIgMTYgMzJaIiBmaWxsPSIjRjY4NTFDII8+PHBhdGggZmlsbC1ydWxlPSJldmVub2RkIiBjbGlwLXJ1bGU9ImV2ZW5vZGQiIGQ9Ik0yNCA5Ljk1NjU0TDE3LjIgNkwxNi4xNCA5LjEzMDc3TDE0LjggMTIuNzc3NUg5LjRWMTkuNjA0N0wxNi42IDE5Ljk3ODVWMjQuOUwyMC43NiAyNi43Nzg1TDI1LjUyIDIwLjYwNDdMMjQgOS45NTY1NFoiIGZpbGw9IndoaXRlIi8+PHBhdGggZmlsbC1ydWxlPSJldmVub2RkIiBjbGlwLXJ1bGU9ImV2ZW5vZGQiIGQ9Ik04IDE5LjYwNDdWMTIuNzc3NUg2LjRWMjYuNEwxNS4yIDI0LjUyOFYyMC42MDQ3SDkuMkw4IDE5LjYwNDdaIiBmaWxsPSJ3aGl0ZSIvPjwvc3ZnPg==" 
                          x="620" y="320" width="12" height="12" />
                        </g>
                        
                        {/* Student flow arrows */}
                        <line x1="580" y1="305" x2="610" y2="305" stroke="#3b82f6" strokeWidth="1.5" />
                        <polygon points="605,302 610,305 605,308" fill="#3b82f6" />
                        
                        <line x1="680" y1="305" x2="710" y2="305" stroke="#3b82f6" strokeWidth="1.5" />
                        <polygon points="705,302 710,305 705,308" fill="#3b82f6" />
                        
                        <path d="M 745,320 C 745,340 745,340 745,360" stroke="#3b82f6" strokeWidth="1.5" fill="none" />
                        <polygon points="742,355 745,360 748,355" fill="#3b82f6" />
                        
                        <line x1="710" y1="375" x2="680" y2="375" stroke="#3b82f6" strokeWidth="1.5" />
                        <polygon points="685,372 680,375 685,378" fill="#3b82f6" />
                        
                        <line x1="610" y1="375" x2="580" y2="375" stroke="#3b82f6" strokeWidth="1.5" />
                        <polygon points="585,372 580,375 585,378" fill="#3b82f6" />
                        
                        <path d="M 510,375 C 490,375 490,325 510,305" stroke="#3b82f6" strokeWidth="1.5" fill="none" />
                        <polygon points="507,310 510,305 513,310" fill="#3b82f6" />
                      </g>
                      
                      {/* Blockchain & Backend container */}
                      <g>
                        <rect x="50" y="440" width="800" height="190" rx="5" fill="#fdf2f8" stroke="#db2777" strokeWidth="2" />
                        <text x="450" y="460" fontSize="16" textAnchor="middle" fontWeight="bold" fill="#be185d">Infrastructure Layer</text>
                        
                        {/* Blockchain section */}
                        <rect x="80" y="480" width="340" height="130" rx="5" fill="#ede9fe" stroke="#8b5cf6" strokeWidth="2" />
                        <text x="250" y="500" fontSize="14" textAnchor="middle" fontWeight="bold" fill="#6d28d9">Ethereum Blockchain (Sepolia Testnet)</text>
                        
                        <rect x="100" y="520" width="140" height="70" rx="3" fill="white" stroke="#8b5cf6" strokeWidth="1.5" />
                        <text x="170" y="540" fontSize="12" textAnchor="middle" fontWeight="bold" fill="#6d28d9">Smart Contract</text>
                        <text x="170" y="555" fontSize="9" textAnchor="middle" fill="#6d28d9">0xb74F07812B45dBEc4eC3E577194F6a798a060e5D</text>
                        <text x="170" y="570" fontSize="9" textAnchor="middle" fill="#6d28d9">Voting Logic & Election Data</text>
                        
                        <rect x="260" y="520" width="140" height="30" rx="3" fill="white" stroke="#8b5cf6" strokeWidth="1" />
                        <text x="330" y="540" fontSize="10" textAnchor="middle" fill="#6d28d9">Transaction Settings</text>
                        
                        <rect x="260" y="560" width="65" height="30" rx="3" fill="white" stroke="#8b5cf6" strokeWidth="1" />
                        <text x="292" y="575" fontSize="8" textAnchor="middle" fill="#6d28d9">Gas: 500,000</text>
                        
                        <rect x="335" y="560" width="65" height="30" rx="3" fill="white" stroke="#8b5cf6" strokeWidth="1" />
                        <text x="367" y="575" fontSize="8" textAnchor="middle" fill="#6d28d9">Price: 1.5 Gwei</text>
                        
                        {/* Backend section */}
                        <rect x="480" y="480" width="340" height="130" rx="5" fill="#dbeafe" stroke="#3b82f6" strokeWidth="2" />
                        <text x="650" y="500" fontSize="14" textAnchor="middle" fontWeight="bold" fill="#1e40af">Backend Infrastructure</text>
                        
                        <rect x="500" y="520" width="140" height="70" rx="3" fill="white" stroke="#3b82f6" strokeWidth="1.5" />
                        <text x="570" y="540" fontSize="12" textAnchor="middle" fontWeight="bold" fill="#1e40af">PostgreSQL Database</text>
                        <text x="570" y="555" fontSize="9" textAnchor="middle" fill="#1e40af">User Authentication</text>
                        <text x="570" y="570" fontSize="9" textAnchor="middle" fill="#1e40af">Election & Candidate Data</text>
                        
                        <rect x="660" y="520" width="140" height="70" rx="3" fill="white" stroke="#3b82f6" strokeWidth="1.5" />
                        <text x="730" y="540" fontSize="12" textAnchor="middle" fontWeight="bold" fill="#1e40af">Node.js Server</text>
                        <text x="730" y="555" fontSize="9" textAnchor="middle" fill="#1e40af">Express.js API Routes</text>
                        <text x="730" y="570" fontSize="9" textAnchor="middle" fill="#1e40af">Authentication & Token System</text>
                      </g>
                      
                      {/* Data flow arrows */}
                      <g>
                        {/* Frontend to Blockchain */}
                        <path d="M 450,180 L 450,250 L 245,250" stroke="#8b5cf6" strokeWidth="1.5" strokeDasharray="5,3" fill="none" />
                        <polygon points="250,247 245,250 250,253" fill="#8b5cf6" />
                        <text x="435" y="215" fontSize="9" textAnchor="end" fill="#6d28d9">Admin Operations</text>
                        
                        {/* Frontend to Student */}
                        <path d="M 450,180 L 450,250 L 655,250" stroke="#3b82f6" strokeWidth="1.5" strokeDasharray="5,3" fill="none" />
                        <polygon points="650,247 655,250 650,253" fill="#3b82f6" />
                        <text x="465" y="215" fontSize="9" textAnchor="start" fill="#1e40af">Student Access</text>
                        
                        {/* Admin to Blockchain */}
                        <path d="M 245,410 L 245,480" stroke="#8b5cf6" strokeWidth="1.5" fill="none" />
                        <polygon points="242,475 245,480 248,475" fill="#8b5cf6" />
                        <text x="255" y="445" fontSize="9" textAnchor="start" fill="#6d28d9">Deploy & Manage</text>
                        
                        {/* Student to Blockchain */}
                        <path d="M 655,410 L 170,480" stroke="#3b82f6" strokeWidth="1.5" fill="none" />
                        <polygon points="173,477 170,480 167,477" fill="#3b82f6" />
                        <text x="400" y="435" fontSize="9" textAnchor="middle" fill="#1e40af">Cast Votes</text>
                        
                        {/* Student to Backend */}
                        <path d="M 655,410 L 655,480" stroke="#3b82f6" strokeWidth="1.5" fill="none" />
                        <polygon points="652,475 655,480 658,475" fill="#3b82f6" />
                        <text x="665" y="445" fontSize="9" textAnchor="start" fill="#1e40af">Authentication</text>
                        
                        {/* Backend to Blockchain */}
                        <path d="M 500,555 L 240,555" stroke="#3b82f6" strokeWidth="1.5" strokeDasharray="3,2" fill="none" />
                        <polygon points="245,552 240,555 245,558" fill="#3b82f6" />
                        <text x="370" y="545" fontSize="9" textAnchor="middle" fill="#1e40af">Verify Transactions</text>
                      </g>
                      
                      {/* Legend */}
                      <g>
                        <rect x="50" y="635" width="800" height="10" rx="0" fill="#f1f5f9" stroke="none" />
                        <text x="450" y="642" fontSize="8" textAnchor="middle" fill="#64748b">The system ensures vote integrity by storing election results exclusively on the blockchain, while using the database only for user authentication and election metadata</text>
                      </g>
                    </svg>
                  </div>
                </div>
                
                <h3 className="text-2xl font-bold mt-8 mb-4 text-center">ADA Voting System Architecture</h3>
                <p className="text-sm mb-6 text-center">
                  Our implementation leverages Ethereum Sepolia testnet as a secure, transparent voting layer with strict verification protocols to ensure tamper-proof elections for ADA University.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                  <div className="border rounded-lg p-6 bg-white shadow-sm">
                    <h3 className="text-lg font-bold mb-4 text-purple-900">Smart Contract Components</h3>
                    <p className="text-sm mb-3">
                      The core voting logic is implemented in a Solidity smart contract deployed on the Ethereum Sepolia testnet with these key components:
                    </p>
                    <ul className="list-disc pl-6 space-y-2 text-sm">
                      <li><span className="font-semibold">Distributed Ledger:</span> Immutable recording of all vote transactions across multiple nodes</li>
                      <li><span className="font-semibold">Election Registry:</span> On-chain storage of election parameters, time constraints, and status flags</li>
                      <li><span className="font-semibold">Candidate Registry:</span> Decentralized storage of candidate information with unique blockchain identifiers</li>
                      <li><span className="font-semibold">Vote Aggregation:</span> Cryptographically secure tallying mechanism with zero-knowledge proofs</li>
                      <li><span className="font-semibold">Result Finalization:</span> Consensus-based certification of election outcomes</li>
                      <li><span className="font-semibold">Access Control Layer:</span> Role-based permissions for administrative operations</li>
                    </ul>
                  </div>
                  
                  <div className="border rounded-lg p-6 bg-white shadow-sm">
                    <h3 className="text-lg font-bold mb-4 text-purple-900">Network Topology</h3>
                    <p className="text-sm mb-3">
                      The ADA University Voting System network architecture implements a multi-layered approach:
                    </p>
                    <ul className="list-disc pl-6 space-y-2 text-sm">
                      <li><span className="font-semibold">Relay Nodes:</span> Dedicated blockchain nodes that facilitate transaction propagation and verification</li>
                      <li><span className="font-semibold">Consensus Mechanism:</span> Ethereum's Proof-of-Stake with validator attestations for secure transaction validation</li>
                      <li><span className="font-semibold">P2P Network:</span> Decentralized peer connections ensure no single point of failure</li>
                      <li><span className="font-semibold">Cross-Validator Communication:</span> Multiple validator nodes cross-check transaction validity</li>
                      <li><span className="font-semibold">Secure Channels:</span> Encrypted communication paths between voters and blockchain</li>
                    </ul>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                  <div className="border rounded-lg p-6 bg-white shadow-sm">
                    <h3 className="text-lg font-bold mb-4 text-purple-900">Frontend Integration</h3>
                    <p className="text-sm mb-3">
                      The system integrates with blockchain through a specialized tech stack:
                    </p>
                    <ul className="list-disc pl-6 space-y-2 text-sm">
                      <li><span className="font-semibold">MetaMask Connector:</span> Web3 wallet integration with specialized user interface adaptations</li>
                      <li><span className="font-semibold">Ethers.js Library:</span> Advanced contract interaction with optimized ABI encoding</li>
                      <li><span className="font-semibold">BrowserProvider:</span> Direct wallet communication with custom event handling</li>
                      <li><span className="font-semibold">Transaction Lifecycle Manager:</span> Comprehensive tracking from submission to confirmation</li>
                      <li><span className="font-semibold">Gas Optimization Engine:</span> Dynamic fee calculation with EIP-1559 support and fallback mechanisms</li>
                      <li><span className="font-semibold">Receipt Verification System:</span> Multi-level validation of transaction success</li>
                    </ul>
                  </div>
                  
                  <div className="border rounded-lg p-6 bg-white shadow-sm">
                    <h3 className="text-lg font-bold mb-4 text-purple-900">Transaction Flow</h3>
                    <p className="text-sm mb-3">
                      The ADA University Voting System transaction lifecycle follows a precise sequence:
                    </p>
                    <ol className="list-decimal pl-6 space-y-2 text-sm">
                      <li><span className="font-semibold">Initialization:</span> Poll creator deploys election parameters to the contract</li>
                      <li><span className="font-semibold">Candidate Registration:</span> Authorized addition of candidates with immutable identifiers</li>
                      <li><span className="font-semibold">Activation:</span> Time-triggered state change to open voting period</li>
                      <li><span className="font-semibold">Vote Submission:</span> Signed transaction with encrypted vote data and nonce validation</li>
                      <li><span className="font-semibold">Block Validation:</span> Consensus verification by relay nodes</li>
                      <li><span className="font-semibold">Receipt Generation:</span> Cryptographic proof of vote inclusion</li>
                      <li><span className="font-semibold">Result Aggregation:</span> Secure tallying with zero-knowledge verification</li>
                      <li><span className="font-semibold">Finalization:</span> Time-triggered or admin-initiated result certification</li>
                    </ol>
                  </div>
                </div>
                
                <h3 className="text-lg font-bold mb-4 text-purple-900">Smart Contract Interface</h3>
                <div className="rounded-md border bg-slate-50 p-4 mb-6 shadow-inner">
                  <pre className="text-xs whitespace-pre-wrap">
{`
// ADA University Voting System Smart Contract Interface (Solidity v0.8.17)

// Data Structures
struct Election {
    uint256 id;                // Election unique identifier
    string name;               // Election title
    uint256 startTime;         // Unix timestamp for election start
    uint256 endTime;           // Unix timestamp for election end
    ElectionStatus status;     // Current state of election
    mapping(uint256 => string) candidateNames;  // Candidate name lookup
    mapping(uint256 => uint256) votes;          // Vote tally by candidate
    uint256[] candidateIds;    // List of participating candidates
    bool resultsFinalized;     // Flag for result certification
}

enum ElectionStatus { Pending, Active, Completed, Canceled }

// Administrative Functions
function deployElection(uint256 id, string memory name, uint startTime, uint endTime) public onlyOwner
function addCandidate(uint256 electionId, uint256 candidateId, string memory name) public onlyOwner
function startElection(uint256 electionId) public onlyOwner
function stopElection(uint256 electionId) public onlyOwner
function finalizeResults(uint256 electionId) public onlyOwner

// Voting Functions
function vote(uint256 electionId, uint256 candidateId, uint256 nonce) public
function getResults(uint256 electionId) public view returns (uint256[] memory)
function getCandidateVotes(uint256 electionId, uint256 candidateId) public view returns (uint256)
function getElectionStatus(uint256 electionId) public view returns (ElectionStatus)
function verifyVote(uint256 electionId, uint256 candidateId, address voter) public view returns (bool)

// Events
event ElectionDeployed(uint256 indexed electionId, string name, uint256 startTime, uint256 endTime);
event CandidateAdded(uint256 indexed electionId, uint256 indexed candidateId, string name);
event ElectionStatusChanged(uint256 indexed electionId, ElectionStatus status);
event VoteCast(uint256 indexed electionId, uint256 indexed candidateId, address indexed voter);
event ResultsFinalized(uint256 indexed electionId, uint256[] finalResults);
`}
                  </pre>
                </div>
                
                <h3 className="text-lg font-bold mb-4 text-purple-900">Security Architecture</h3>
                <div className="border rounded-lg p-6 bg-white shadow-sm mb-6">
                  <p className="text-sm mb-4">
                    The ADA University Voting System security model implements multiple defense layers to ensure vote integrity:
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <ul className="list-disc pl-6 space-y-2 text-sm">
                      <li><span className="font-semibold">Multi-Factor Authentication:</span> Database token validation plus blockchain transaction signing</li>
                      <li><span className="font-semibold">Transaction Verification:</span> Receipt validation with automatic vote reset for failed transactions</li>
                      <li><span className="font-semibold">Gas Attack Prevention:</span> Optimized transaction parameters with dynamic fee adjustments</li>
                      <li><span className="font-semibold">Sybil Attack Resistance:</span> One-time tokens linked to verified identities</li>
                    </ul>
                    <ul className="list-disc pl-6 space-y-2 text-sm">
                      <li><span className="font-semibold">Role-Based Permissions:</span> Strict access control for administrative operations</li>
                      <li><span className="font-semibold">Time-Window Protection:</span> Voting only permitted during election active status</li>
                      <li><span className="font-semibold">Public Auditability:</span> Transparent and verifiable results accessible to all</li>
                      <li><span className="font-semibold">Distributed Trust:</span> No single party controls the voting infrastructure</li>
                    </ul>
                  </div>
                </div>
                
                <div className="bg-purple-50 border-l-4 border-purple-500 p-4 rounded-md mb-6">
                  <h4 className="text-md font-bold mb-2 text-purple-900">Current Deployment</h4>
                  <p className="text-sm"><span className="font-semibold">Contract Address:</span> 0xb74F07812B45dBEc4eC3E577194F6a798a060e5D</p>
                  <p className="text-sm"><span className="font-semibold">Network:</span> Polygon Amoy Testnet</p>
                  <p className="text-sm"><span className="font-semibold">Compiler Version:</span> Solidity 0.8.17</p>
                  <p className="text-sm"><span className="font-semibold">Optimization:</span> 200 runs</p>
                </div>
              </Card>
            </TabsContent>
            
            <TabsContent value="deployment" className="space-y-6 mt-6">
              <Card className="p-6">
                <h2 className="text-2xl font-bold mb-4">Deployment Architecture</h2>
                
                <div className="rounded-md border bg-muted p-6 mb-6">
                  <div className="deployment-diagram flex justify-center">
                    <svg width="700" height="400" viewBox="0 0 700 400" className="border rounded-lg bg-white">
                      {/* Cloud boundary */}
                      <rect x="50" y="30" width="600" height="340" rx="10" fill="#f9fafb" stroke="#d1d5db" strokeWidth="2" strokeDasharray="5,5" />
                      <text x="350" y="55" fontSize="16" textAnchor="middle" fontWeight="bold">DigitalOcean Cloud</text>
                      
                      {/* Load Balancer */}
                      <rect x="300" y="80" width="120" height="50" rx="5" fill="#dbeafe" stroke="#3b82f6" strokeWidth="2" />
                      <text x="360" y="110" fontSize="12" textAnchor="middle">Load Balancer</text>
                      
                      {/* App containers */}
                      <rect x="160" y="170" width="120" height="80" rx="5" fill="#d1fae5" stroke="#10b981" strokeWidth="2" />
                      <text x="220" y="195" fontSize="12" textAnchor="middle">App Container</text>
                      <text x="220" y="215" fontSize="10" textAnchor="middle">Node.js + React</text>
                      <text x="220" y="230" fontSize="10" textAnchor="middle">Instance 1</text>
                      
                      <rect x="300" y="170" width="120" height="80" rx="5" fill="#d1fae5" stroke="#10b981" strokeWidth="2" />
                      <text x="360" y="195" fontSize="12" textAnchor="middle">App Container</text>
                      <text x="360" y="215" fontSize="10" textAnchor="middle">Node.js + React</text>
                      <text x="360" y="230" fontSize="10" textAnchor="middle">Instance 2</text>
                      
                      <rect x="440" y="170" width="120" height="80" rx="5" fill="#d1fae5" stroke="#10b981" strokeWidth="2" />
                      <text x="500" y="195" fontSize="12" textAnchor="middle">App Container</text>
                      <text x="500" y="215" fontSize="10" textAnchor="middle">Node.js + React</text>
                      <text x="500" y="230" fontSize="10" textAnchor="middle">Instance N</text>
                      
                      {/* Database */}
                      <rect x="160" y="290" width="120" height="60" rx="5" fill="#fee2e2" stroke="#ef4444" strokeWidth="2" />
                      <text x="220" y="320" fontSize="12" textAnchor="middle">PostgreSQL</text>
                      <text x="220" y="335" fontSize="10" textAnchor="middle">Managed Database</text>
                      
                      {/* Redis */}
                      <rect x="300" y="290" width="120" height="60" rx="5" fill="#ede9fe" stroke="#8b5cf6" strokeWidth="2" />
                      <text x="360" y="320" fontSize="12" textAnchor="middle">Redis</text>
                      <text x="360" y="335" fontSize="10" textAnchor="middle">Session Storage</text>
                      
                      {/* External Services */}
                      <rect x="440" y="290" width="120" height="60" rx="5" fill="#fef3c7" stroke="#f59e0b" strokeWidth="2" />
                      <text x="500" y="320" fontSize="12" textAnchor="middle">Polygon Amoy</text>
                      <text x="500" y="335" fontSize="10" textAnchor="middle">Blockchain Network</text>
                      
                      {/* Lines */}
                      <line x1="360" y1="130" x2="220" y2="170" stroke="#000" strokeWidth="1" />
                      <line x1="360" y1="130" x2="360" y2="170" stroke="#000" strokeWidth="1" />
                      <line x1="360" y1="130" x2="500" y2="170" stroke="#000" strokeWidth="1" />
                      
                      <line x1="220" y1="250" x2="220" y2="290" stroke="#000" strokeWidth="1" />
                      <line x1="360" y1="250" x2="360" y2="290" stroke="#000" strokeWidth="1" />
                      <line x1="500" y1="250" x2="500" y2="290" stroke="#000" strokeWidth="1" />
                      
                      <line x1="220" y1="250" x2="360" y2="290" stroke="#000" strokeWidth="1" strokeDasharray="5,5" />
                      <line x1="360" y1="250" x2="220" y2="290" stroke="#000" strokeWidth="1" strokeDasharray="5,5" />
                      <line x1="500" y1="250" x2="500" y2="290" stroke="#000" strokeWidth="1" strokeDasharray="5,5" />
                    </svg>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  <div>
                    <h3 className="text-lg font-bold mb-2">Deployment Strategy</h3>
                    <p className="text-sm">
                      The system is deployed using Docker containers on DigitalOcean with the following components:
                    </p>
                    <ul className="list-disc pl-6 space-y-1 text-sm mt-2">
                      <li>Load-balanced app containers for horizontal scaling</li>
                      <li>Managed PostgreSQL database for reliability</li>
                      <li>Redis for distributed session management</li>
                      <li>External connection to Polygon Amoy testnet</li>
                      <li>Automated CI/CD pipeline for continuous deployment</li>
                    </ul>
                  </div>
                  
                  <div>
                    <h3 className="text-lg font-bold mb-2">Scalability Features</h3>
                    <p className="text-sm">
                      The architecture is designed for easy scaling:
                    </p>
                    <ul className="list-disc pl-6 space-y-1 text-sm mt-2">
                      <li>Stateless app containers allow horizontal scaling</li>
                      <li>Session sharing via Redis enables load balancing</li>
                      <li>Managed database with automatic scaling</li>
                      <li>CDN integration for static asset delivery</li>
                      <li>Auto-scaling based on CPU/memory utilization</li>
                    </ul>
                  </div>
                </div>
                
                <h3 className="text-lg font-bold mb-2">DevOps Pipeline</h3>
                <div className="rounded-md border bg-muted p-4 mb-6">
                  <pre className="text-xs whitespace-pre-wrap">
{`
DevOps Pipeline:
├── Code pushed to GitHub repository
├── GitHub Actions CI/CD pipeline triggered
│   ├── Run tests
│   ├── Build Docker image
│   ├── Push to container registry
│   └── Deploy to DigitalOcean App Platform
├── Blue/Green deployment strategy
│   ├── New version deployed alongside existing
│   ├── Health checks verify new deployment
│   └── Traffic gradually shifted to new version
└── Monitoring and alerting
    ├── Application performance metrics
    ├── Error rate monitoring
    ├── Database performance tracking
    └── Blockchain transaction monitoring
`}
                  </pre>
                </div>
                
                <h3 className="text-lg font-bold mb-2">Infrastructure Requirements</h3>
                <p className="text-sm mb-4">
                  Recommended infrastructure specifications for production:
                </p>
                <ul className="list-disc pl-6 space-y-1 text-sm">
                  <li><span className="font-semibold">App Containers:</span> 3+ instances, 2 vCPUs, 4GB RAM each</li>
                  <li><span className="font-semibold">Database:</span> Managed PostgreSQL, 2 vCPUs, 4GB RAM, HA configuration</li>
                  <li><span className="font-semibold">Redis:</span> Managed Redis instance, 1GB RAM</li>
                  <li><span className="font-semibold">Load Balancer:</span> DigitalOcean Load Balancer with SSL termination</li>
                  <li><span className="font-semibold">Storage:</span> Block storage for persistent data</li>
                  <li><span className="font-semibold">Blockchain:</span> External connection to Polygon Amoy testnet</li>
                  <li><span className="font-semibold">Backup:</span> Automated daily database backups</li>
                </ul>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}