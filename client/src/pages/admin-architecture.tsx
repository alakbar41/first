import React from 'react';
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { AdminSidebar } from "@/components/admin/admin-sidebar";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { Loader2 } from "lucide-react";

const ArchitectureView: React.FC = () => {
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
                      <text x="630" y="355" textAnchor="middle" fontSize="12">Polygon Amoy</text>
                      
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
                  <li><span className="font-semibold">Blockchain Layer:</span> Polygon Amoy testnet providing immutable and transparent vote recording through smart contracts.</li>
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
                <h2 className="text-2xl font-bold mb-4">BlockVOTE Blockchain Architecture</h2>
                
                <div className="rounded-md border bg-muted p-6 mb-6">
                  <div className="blockchain-diagram flex justify-center">
                    <svg width="800" height="600" viewBox="0 0 800 600" className="border rounded-lg bg-white">
                      {/* Background cloud */}
                      <ellipse cx="400" cy="350" rx="320" ry="180" fill="#dbeafe" stroke="#93c5fd" strokeWidth="2" />
                      
                      {/* Top section - Poll Creation */}
                      <rect x="50" y="50" width="150" height="120" rx="5" fill="#fff" stroke="#000" strokeWidth="2" />
                      <text x="125" y="90" fontSize="14" textAnchor="middle" fontWeight="bold">Poll Creation</text>
                      <text x="125" y="110" fontSize="10" textAnchor="middle">Admin Interface</text>
                      
                      {/* Admin figure */}
                      <circle cx="40" cy="110" r="15" fill="#3b82f6" />
                      <rect x="32" y="125" width="16" height="30" fill="#3b82f6" />
                      <rect x="20" y="125" width="12" height="25" fill="#3b82f6" />
                      <rect x="48" y="125" width="12" height="25" fill="#3b82f6" />
                      <rect x="32" y="155" width="8" height="25" fill="#3b82f6" />
                      <rect x="40" y="155" width="8" height="25" fill="#3b82f6" />
                      <text x="40" y="195" fontSize="10" textAnchor="middle">Poll Creator</text>
                      
                      {/* Middle section - BlockVOTE Contract Handler */}
                      <rect x="325" y="50" width="150" height="120" rx="5" fill="#fff" stroke="#000" strokeWidth="2" />
                      <text x="400" y="85" fontSize="14" textAnchor="middle" fontWeight="bold">BlockVOTE</text>
                      <text x="400" y="105" fontSize="14" textAnchor="middle" fontWeight="bold">Contract Handler</text>
                      <text x="400" y="125" fontSize="10" textAnchor="middle">Smart Contract Interface</text>
                      
                      {/* Result Announcement */}
                      <rect x="600" y="50" width="150" height="120" rx="5" fill="#fff" stroke="#000" strokeWidth="2" />
                      <rect x="625" y="75" width="100" height="70" rx="3" fill="#f5f5f5" stroke="#d1d5db" strokeWidth="1" />
                      <rect x="645" y="155" width="60" height="10" rx="2" fill="#d1d5db" />
                      <text x="675" y="185" fontSize="14" textAnchor="middle" fontWeight="bold">Result</text>
                      <text x="675" y="200" fontSize="14" textAnchor="middle" fontWeight="bold">Announcement</text>
                      
                      {/* Central contract in cloud */}
                      <rect x="300" y="275" width="200" height="60" rx="5" fill="#fff" stroke="#000" strokeWidth="2" />
                      <text x="400" y="310" fontSize="14" textAnchor="middle" fontWeight="bold">BlockVOTE Contract</text>
                      
                      {/* Relay nodes */}
                      <rect x="120" y="250" width="40" height="60" fill="#f97316" stroke="#000" strokeWidth="1" />
                      <rect x="120" y="240" width="40" height="10" fill="#f97316" stroke="#000" strokeWidth="1" />
                      <circle cx="130" cy="245" r="2" fill="#000" />
                      <circle cx="150" cy="245" r="2" fill="#000" />
                      <text x="140" y="325" fontSize="10" textAnchor="middle" fontWeight="bold">Blockchain</text>
                      <text x="140" y="335" fontSize="10" textAnchor="middle" fontWeight="bold">Relay Node</text>
                      
                      <rect x="640" y="250" width="40" height="60" fill="#f97316" stroke="#000" strokeWidth="1" />
                      <rect x="640" y="240" width="40" height="10" fill="#f97316" stroke="#000" strokeWidth="1" />
                      <circle cx="650" cy="245" r="2" fill="#000" />
                      <circle cx="670" cy="245" r="2" fill="#000" />
                      <text x="660" y="325" fontSize="10" textAnchor="middle" fontWeight="bold">Blockchain</text>
                      <text x="660" y="335" fontSize="10" textAnchor="middle" fontWeight="bold">Relay Node</text>
                      
                      <rect x="120" y="440" width="40" height="60" fill="#f97316" stroke="#000" strokeWidth="1" />
                      <rect x="120" y="430" width="40" height="10" fill="#f97316" stroke="#000" strokeWidth="1" />
                      <circle cx="130" cy="435" r="2" fill="#000" />
                      <circle cx="150" cy="435" r="2" fill="#000" />
                      <text x="140" y="515" fontSize="10" textAnchor="middle" fontWeight="bold">Blockchain</text>
                      <text x="140" y="525" fontSize="10" textAnchor="middle" fontWeight="bold">Relay Node</text>
                      
                      <rect x="640" y="440" width="40" height="60" fill="#f97316" stroke="#000" strokeWidth="1" />
                      <rect x="640" y="430" width="40" height="10" fill="#f97316" stroke="#000" strokeWidth="1" />
                      <circle cx="650" cy="435" r="2" fill="#000" />
                      <circle cx="670" cy="435" r="2" fill="#000" />
                      <text x="660" y="515" fontSize="10" textAnchor="middle" fontWeight="bold">Blockchain</text>
                      <text x="660" y="525" fontSize="10" textAnchor="middle" fontWeight="bold">Relay Node</text>
                      
                      {/* Vote boxes */}
                      <rect x="180" y="375" width="80" height="40" rx="3" fill="#fff" stroke="#000" strokeWidth="1" />
                      <text x="220" y="400" fontSize="12" textAnchor="middle" fontWeight="bold">Vote</text>
                      
                      <rect x="280" y="375" width="80" height="40" rx="3" fill="#fff" stroke="#000" strokeWidth="1" />
                      <text x="320" y="400" fontSize="12" textAnchor="middle" fontWeight="bold">Vote</text>
                      
                      <rect x="380" y="375" width="80" height="40" rx="3" fill="#fff" stroke="#000" strokeWidth="1" />
                      <text x="420" y="400" fontSize="12" textAnchor="middle" fontWeight="bold">Vote</text>
                      
                      <rect x="480" y="375" width="80" height="40" rx="3" fill="#fff" stroke="#000" strokeWidth="1" />
                      <text x="520" y="400" fontSize="12" textAnchor="middle" fontWeight="bold">Vote</text>
                      
                      <rect x="580" y="375" width="80" height="40" rx="3" fill="#fff" stroke="#000" strokeWidth="1" />
                      <text x="620" y="400" fontSize="12" textAnchor="middle" fontWeight="bold">Vote</text>
                      
                      {/* Voters */}
                      <circle cx="200" cy="550" r="15" fill="#fff" stroke="#000" strokeWidth="1" />
                      <rect x="192" y="565" width="16" height="20" fill="#fff" stroke="#000" strokeWidth="1" />
                      <text x="200" y="600" fontSize="10" textAnchor="middle">Voter</text>
                      
                      <circle cx="300" cy="550" r="15" fill="#fff" stroke="#000" strokeWidth="1" />
                      <rect x="292" y="565" width="16" height="20" fill="#fff" stroke="#000" strokeWidth="1" />
                      <text x="300" y="600" fontSize="10" textAnchor="middle">Voter</text>
                      
                      <circle cx="400" cy="550" r="15" fill="#fff" stroke="#000" strokeWidth="1" />
                      <rect x="392" y="565" width="16" height="20" fill="#fff" stroke="#000" strokeWidth="1" />
                      <text x="400" y="600" fontSize="10" textAnchor="middle">Voter</text>
                      
                      <circle cx="500" cy="550" r="15" fill="#fff" stroke="#000" strokeWidth="1" />
                      <rect x="492" y="565" width="16" height="20" fill="#fff" stroke="#000" strokeWidth="1" />
                      <text x="500" y="600" fontSize="10" textAnchor="middle">Voter</text>
                      
                      {/* Voter computers */}
                      <rect x="175" y="525" width="50" height="30" rx="2" fill="#f5f5f5" stroke="#000" strokeWidth="1" />
                      <rect x="185" y="555" width="30" height="5" rx="1" fill="#d1d5db" />
                      
                      <rect x="275" y="525" width="50" height="30" rx="2" fill="#f5f5f5" stroke="#000" strokeWidth="1" />
                      <rect x="285" y="555" width="30" height="5" rx="1" fill="#d1d5db" />
                      
                      <rect x="375" y="525" width="50" height="30" rx="2" fill="#f5f5f5" stroke="#000" strokeWidth="1" />
                      <rect x="385" y="555" width="30" height="5" rx="1" fill="#d1d5db" />
                      
                      <rect x="475" y="525" width="50" height="30" rx="2" fill="#f5f5f5" stroke="#000" strokeWidth="1" />
                      <rect x="485" y="555" width="30" height="5" rx="1" fill="#d1d5db" />
                      
                      {/* Connection arrows and labels */}
                      <line x1="200" y1="110" x2="325" y2="110" stroke="#3b82f6" strokeWidth="3" />
                      <polygon points="315,105 325,110 315,115" fill="#3b82f6" />
                      <text x="260" y="100" fontSize="10" textAnchor="middle" fill="#000" fontWeight="bold">Poll Specification</text>
                      
                      <line x1="475" y1="110" x2="600" y2="110" stroke="#3b82f6" strokeWidth="3" />
                      <polygon points="590,105 600,110 590,115" fill="#3b82f6" />
                      <text x="535" y="100" fontSize="10" textAnchor="middle" fill="#000" fontWeight="bold">Notify Results</text>
                      
                      {/* Vertical arrows between nodes and contract */}
                      <line x1="140" y1="310" x2="140" y2="350" stroke="#3b82f6" strokeWidth="3" />
                      <polygon points="135,340 140,350 145,340" fill="#3b82f6" />
                      <text x="120" y="330" fontSize="10" textAnchor="middle" fill="#000" fontWeight="bold" transform="rotate(-90, 120, 330)">Block Validation</text>
                      
                      <line x1="160" y1="350" x2="160" y2="310" stroke="#3b82f6" strokeWidth="3" />
                      <polygon points="155,320 160,310 165,320" fill="#3b82f6" />
                      <text x="170" y="330" fontSize="10" textAnchor="middle" fill="#000" fontWeight="bold" transform="rotate(-90, 170, 330)">Transaction</text>
                      
                      <line x1="660" y1="310" x2="660" y2="350" stroke="#3b82f6" strokeWidth="3" />
                      <polygon points="655,340 660,350 665,340" fill="#3b82f6" />
                      <text x="640" y="330" fontSize="10" textAnchor="middle" fill="#000" fontWeight="bold" transform="rotate(-90, 640, 330)">Block Validation</text>
                      
                      <line x1="680" y1="350" x2="680" y2="310" stroke="#3b82f6" strokeWidth="3" />
                      <polygon points="675,320 680,310 685,320" fill="#3b82f6" />
                      <text x="690" y="330" fontSize="10" textAnchor="middle" fill="#000" fontWeight="bold" transform="rotate(-90, 690, 330)">Transaction</text>
                      
                      {/* Vertical arrows between contract and central handler */}
                      <line x1="400" y1="170" x2="400" y2="275" stroke="#3b82f6" strokeWidth="3" />
                      <polygon points="395,265 400,275 405,265" fill="#3b82f6" />
                      <text x="380" y="225" fontSize="10" textAnchor="middle" fill="#000" fontWeight="bold" transform="rotate(-90, 380, 225)">Deploy</text>
                      
                      <line x1="420" y1="275" x2="420" y2="170" stroke="#3b82f6" strokeWidth="3" />
                      <polygon points="415,180 420,170 425,180" fill="#3b82f6" />
                      <text x="440" y="225" fontSize="10" textAnchor="middle" fill="#000" fontWeight="bold" transform="rotate(-90, 440, 225)">Query</text>
                      
                      {/* Vertical arrows between voters and vote boxes */}
                      <line x1="200" y1="525" x2="200" y2="415" stroke="#3b82f6" strokeWidth="3" />
                      <polygon points="195,425 200,415 205,425" fill="#3b82f6" />
                      <text x="185" y="470" fontSize="10" textAnchor="middle" fill="#000" fontWeight="bold" transform="rotate(-90, 185, 470)">Cast Vote</text>
                      
                      <line x1="220" y1="415" x2="220" y2="525" stroke="#3b82f6" strokeWidth="3" />
                      <polygon points="215,515 220,525 225,515" fill="#3b82f6" />
                      <text x="235" y="470" fontSize="10" textAnchor="middle" fill="#000" fontWeight="bold" transform="rotate(-90, 235, 470)">Confirmation</text>
                      
                      <line x1="300" y1="525" x2="300" y2="415" stroke="#3b82f6" strokeWidth="3" />
                      <polygon points="295,425 300,415 305,425" fill="#3b82f6" />
                      <text x="285" y="470" fontSize="10" textAnchor="middle" fill="#000" fontWeight="bold" transform="rotate(-90, 285, 470)">Cast Vote</text>
                      
                      <line x1="320" y1="415" x2="320" y2="525" stroke="#3b82f6" strokeWidth="3" />
                      <polygon points="315,515 320,525 325,515" fill="#3b82f6" />
                      <text x="335" y="470" fontSize="10" textAnchor="middle" fill="#000" fontWeight="bold" transform="rotate(-90, 335, 470)">Confirmation</text>
                      
                      <line x1="400" y1="525" x2="400" y2="415" stroke="#3b82f6" strokeWidth="3" />
                      <polygon points="395,425 400,415 405,425" fill="#3b82f6" />
                      <text x="385" y="470" fontSize="10" textAnchor="middle" fill="#000" fontWeight="bold" transform="rotate(-90, 385, 470)">Cast Vote</text>
                      
                      <line x1="420" y1="415" x2="420" y2="525" stroke="#3b82f6" strokeWidth="3" />
                      <polygon points="415,515 420,525 425,515" fill="#3b82f6" />
                      <text x="435" y="470" fontSize="10" textAnchor="middle" fill="#000" fontWeight="bold" transform="rotate(-90, 435, 470)">Confirmation</text>
                      
                      {/* Vertical arrows between relay nodes and voters */}
                      <line x1="160" y1="500" x2="160" y2="440" stroke="#3b82f6" strokeWidth="3" />
                      <polygon points="155,450 160,440 165,450" fill="#3b82f6" />
                      
                      <line x1="140" y1="440" x2="140" y2="500" stroke="#3b82f6" strokeWidth="3" />
                      <polygon points="135,490 140,500 145,490" fill="#3b82f6" />
                    </svg>
                  </div>
                </div>
                
                <h3 className="text-2xl font-bold mt-8 mb-4 text-center">BlockVOTE System Architecture</h3>
                <p className="text-sm mb-6 text-center">
                  Our implementation of the BlockVOTE architecture uses Polygon Amoy testnet's distributed ledger technology to ensure secure, transparent, and tamper-proof elections.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                  <div className="border rounded-lg p-6 bg-white shadow-sm">
                    <h3 className="text-lg font-bold mb-4 text-purple-900">Smart Contract Components</h3>
                    <p className="text-sm mb-3">
                      The core voting logic is implemented in a Solidity smart contract deployed on the Polygon Amoy testnet with these key components:
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
                      The BlockVOTE network architecture implements a multi-layered approach:
                    </p>
                    <ul className="list-disc pl-6 space-y-2 text-sm">
                      <li><span className="font-semibold">Relay Nodes:</span> Dedicated blockchain nodes that facilitate transaction propagation and verification</li>
                      <li><span className="font-semibold">Consensus Mechanism:</span> Polygon's Proof-of-Stake with Byzantine Fault Tolerance for rapid transaction validation</li>
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
                      The BlockVOTE transaction lifecycle follows a precise sequence:
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
// BlockVOTE Smart Contract Interface (Solidity v0.8.17)

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
                    The BlockVOTE security model implements multiple defense layers to ensure vote integrity:
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
};

export default ArchitectureView;