import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { StudentSidebar } from "@/components/student/student-sidebar";
import { 
  CheckSquareIcon, 
  FileTextIcon, 
  ShieldCheck, 
  UserIcon,
  AlertTriangleIcon,
  InfoIcon
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

export default function Guidelines() {
  const { user } = useAuth();
  const [, navigate] = useLocation();

  if (!user) {
    navigate("/auth");
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p>Redirecting to login...</p>
      </div>
    );
  }

  // Admin users should be redirected to their dashboard
  if (user.isAdmin) {
    navigate("/admin");
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p>Redirecting to admin dashboard...</p>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <StudentSidebar user={user} />
      
      {/* Main content */}
      <main className="flex-1 overflow-y-auto">
        <div className="px-6 py-4 bg-white border-b border-gray-200">
          <h1 className="text-xl font-semibold text-gray-800">Voting Guidelines</h1>
        </div>
        
        <div className="p-6">
          <div className="max-w-4xl mx-auto space-y-6">
            {/* Introduction */}
            <Card>
              <CardHeader className="bg-purple-50">
                <CardTitle className="text-purple-800 flex items-center">
                  <InfoIcon className="mr-2 h-5 w-5" />
                  Introduction to UniVote Elections
                </CardTitle>
                <CardDescription>
                  Understanding the voting process and your role as a voter
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
                <p className="text-gray-700 mb-4">
                  Welcome to the UniVote Elections platform. This secure voting system allows you to participate 
                  in various elections including President, Vice President, and Senator positions. Your participation 
                  is crucial to maintaining a vibrant student government that represents your interests.
                </p>
                <p className="text-gray-700">
                  All votes are securely recorded on the blockchain, ensuring transparency, immutability, and verification. 
                  This guide will walk you through the voting process and best practices.
                </p>
              </CardContent>
            </Card>
            
            {/* Eligibility */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <UserIcon className="mr-2 h-5 w-5" />
                  Voter Eligibility
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="list-disc pl-5 space-y-2 text-gray-700">
                  <li>You must be a registered student of the University with an active account.</li>
                  <li>For university-wide elections (President, Vice President), all students are eligible to vote.</li>
                  <li>For faculty-specific elections (Senator), you may only vote in elections for your faculty.</li>
                  <li>You must complete identity verification through your university email account.</li>
                </ul>
              </CardContent>
            </Card>
            
            {/* Voting Process */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <CheckSquareIcon className="mr-2 h-5 w-5" />
                  Voting Process
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <h3 className="font-medium text-gray-800">How to Vote:</h3>
                <ol className="list-decimal pl-5 space-y-2 text-gray-700">
                  <li>
                    <span className="font-medium">Browse Active Elections:</span> From your dashboard, you can see all currently active elections.
                  </li>
                  <li>
                    <span className="font-medium">Review Candidates:</span> Click on an election to see all candidates and their platforms.
                  </li>
                  <li>
                    <span className="font-medium">Cast Your Vote:</span> Click the "Vote" button next to your preferred candidate.
                  </li>
                  <li>
                    <span className="font-medium">Confirm Your Vote:</span> The system will ask you to confirm your selection.
                  </li>
                  <li>
                    <span className="font-medium">Receive Confirmation:</span> Once your vote is recorded on the blockchain, you'll receive a confirmation.
                  </li>
                </ol>
                
                <Separator className="my-4" />
                
                <div className="bg-blue-50 p-4 rounded-md">
                  <h3 className="font-medium text-blue-800 flex items-center mb-2">
                    <InfoIcon className="mr-2 h-5 w-5" />
                    Important Notes:
                  </h3>
                  <ul className="list-disc pl-5 space-y-1 text-blue-700">
                    <li>You can only vote once in each election.</li>
                    <li>Votes cannot be changed once confirmed.</li>
                    <li>Your vote will remain anonymous to other students and candidates.</li>
                    <li>President and Vice President elections require you to vote for the entire ticket.</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
            
            {/* Security */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <ShieldCheck className="mr-2 h-5 w-5" />
                  Security & Privacy
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-700 mb-4">
                  The UniVote system employs blockchain technology to ensure maximum security and 
                  transparency while maintaining voter privacy.
                </p>
                
                <h3 className="font-medium text-gray-800 mb-2">Security Features:</h3>
                <ul className="list-disc pl-5 space-y-2 text-gray-700 mb-4">
                  <li>All votes are encrypted and stored on a blockchain ledger.</li>
                  <li>Your identity is verified but your vote remains anonymous.</li>
                  <li>The system is protected against double-voting or vote tampering.</li>
                  <li>Vote tallying is automated and transparent, eliminating human error.</li>
                </ul>
                
                <h3 className="font-medium text-gray-800 mb-2">Your Privacy:</h3>
                <ul className="list-disc pl-5 space-y-2 text-gray-700">
                  <li>Your specific vote choice is not visible to administrators or other students.</li>
                  <li>Only aggregate voting results are published after the election closes.</li>
                  <li>The system maintains an anonymized record of participation for verification purposes only.</li>
                </ul>
              </CardContent>
            </Card>
            
            {/* Rules & Ethics */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center text-yellow-700">
                  <AlertTriangleIcon className="mr-2 h-5 w-5" />
                  Rules & Ethics
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="bg-yellow-50 p-4 rounded-md mb-4">
                  <h3 className="font-medium text-yellow-800 mb-2">Prohibited Activities:</h3>
                  <ul className="list-disc pl-5 space-y-1 text-yellow-700">
                    <li>Attempting to vote multiple times or on behalf of another student.</li>
                    <li>Sharing account credentials or allowing others to use your account.</li>
                    <li>Using technical means to interfere with the voting system.</li>
                    <li>Coercing or bribing other students regarding their vote.</li>
                  </ul>
                </div>
                
                <p className="text-gray-700">
                  Violations of election rules may result in disciplinary action according to the University 
                  Student Code of Conduct. Any suspicious activity should be reported immediately to the Election 
                  Commission at <span className="text-purple-600">elections@univote.edu</span>.
                </p>
              </CardContent>
            </Card>
            
            {/* Support & Help */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <FileTextIcon className="mr-2 h-5 w-5" />
                  Support & Help
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-700 mb-4">
                  If you encounter any issues or have questions about the voting process:
                </p>
                
                <ul className="list-disc pl-5 space-y-2 text-gray-700">
                  <li>Email technical support at <span className="text-purple-600">voting-support@ada.edu.az</span></li>
                  <li>Visit the Student Affairs office in the main campus building.</li>
                  <li>Check the FAQ section on the University website.</li>
                </ul>
                
                <div className="mt-4 p-4 bg-purple-50 rounded-md">
                  <p className="text-purple-800 font-medium">
                    Thank you for participating in the democratic process at the University. Your vote matters!
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}