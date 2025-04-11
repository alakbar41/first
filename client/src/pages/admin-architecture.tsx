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
  const [_, navigate] = useNavigate();

  // Redirect non-admin users
  React.useEffect(() => {
    if (!isLoading && (!user || !user.isAdmin)) {
      navigate("/auth");
    }
  }, [user, isLoading, navigate]);

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
      <AdminSidebar />
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
                <h2 className="text-2xl font-bold mb-4">Blockchain Architecture</h2>
                
                <div className="rounded-md border bg-muted p-6 mb-6">
                  <div className="blockchain-diagram flex justify-center">
                    <svg width="700" height="300" viewBox="0 0 700 300" className="border rounded-lg bg-white">
                      {/* Smart Contract */}
                      <rect x="280" y="30" width="140" height="70" rx="5" fill="#ddd6fe" stroke="#c4b5fd" strokeWidth="2" />
                      <text x="350" y="65" fontSize="14" textAnchor="middle" fontWeight="bold">Voting Contract</text>
                      <text x="350" y="85" fontSize="10" textAnchor="middle">Polygon Amoy</text>
                      
                      {/* Functions */}
                      <rect x="100" y="150" width="120" height="40" rx="5" fill="#fff" stroke="#c4b5fd" strokeWidth="1" />
                      <text x="160" y="175" fontSize="12" textAnchor="middle">deployElection()</text>
                      
                      <rect x="240" y="150" width="120" height="40" rx="5" fill="#fff" stroke="#c4b5fd" strokeWidth="1" />
                      <text x="300" y="175" fontSize="12" textAnchor="middle">startElection()</text>
                      
                      <rect x="380" y="150" width="120" height="40" rx="5" fill="#fff" stroke="#c4b5fd" strokeWidth="1" />
                      <text x="440" y="175" fontSize="12" textAnchor="middle">vote()</text>
                      
                      <rect x="520" y="150" width="120" height="40" rx="5" fill="#fff" stroke="#c4b5fd" strokeWidth="1" />
                      <text x="580" y="175" fontSize="12" textAnchor="middle">finalizeResults()</text>
                      
                      {/* Storage */}
                      <rect x="100" y="220" width="120" height="40" rx="5" fill="#e0e7ff" stroke="#c4b5fd" strokeWidth="1" />
                      <text x="160" y="245" fontSize="12" textAnchor="middle">Elections []</text>
                      
                      <rect x="240" y="220" width="120" height="40" rx="5" fill="#e0e7ff" stroke="#c4b5fd" strokeWidth="1" />
                      <text x="300" y="245" fontSize="12" textAnchor="middle">Candidates []</text>
                      
                      <rect x="380" y="220" width="120" height="40" rx="5" fill="#e0e7ff" stroke="#c4b5fd" strokeWidth="1" />
                      <text x="440" y="245" fontSize="12" textAnchor="middle">Votes []</text>
                      
                      <rect x="520" y="220" width="120" height="40" rx="5" fill="#e0e7ff" stroke="#c4b5fd" strokeWidth="1" />
                      <text x="580" y="245" fontSize="12" textAnchor="middle">Results []</text>
                      
                      {/* Connect lines */}
                      <line x1="160" y1="150" x2="320" y2="100" stroke="#6366f1" strokeWidth="1" />
                      <line x1="300" y1="150" x2="330" y2="100" stroke="#6366f1" strokeWidth="1" />
                      <line x1="440" y1="150" x2="360" y2="100" stroke="#6366f1" strokeWidth="1" />
                      <line x1="580" y1="150" x2="390" y2="100" stroke="#6366f1" strokeWidth="1" />
                      
                      <line x1="160" y1="190" x2="160" y2="220" stroke="#6366f1" strokeWidth="1" />
                      <line x1="300" y1="190" x2="300" y2="220" stroke="#6366f1" strokeWidth="1" />
                      <line x1="440" y1="190" x2="440" y2="220" stroke="#6366f1" strokeWidth="1" />
                      <line x1="580" y1="190" x2="580" y2="220" stroke="#6366f1" strokeWidth="1" />
                    </svg>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  <div>
                    <h3 className="text-lg font-bold mb-2">Smart Contract Architecture</h3>
                    <p className="text-sm">
                      The voting system uses a Solidity smart contract deployed on the Polygon Amoy testnet with the following components:
                    </p>
                    <ul className="list-disc pl-6 space-y-1 text-sm mt-2">
                      <li>Election structure with metadata and status</li>
                      <li>Candidate registry with unique IDs</li>
                      <li>Vote recording with anonymous transactions</li>
                      <li>Result tabulation and finalization</li>
                      <li>Access control for administrative functions</li>
                    </ul>
                  </div>
                  
                  <div>
                    <h3 className="text-lg font-bold mb-2">Blockchain Integration</h3>
                    <p className="text-sm">
                      The system integrates with blockchain through:
                    </p>
                    <ul className="list-disc pl-6 space-y-1 text-sm mt-2">
                      <li>MetaMask for wallet connection and transaction signing</li>
                      <li>Ethers.js for contract interaction</li>
                      <li>BrowserProvider for direct wallet communication</li>
                      <li>Transaction receipt verification</li>
                      <li>Gas optimization strategies</li>
                      <li>EIP-1559 transaction support with fallback</li>
                    </ul>
                  </div>
                </div>
                
                <h3 className="text-lg font-bold mb-2">Key Smart Contract Functions</h3>
                <div className="rounded-md border bg-muted p-4 mb-6">
                  <pre className="text-xs whitespace-pre-wrap">
{`
// Primary contract functions (simplified):

// Administrative functions
function deployElection(uint256 id, string memory name, uint startTime, uint endTime) public onlyOwner
function addCandidate(uint256 electionId, uint256 candidateId, string memory name) public onlyOwner
function startElection(uint256 electionId) public onlyOwner
function stopElection(uint256 electionId) public onlyOwner
function finalizeResults(uint256 electionId) public onlyOwner

// Voting functions
function vote(uint256 electionId, uint256 candidateId, uint256 nonce) public
function getResults(uint256 electionId) public view returns (uint256[] memory)
function getCandidateVotes(uint256 electionId, uint256 candidateId) public view returns (uint256)
function getElectionStatus(uint256 electionId) public view returns (ElectionStatus)
`}
                  </pre>
                </div>
                
                <h3 className="text-lg font-bold mb-2">Security Considerations</h3>
                <p className="text-sm mb-4">
                  Blockchain implementation includes several security measures:
                </p>
                <ul className="list-disc pl-6 space-y-1 text-sm">
                  <li><span className="font-semibold">Two-Layer Authentication:</span> Database token + blockchain transaction signing</li>
                  <li><span className="font-semibold">Fail-Safe Mechanism:</span> Transaction receipt verification with database vote reset</li>
                  <li><span className="font-semibold">Gas Optimization:</span> Custom parameters to prevent excessive costs</li>
                  <li><span className="font-semibold">Access Control:</span> Owner-only administrative functions</li>
                  <li><span className="font-semibold">Status Validation:</span> Election must be active for voting</li>
                  <li><span className="font-semibold">Public Verifiability:</span> Results accessible on the blockchain for transparency</li>
                </ul>
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