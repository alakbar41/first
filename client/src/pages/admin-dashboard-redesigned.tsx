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
  ChevronDown,
  Trophy
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
  Legend,
  AreaChart,
  Area
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
  // Directly fetch all elections from the API
  const { data: electionsData, isLoading } = useQuery<any[]>({
    queryKey: ['/api/elections'],
  });

  // Make sure we have an array of elections
  const elections = Array.isArray(electionsData) ? electionsData : [];

  // Log the data to see what's available
  console.log("Elections data for summary:", elections);

  // Calculate summary metrics
  const electionStats = React.useMemo(() => {
    return {
      total: elections.length,
      active: elections.filter(e => e.status === 'active').length,
      upcoming: elections.filter(e => e.status === 'upcoming').length,
      completed: elections.filter(e => e.status === 'completed').length,
    };
  }, [elections]);

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
  
  // Sort elections: active first, then upcoming, then completed
  const sortedElections = React.useMemo(() => {
    if (elections.length === 0) return [];
    
    const statusPriority = { 'active': 0, 'upcoming': 1, 'completed': 2 };
    
    return [...elections].sort((a, b) => {
      const priorityA = statusPriority[a.status as keyof typeof statusPriority] || 3;
      const priorityB = statusPriority[b.status as keyof typeof statusPriority] || 3;
      return priorityA - priorityB;
    });
  }, [elections]);

  return (
    <div className="bg-white rounded-lg shadow-sm overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-100">
        <h2 className="text-base font-medium text-gray-800">Elections Summary</h2>
      </div>
      
      {/* Summary stats section */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-3 bg-gray-50 border-b border-gray-100">
        <div className="text-center p-2">
          <div className="text-xs text-gray-500">Total</div>
          <div className="text-lg font-semibold text-gray-800">{electionStats.total}</div>
        </div>
        <div className="text-center p-2">
          <div className="text-xs text-purple-600">Active</div>
          <div className="text-lg font-semibold text-purple-800">{electionStats.active}</div>
        </div>
        <div className="text-center p-2">
          <div className="text-xs text-green-600">Upcoming</div>
          <div className="text-lg font-semibold text-green-800">{electionStats.upcoming}</div>
        </div>
        <div className="text-center p-2">
          <div className="text-xs text-gray-500">Completed</div>
          <div className="text-lg font-semibold text-gray-800">{electionStats.completed}</div>
        </div>
      </div>
      
      {/* Elections list */}
      <div className="divide-y divide-gray-100 max-h-[240px] overflow-y-auto">
        {isLoading ? (
          <div className="p-6 text-center">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-700 mx-auto"></div>
            <p className="text-gray-500 text-xs mt-2">Loading elections...</p>
          </div>
        ) : (
          <>
            {sortedElections.map((election) => (
              <div 
                key={election.id} 
                className={`p-3 flex items-center justify-between ${
                  election.status === 'active' ? 'hover:bg-purple-50' : 'hover:bg-gray-50'
                } transition duration-150`}
              >
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-medium text-gray-900">{election.name}</h3>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${getStatusBadgeClass(election.status)}`}>
                      {election.status.charAt(0).toUpperCase() + election.status.slice(1)}
                    </span>
                  </div>
                  <div className="flex items-center mt-1 text-xs text-gray-500">
                    <span className="mr-2">{election.position}</span>
                  </div>
                </div>
              </div>
            ))}
            {sortedElections.length === 0 && !isLoading && (
              <div className="p-6 flex items-center justify-center">
                <p className="text-gray-400 text-xs italic">Loading election data...</p>
              </div>
            )}
          </>
        )}
      </div>
      
      {/* Footer with data timestamp */}
      <div className="px-3 py-2 text-xs text-gray-400 bg-gray-50 border-t border-gray-100">
        Last updated: {new Date().toLocaleTimeString()}
      </div>
    </div>
  );
};

