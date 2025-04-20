import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useLocation } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { AdminSidebar } from '@/components/admin/admin-sidebar';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  ChevronLeft,
  ChevronRight,
  Users,
  Bell,
  AlertCircle,
  ChevronDown
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';
import { FacultyParticipation, VoteTimeline, ActiveElection, ParticipationOverview, Candidate } from '@/lib/dashboard-types';

// Helper functions
const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
};

// Define types for our dashboard metrics
type DashboardMetrics = {
  totalVoters: number;
  openTickets: number;
};

// Calendar component
const Calendar = () => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  
  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    return new Date(year, month + 1, 0).getDate();
  };
  
  const getFirstDayOfMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    return new Date(year, month, 1).getDay();
  };
  
  const getMonthName = (date: Date) => {
    return date.toLocaleString('default', { month: 'long' });
  };
  
  const handlePrevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };
  
  const handleNextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };
  
  const daysInMonth = getDaysInMonth(currentMonth);
  const firstDay = getFirstDayOfMonth(currentMonth);
  const monthYear = `${getMonthName(currentMonth)} ${currentMonth.getFullYear()}`;
  
  // Create calendar grid
  const days = [];
  for (let i = 0; i < firstDay; i++) {
    days.push(null); // Empty cells for days before the first day of the month
  }
  
  for (let i = 1; i <= daysInMonth; i++) {
    days.push(i);
  }
  
  // Highlight current day if it's in the current month view
  const today = new Date();
  const isCurrentMonth = today.getMonth() === currentMonth.getMonth() && 
                          today.getFullYear() === currentMonth.getFullYear();
  const currentDay = today.getDate();
  
  return (
    <div className="w-full bg-white rounded-lg shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 bg-white border-b border-gray-100">
        <h2 className="text-sm font-medium text-gray-800">{monthYear}</h2>
        <div className="flex items-center space-x-1">
          <Button variant="outline" size="icon" className="h-7 w-7 p-0" onClick={handlePrevMonth}>
            <ChevronLeft className="h-4 w-4" />
            <span className="sr-only">Previous month</span>
          </Button>
          <Button variant="outline" size="icon" className="h-7 w-7 p-0" onClick={handleNextMonth}>
            <ChevronRight className="h-4 w-4" />
            <span className="sr-only">Next month</span>
          </Button>
        </div>
      </div>
      <div className="p-2">
        <div className="grid grid-cols-7 text-center text-xs font-medium text-gray-500">
          <div className="py-1">Mon</div>
          <div className="py-1">Tue</div>
          <div className="py-1">Wed</div>
          <div className="py-1">Thu</div>
          <div className="py-1">Fri</div>
          <div className="py-1">Sat</div>
          <div className="py-1">Sun</div>
        </div>
        <div className="grid grid-cols-7 text-sm">
          {days.map((day, index) => (
            <div key={index} className="aspect-square py-1 text-center">
              {day ? (
                <span 
                  className={`inline-flex items-center justify-center w-7 h-7 rounded-full ${
                    isCurrentMonth && day === currentDay
                      ? 'bg-purple-600 text-white'
                      : 'text-gray-900 hover:bg-gray-100'
                  }`}
                >
                  {day}
                </span>
              ) : (
                <span className="text-gray-300">&nbsp;</span>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// Elections list component
const ElectionsList = () => {
  // We're using participation overview to get proper status info
  const { data: electionsData } = useQuery<ParticipationOverview[]>({
    queryKey: ['/api/dashboard/metrics/participation-overview'],
  });

  // Make sure we have an array of elections
  const elections = Array.isArray(electionsData) ? electionsData : [];

  // Map status to display values and colors
  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-purple-100 text-purple-800';
      case 'completed':
        return 'bg-gray-100 text-gray-800';
      case 'upcoming':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-blue-100 text-blue-800';
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-100">
        <h2 className="text-base font-medium text-gray-800">Elections</h2>
      </div>
      <div className="divide-y divide-gray-100">
        {elections.length > 0 ? (
          elections.map((election) => (
            <div key={election.id} className={`p-3 flex items-center justify-between ${
              election.status === 'active' ? 'hover:bg-purple-50' : 'hover:bg-gray-50'
            } transition duration-150`}>
              <div className="flex-1">
                <h3 className="text-sm font-medium text-gray-900">{election.name}</h3>
                <span className={`text-xs px-2 py-0.5 rounded-full ${getStatusBadgeClass(election.status)}`}>
                  {election.status.charAt(0).toUpperCase() + election.status.slice(1)}
                </span>
              </div>
            </div>
          ))
        ) : (
          <div className="p-6 text-center">
            <p className="text-gray-500 text-sm">No elections available</p>
          </div>
        )}
      </div>
    </div>
  );
};

// Candidate Analytics component
const CandidateAnalytics = () => {
  const [selectedElection, setSelectedElection] = useState<string>('');
  const { data: activeElections } = useQuery<ActiveElection[]>({
    queryKey: ['/api/dashboard/metrics/active-elections'],
  });

  const filteredElection = activeElections?.find(e => e.id.toString() === selectedElection);
  
  // Prepare the data for the bar chart
  const candidateData = filteredElection?.candidates?.map(candidate => ({
    name: candidate.full_name,
    votes: candidate.vote_count,
    fill: '#6d28d9'
  })) || [];

  useEffect(() => {
    if (activeElections && activeElections.length > 0 && !selectedElection) {
      setSelectedElection(activeElections[0].id.toString());
    }
  }, [activeElections, selectedElection]);

  return (
    <div className="bg-white rounded-lg shadow-sm overflow-hidden">
      <div className="px-4 py-3 flex justify-between items-center border-b border-gray-100">
        <h2 className="text-base font-medium text-gray-800">Candidate Analytics</h2>
        <Select value={selectedElection} onValueChange={setSelectedElection}>
          <SelectTrigger className="w-[180px] h-8 text-xs">
            <SelectValue placeholder="Select election" />
          </SelectTrigger>
          <SelectContent>
            {activeElections?.map((election) => (
              <SelectItem key={election.id} value={election.id.toString()}>
                {election.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="p-4 h-72">
        {candidateData.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              layout="vertical"
              data={candidateData}
              margin={{ top: 5, right: 30, left: 80, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" />
              <YAxis 
                type="category" 
                dataKey="name" 
                tick={{ fontSize: 12 }}
                width={80}
              />
              <Tooltip 
                formatter={(value) => [`${value} votes`, 'Votes']}
                labelFormatter={(label) => `Candidate: ${label}`}
              />
              <Bar dataKey="votes" fill="#6d28d9" />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-full flex items-center justify-center">
            <p className="text-gray-500 text-sm">No candidate data available</p>
          </div>
        )}
      </div>
    </div>
  );
};

// Candidate Performance List
const CandidatePerformanceList = () => {
  const [selectedElection, setSelectedElection] = useState<string>('');
  const { data: activeElections } = useQuery<ActiveElection[]>({
    queryKey: ['/api/dashboard/metrics/active-elections'],
  });

  const filteredElection = activeElections?.find(e => e.id.toString() === selectedElection);
  const candidates = filteredElection?.candidates || [];

  // Sort candidates by vote count (descending)
  const sortedCandidates = [...candidates].sort((a, b) => b.vote_count - a.vote_count);

  useEffect(() => {
    if (activeElections && activeElections.length > 0 && !selectedElection) {
      setSelectedElection(activeElections[0].id.toString());
    }
  }, [activeElections, selectedElection]);

  return (
    <div className="bg-white rounded-lg shadow-sm overflow-hidden">
      <div className="px-4 py-3 flex justify-between items-center border-b border-gray-100">
        <h2 className="text-base font-medium text-gray-800">Candidate Performances</h2>
        <Select value={selectedElection} onValueChange={setSelectedElection}>
          <SelectTrigger className="w-[180px] h-8 text-xs">
            <SelectValue placeholder="Select election" />
          </SelectTrigger>
          <SelectContent>
            {activeElections?.map((election) => (
              <SelectItem key={election.id} value={election.id.toString()}>
                {election.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="divide-y divide-gray-100">
        {sortedCandidates.length > 0 ? (
          sortedCandidates.map((candidate, index) => (
            <div key={candidate.id} className="p-4 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 flex-shrink-0 rounded-full bg-purple-100 flex items-center justify-center overflow-hidden">
                  <span className="text-purple-700 font-medium">{candidate.full_name.slice(0, 2)}</span>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-900">{candidate.full_name}</h3>
                  <p className="text-xs text-gray-500">{candidate.faculty_name || candidate.faculty}</p>
                </div>
              </div>
              <div className="text-sm font-medium">{candidate.vote_count} votes</div>
              <Button variant="ghost" size="sm" className="p-0 h-8 w-8">
                <ChevronDown className="h-4 w-4" />
              </Button>
            </div>
          ))
        ) : (
          <div className="p-6 text-center">
            <p className="text-gray-500 text-sm">No candidate data available</p>
          </div>
        )}
      </div>
    </div>
  );
};

// Faculty distribution component
const FacultyDistribution = () => {
  const { data: facultyData } = useQuery<FacultyParticipation[]>({
    queryKey: ['/api/dashboard/metrics/faculty-participation'],
  });

  // Prepare data for pie chart
  const pieData = Array.isArray(facultyData) 
    ? facultyData.map(faculty => ({
        name: faculty.faculty_name || faculty.faculty,
        value: faculty.total_students,
        fill: `#${Math.floor(Math.random()*16777215).toString(16)}` // Random color
      }))
    : [];

  // Custom colors for pie chart
  const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff8042', '#0088FE'];

  return (
    <div className="bg-white rounded-lg shadow-sm overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-100">
        <h2 className="text-base font-medium text-gray-800">Faculty Distribution</h2>
      </div>
      <div className="p-4 h-72">
        {pieData.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={80}
                paddingAngle={5}
                dataKey="value"
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
              >
                {pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => [`${value} students`, 'Students']} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-full flex items-center justify-center">
            <p className="text-gray-500 text-sm">No faculty data available</p>
          </div>
        )}
      </div>
    </div>
  );
};

// Voting Timeline component
const VotingTimeline = () => {
  const { data: timelineData } = useQuery<VoteTimeline[]>({
    queryKey: ['/api/dashboard/metrics/voting-timeline'],
  });

  // Process data for timeline chart
  const chartData = Array.isArray(timelineData) 
    ? timelineData.map(item => ({
        hour: new Date(item.hour).toLocaleTimeString([], { hour: '2-digit', hour12: true }),
        votes: item.vote_count
      })) 
    : [];

  return (
    <div className="bg-white rounded-lg shadow-sm overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-100">
        <h2 className="text-base font-medium text-gray-800">Voting Timeline</h2>
      </div>
      <div className="p-4 h-72">
        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="hour" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="votes" fill="#6d28d9" />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-full flex items-center justify-center">
            <p className="text-gray-500 text-sm">No voting timeline data available</p>
          </div>
        )}
      </div>
    </div>
  );
};

// Main Dashboard component
export default function AdminDashboardRedesigned() {
  const { user } = useAuth();
  const [, navigate] = useLocation();

  // Fetch dashboard metrics 
  const { data: facultyData } = useQuery<FacultyParticipation[]>({
    queryKey: ['/api/dashboard/metrics/faculty-participation'],
  });

  const { data: ticketsData } = useQuery({
    queryKey: ['/api/tickets'],
    enabled: user?.isAdmin === true,
  });

  // Calculate metrics
  const totalVoters = Array.isArray(facultyData) 
    ? facultyData.reduce((sum, faculty) => sum + faculty.total_students, 0)
    : 0;
  
  // Count open tickets
  const openTickets = Array.isArray(ticketsData) 
    ? ticketsData.filter((ticket: any) => ticket.status === 'open').length 
    : 0;

  if (!user?.isAdmin) {
    navigate('/');
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p>Redirecting...</p>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <AdminSidebar user={user} />
      
      {/* Main content */}
      <main className="flex-1 overflow-y-auto">
        <div className="px-6 py-4 bg-white border-b border-gray-200">
          <h1 className="text-xl font-semibold text-gray-800">Admin Dashboard</h1>
        </div>
        
        <div className="p-6 space-y-6">
          {/* Top metrics cards */}
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            {/* Students Card */}
            <Card className="overflow-hidden">
              <CardContent className="p-0">
                <div className="flex items-center p-6">
                  <div className="mr-6 h-12 w-12 rounded-full bg-gray-100 flex items-center justify-center">
                    <Users className="h-6 w-6 text-gray-500" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Students</p>
                    <h3 className="text-2xl font-bold text-gray-900">{totalVoters}</h3>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Notifications Card */}
            <Card className="overflow-hidden bg-purple-700 text-white">
              <CardContent className="p-0">
                <div className="flex items-center p-6">
                  <div className="mr-6 h-12 w-12 rounded-full bg-purple-800 flex items-center justify-center">
                    <Bell className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <p className="text-sm text-purple-200">Notifications</p>
                    <h3 className="text-2xl font-bold text-white">{openTickets}</h3>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Reports Card */}
            <Card className="overflow-hidden">
              <CardContent className="p-0">
                <div className="flex items-center p-6">
                  <div className="mr-6 h-12 w-12 rounded-full bg-gray-100 flex items-center justify-center">
                    <AlertCircle className="h-6 w-6 text-gray-500" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Reports</p>
                    <h3 className="text-2xl font-bold text-gray-900">4</h3>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <CandidateAnalytics />
            <CandidatePerformanceList />
          </div>

          {/* Bottom Row - Distribution & Timeline */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <VotingTimeline />
            </div>
            <div>
              <FacultyDistribution />
            </div>
          </div>

          {/* Calendar & Elections row */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <div>
              <Calendar />
            </div>
            <div className="lg:col-span-2">
              <ElectionsList />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}