// Live Election Results component
const LiveElectionResults = () => {
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
        <h2 className="text-base font-medium text-gray-800">Live Election Results</h2>
        <div className="flex items-center space-x-2">
          <div className="flex items-center">
            <span className="w-2 h-2 rounded-full bg-green-500 mr-1.5 animate-pulse"></span>
            <span className="text-xs text-gray-500">Live</span>
          </div>
          <Select value={selectedElection} onValueChange={setSelectedElection}>
            <SelectTrigger className="w-[180px] h-8 text-xs">
              <SelectValue placeholder="Select active election" />
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
            <p className="text-gray-500 text-sm">No active elections available</p>
          </div>
        )}
      </div>
    </div>
  );
};

// Completed Elections Results component
const CompletedElectionWinners = () => {
  const [selectedElection, setSelectedElection] = useState<string>('');
  const { data: completedElections } = useQuery<ActiveElection[]>({
    queryKey: ['/api/dashboard/metrics/completed-elections'],
  });

  const filteredElection = completedElections?.find(e => e.id.toString() === selectedElection);
  const candidates = filteredElection?.candidates || [];

  // Sort candidates by vote count (descending) to show winners first
  const sortedCandidates = [...candidates].sort((a, b) => b.vote_count - a.vote_count);

  // Handle tie detection
  const highestVoteCount = sortedCandidates.length > 0 ? sortedCandidates[0].vote_count : 0;
  
  // Find all candidates that are tied for the highest vote count
  const tiedWinners = sortedCandidates.filter(candidate => candidate.vote_count === highestVoteCount);
  const hasTie = tiedWinners.length > 1;

  useEffect(() => {
    if (completedElections && completedElections.length > 0 && !selectedElection) {
      setSelectedElection(completedElections[0].id.toString());
    }
  }, [completedElections, selectedElection]);
  
  // Determine if a candidate is tied for the win based on index and vote count
  const isWinnerOrTied = (candidate: any, index: number) => {
    return candidate.vote_count === highestVoteCount;
  };

  // Debugging completedElections data
  console.log('Completed Elections:', completedElections);
  console.log('Selected Election:', filteredElection);
  console.log('Candidates:', candidates);
  console.log('Sorted Candidates:', sortedCandidates);

  return (
    <div className="bg-white rounded-lg shadow-sm overflow-hidden">
      <div className="px-4 py-3 flex justify-between items-center border-b border-gray-100">
        <h2 className="text-base font-medium text-gray-800">Election Winners</h2>
        <Select value={selectedElection} onValueChange={setSelectedElection}>
          <SelectTrigger className="w-[180px] h-8 text-xs">
            <SelectValue placeholder="Select completed election" />
          </SelectTrigger>
          <SelectContent>
            {completedElections?.map((election) => (
              <SelectItem key={election.id} value={election.id.toString()}>
                {election.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      
      {/* Election status summary if there's a tie */}
      {hasTie && sortedCandidates.length > 0 && (
        <div className="px-4 py-2 bg-amber-50 border-b border-amber-100">
          <p className="text-xs text-amber-800 flex items-center">
            <AlertCircle className="h-3 w-3 mr-1" />
            Tie detected! {tiedWinners.length} candidates have the highest vote count ({highestVoteCount})
          </p>
        </div>
      )}
      
      <div className="divide-y divide-gray-100">
        {sortedCandidates.length > 0 ? (
          sortedCandidates.map((candidate, index) => {
            const isWinner = isWinnerOrTied(candidate, index);
            return (
              <div key={candidate.id} 
                  className={`p-4 flex items-center justify-between ${
                    isWinner ? 'bg-purple-50' : 'bg-white'
                  }`}
              >
                <div className="flex items-center space-x-3">
                  <div className="relative">
                    {isWinner && (
                      <div className="absolute -left-2 top-1/2 -translate-y-1/2">
                        <Trophy className="h-5 w-5 text-yellow-500" />
                      </div>
                    )}
                    <div className={`w-10 h-10 flex-shrink-0 rounded-full ${
                      isWinner ? 'bg-purple-200' : 'bg-purple-100'
                    } flex items-center justify-center overflow-hidden`}>
                      <span className={`${
                        isWinner ? 'text-purple-800' : 'text-purple-700'
                      } font-medium`}>{candidate.full_name.slice(0, 2)}</span>
                    </div>
                  </div>
                  <div>
                    <h3 className={`text-sm font-medium ${
                      isWinner ? 'text-purple-900' : 'text-gray-900'
                    }`}>{candidate.full_name}</h3>
                    <p className="text-xs text-gray-500">
                      {candidate.faculty_name || candidate.faculty}
                      {isWinner && (
                        <span className="ml-2 text-purple-700 font-medium">
                          {hasTie ? "• Tied for 1st" : "• Winner"}
                        </span>
                      )}
                    </p>
                  </div>
                </div>
                <div className={`text-sm font-medium ${
                  isWinner ? 'text-purple-700' : ''
                }`}>{candidate.vote_count} votes</div>
              </div>
            );
          })
        ) : (
          <div className="p-6 text-center">
            <p className="text-gray-500 text-sm">No completed elections available</p>
          </div>
        )}
      </div>
    </div>
  );
};

// Faculty distribution component with enhanced details
const FacultyDistribution = () => {
  const { data: facultyData } = useQuery<FacultyParticipation[]>({
    queryKey: ['/api/dashboard/metrics/faculty-participation'],
  });

  // Prepare data for pie chart
  const pieData = Array.isArray(facultyData) 
    ? facultyData.map(faculty => ({
        name: faculty.faculty_name || faculty.faculty,
        value: parseInt(faculty.total_students.toString()),
        participation: faculty.participation_percentage,
        fill: `#${Math.floor(Math.random()*16777215).toString(16)}` // Random color
      }))
    : [];

  // Custom colors for pie chart
  const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff8042', '#0088FE'];
  
  // Calculate total students
  const totalStudents = pieData.reduce((sum, faculty) => sum + faculty.value, 0);

  return (
    <div className="bg-white rounded-lg shadow-sm overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-100 flex justify-between items-center">
        <h2 className="text-base font-medium text-gray-800">Faculty Distribution</h2>
        <div className="text-xs text-gray-500">Total: {totalStudents} students</div>
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
              <Tooltip 
                formatter={(value, name, props) => {
                  if (name === 'value') {
                    return [`${value} students (${props.payload.participation.toFixed(1)}% voted)`, 'Students'];
                  }
                  return [value, name];
                }}
              />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-full flex items-center justify-center">
            <p className="text-gray-500 text-sm">No faculty data available</p>
          </div>
        )}
      </div>
      
      {/* Faculty breakdown table */}
      <div className="px-4 py-2 border-t border-gray-100">
        <h3 className="text-xs font-medium text-gray-500 mb-2">Faculty Breakdown</h3>
        <div className="overflow-x-auto max-h-48">
          <table className="w-full text-xs">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-2 py-1 text-left font-medium text-gray-500">Faculty</th>
                <th className="px-2 py-1 text-right font-medium text-gray-500">Students</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {Array.isArray(facultyData) && facultyData.map((faculty, index) => (
                <tr key={index} className="hover:bg-gray-50">
                  <td className="px-2 py-1 text-gray-700">{faculty.faculty_name || faculty.faculty}</td>
                  <td className="px-2 py-1 text-right text-gray-700">{faculty.total_students}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

// Voting Timeline component with enhanced visualization and insights
const VotingTimeline = () => {
  const [electionFilter, setElectionFilter] = useState<string>('all');
  const { data: timelineData, isLoading } = useQuery<VoteTimeline[]>({
    queryKey: ['/api/dashboard/metrics/voting-timeline', electionFilter !== 'all' ? electionFilter : null],
  });
  
  const { data: electionOptionsData } = useQuery<ParticipationOverview[]>({
    queryKey: ['/api/dashboard/metrics/participation-overview'],
  });

  // Ensure we have proper array data
  const electionOptions = Array.isArray(electionOptionsData) ? electionOptionsData : [];

  // Process data for timeline chart with enhanced formatting
  const chartData = React.useMemo(() => {
    if (!Array.isArray(timelineData) || timelineData.length === 0) return [];
    
    return timelineData.map(item => {
      // Parse date from the timestamp
      const date = new Date(item.hour);
      return {
        hour: item.formatted_hour || date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }),
        votes: parseInt(String(item.vote_count)) || 0,
        timestamp: date.getTime(), // For sorting
        dayOfWeek: item.day_of_week?.trim() || date.toLocaleDateString([], {weekday: 'short'}),
        fullDate: date.toLocaleDateString([], {month: 'short', day: 'numeric'})
      };
    }).sort((a, b) => a.timestamp - b.timestamp); // Ensure chronological order
  }, [timelineData]);
  
  // Calculate peak voting times
  const peakVotingTime = React.useMemo(() => {
    if (chartData.length === 0) return null;
    
    const maxVotes = Math.max(...chartData.map(item => item.votes));
    if (maxVotes === 0) return null;
    
    const peakTimes = chartData.filter(item => item.votes === maxVotes);
    return peakTimes.length > 0 ? peakTimes : null;
  }, [chartData]);
  
  // Generate insights about voting patterns
  const votingInsights = React.useMemo(() => {
    if (chartData.length === 0) return [];
    
    const insights = [];
    
    // Group by day of week to find which days have most votes
    const dayGroups = chartData.reduce((acc, item) => {
      const day = item.dayOfWeek;
      if (!acc[day]) acc[day] = 0;
      acc[day] += item.votes;
      return acc;
    }, {} as Record<string, number>);
    
    // Find most active day
    const mostActiveDayEntries = Object.entries(dayGroups).sort((a, b) => b[1] - a[1]);
    const mostActiveDay = mostActiveDayEntries[0];
    
    if (mostActiveDay && mostActiveDay[1] > 0) {
      insights.push(`Most votes occur on ${mostActiveDay[0]}`);
    }
    
    // Check if there are clear peak times
    if (peakVotingTime && peakVotingTime.length > 0 && peakVotingTime[0].votes > 0) {
      insights.push(`Peak voting time: ${peakVotingTime[0].hour}`);
    }
    
    // Look for voting trends (morning vs afternoon vs evening)
    const morningVotes = chartData.filter(d => {
      const hour = new Date(d.timestamp).getHours();
      return hour >= 6 && hour < 12;
    }).reduce((sum, d) => sum + d.votes, 0);
    
    const afternoonVotes = chartData.filter(d => {
      const hour = new Date(d.timestamp).getHours();
      return hour >= 12 && hour < 18;
    }).reduce((sum, d) => sum + d.votes, 0);
    
    const eveningVotes = chartData.filter(d => {
      const hour = new Date(d.timestamp).getHours();
      return hour >= 18 || hour < 6;
    }).reduce((sum, d) => sum + d.votes, 0);
    
    const maxTimeOfDay = Math.max(morningVotes, afternoonVotes, eveningVotes);
    
    if (maxTimeOfDay > 0) {
      if (maxTimeOfDay === morningVotes) {
        insights.push('Students prefer voting in the morning');
      } else if (maxTimeOfDay === afternoonVotes) {
        insights.push('Students prefer voting in the afternoon');
      } else {
        insights.push('Students prefer voting in the evening');
      }
    }
    
    return insights;
  }, [chartData, peakVotingTime]);
  
  // Total votes cast
  const totalVotes = React.useMemo(() => 
    chartData.reduce((sum, item) => sum + item.votes, 0), 
    [chartData]
  );

  return (
    <div className="bg-white rounded-lg shadow-sm overflow-hidden">
      <div className="px-4 py-3 flex justify-between items-center border-b border-gray-100">
        <h2 className="text-base font-medium text-gray-800">Voting Timeline</h2>
        <div className="flex items-center gap-2">
          <div className="text-xs text-gray-500">
            <span className="font-medium">{totalVotes}</span> votes
          </div>
          <Select value={electionFilter} onValueChange={setElectionFilter}>
            <SelectTrigger className="w-[180px] h-8 text-xs">
              <SelectValue placeholder="Filter by election" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Elections</SelectItem>
              {electionOptions.map((election) => (
                <SelectItem key={election.id} value={election.id.toString()}>
                  {election.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      
      <div className="p-4 h-72">
        {isLoading ? (
          <div className="h-full flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-700"></div>
          </div>
        ) : chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorVotes" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#8884d8" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#8884d8" stopOpacity={0.2}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis 
                dataKey="hour" 
                tick={{ fontSize: 10 }}
                tickFormatter={(value, index) => {
                  // Show every nth tick to avoid crowding
                  return index % 2 === 0 ? value : '';
                }}
              />
              <YAxis allowDecimals={false} />
              <Tooltip 
                formatter={(value) => [`${value} votes`, 'Activity']}
                labelFormatter={(label, payload) => {
                  if (payload.length > 0) {
                    return `${payload[0].payload.fullDate} at ${label}`;
                  }
                  return label;
                }}
              />
              <Legend />
              <Area 
                type="monotone" 
                dataKey="votes" 
                stroke="#8884d8" 
                fillOpacity={1} 
                fill="url(#colorVotes)" 
                name="Activity"
                activeDot={{ r: 6 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-full flex items-center justify-center">
            <p className="text-gray-500 text-sm">No voting timeline data available</p>
          </div>
        )}
      </div>
      
      <div className="px-4 py-3 border-t border-gray-100">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          <div>
            <div className="text-xs text-gray-600 font-medium mb-1">Voting Insights</div>
            {votingInsights.length > 0 ? (
              <ul className="text-xs text-gray-500 space-y-1">
                {votingInsights.map((insight, index) => (
                  <li key={index} className="flex items-center">
                    <span className="inline-block w-1.5 h-1.5 bg-purple-500 rounded-full mr-2 flex-shrink-0"></span>
                    {insight}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-gray-500">Not enough voting data for insights</p>
            )}
          </div>
          
          <div>
            {electionFilter !== 'all' && electionOptions.find(e => e.id.toString() === electionFilter) && (
              <div className="text-xs text-gray-500">
                <span className="text-gray-600 font-medium">Current filter: </span>
                <span className="text-gray-900">
                  {electionOptions.find(e => e.id.toString() === electionFilter)?.name}
                </span>
              </div>
            )}
            {peakVotingTime && peakVotingTime.length > 0 && (
              <div className="text-xs text-gray-500 mt-1">
                <span className="text-gray-600 font-medium">Peak activity: </span>
                <span className="text-gray-900">
                  {peakVotingTime[0].fullDate} at {peakVotingTime[0].hour}
                </span>
              </div>
            )}
          </div>
        </div>
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

  // Calculate metrics - making sure to parse string values to integers
  const totalVoters = Array.isArray(facultyData) 
    ? facultyData.reduce((sum, faculty) => sum + parseInt(faculty.total_students.toString()), 0)
    : 0;
    
  // Debugging the faculty data and totalVoters calculation
  console.log("Faculty Data:", facultyData);
  console.log("Calculated Total Voters:", totalVoters);
  
  // Count new tickets
  const newTickets = Array.isArray(ticketsData) 
    ? ticketsData.filter((ticket: any) => ticket.status === 'open').length 
    : 0;

  // Handle redirects with useEffect
  useEffect(() => {
    if (user && !user.isAdmin) {
      navigate('/');
    }
  }, [user, navigate]);

  if (!user?.isAdmin) {
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
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
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
                    <p className="text-sm text-purple-200">New Tickets</p>
                    <h3 className="text-2xl font-bold text-white">{newTickets}</h3>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <LiveElectionResults />
            <CompletedElectionWinners />
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