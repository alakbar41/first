import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { toast } from '@/hooks/use-toast';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { AlertCircle, CheckCircle, Clock, Database, Info, Percent, Users, Vote } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { format } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';
import { apiRequest } from '@/lib/queryClient';
import {
  FacultyParticipation,
  VoteTimeline,
  BlockchainStats,
  ActiveElection,
  ParticipationOverview,
  Election
} from '@/lib/dashboard-types';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#FF6B6B'];

const AdminDashboard = () => {
  const [selectedElection, setSelectedElection] = useState<string>('');

  // Fetch participation metrics by faculty
  const { 
    data: facultyParticipation,
    isLoading: facultyLoading
  } = useQuery<FacultyParticipation[]>({
    queryKey: ['/api/dashboard/metrics/faculty-participation', selectedElection],
    queryFn: async () => {
      const endpoint = selectedElection 
        ? `/api/dashboard/metrics/faculty-participation?electionId=${selectedElection}` 
        : '/api/dashboard/metrics/faculty-participation';
      const response = await apiRequest({ url: endpoint });
      return response as FacultyParticipation[];
    }
  });

  // Fetch voting timeline data
  const { 
    data: votingTimeline,
    isLoading: timelineLoading
  } = useQuery<VoteTimeline[]>({
    queryKey: ['/api/dashboard/metrics/voting-timeline', selectedElection],
    queryFn: async () => {
      const endpoint = selectedElection 
        ? `/api/dashboard/metrics/voting-timeline?electionId=${selectedElection}` 
        : '/api/dashboard/metrics/voting-timeline';
      const response = await apiRequest({ url: endpoint });
      return response as VoteTimeline[];
    }
  });

  // Fetch blockchain metrics
  const { 
    data: blockchainStats,
    isLoading: blockchainLoading
  } = useQuery<BlockchainStats>({
    queryKey: ['/api/dashboard/metrics/blockchain-status'],
    queryFn: async () => {
      const response = await apiRequest({ url: '/api/dashboard/metrics/blockchain-status' });
      return response as BlockchainStats;
    }
  });

  // Fetch active elections data
  const { 
    data: activeElections,
    isLoading: activeElectionsLoading
  } = useQuery<(ActiveElection & { candidates: any[] })[]>({
    queryKey: ['/api/dashboard/metrics/active-elections'],
    queryFn: async () => {
      const response = await apiRequest({ url: '/api/dashboard/metrics/active-elections' });
      return response as (ActiveElection & { candidates: any[] })[];
    }
  });

  // Fetch participation overview
  const { 
    data: participationOverview,
    isLoading: participationOverviewLoading
  } = useQuery<ParticipationOverview[]>({
    queryKey: ['/api/dashboard/metrics/participation-overview'],
    queryFn: async () => {
      const response = await apiRequest({ url: '/api/dashboard/metrics/participation-overview' });
      return response as ParticipationOverview[];
    }
  });

  // Fetch all elections for filter dropdown
  const { 
    data: elections,
    isLoading: electionsLoading
  } = useQuery<Election[]>({
    queryKey: ['/api/elections'],
    queryFn: async () => {
      const response = await apiRequest({ url: '/api/elections' });
      return response as Election[];
    }
  });

  // Format timeline data for chart
  const formattedTimelineData = React.useMemo(() => {
    if (!votingTimeline) return [];
    
    return votingTimeline.map((item: any) => ({
      hour: format(new Date(item.hour), 'MMM dd, HH:mm'),
      votes: Number(item.vote_count)
    }));
  }, [votingTimeline]);

  // Calculate blockchain deployment rate
  const blockchainDeploymentRate = React.useMemo(() => {
    if (!blockchainStats) return 0;
    const { total_elections, blockchain_elections } = blockchainStats;
    return total_elections > 0 ? Math.round((blockchain_elections / total_elections) * 100) : 0;
  }, [blockchainStats]);

  // Calculate transaction success rate
  const transactionSuccessRate = React.useMemo(() => {
    if (!blockchainStats?.transaction_stats) return 0;
    const { total_transactions, successful_transactions } = blockchainStats.transaction_stats;
    return total_transactions > 0 
      ? Math.round((successful_transactions / total_transactions) * 100) 
      : 0;
  }, [blockchainStats]);

  // Handle errors
  const handleError = (error: any) => {
    console.error('Dashboard error:', error);
    toast({
      title: 'Error loading dashboard data',
      description: error.message || 'Please try again later',
      variant: 'destructive'
    });
  };

  return (
    <div className="container mx-auto py-6">
      <h1 className="text-3xl font-bold mb-6">Admin Dashboard</h1>
      
      {/* Election Filter */}
      <div className="mb-6">
        <Select value={selectedElection} onValueChange={setSelectedElection}>
          <SelectTrigger className="w-full md:w-[300px]">
            <SelectValue placeholder="All Elections (Filter by election)" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">All Elections</SelectItem>
            {elections?.map((election: any) => (
              <SelectItem key={election.id} value={election.id.toString()}>
                {election.name} ({election.position})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {/* Blockchain Deployment Rate */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center">
              <Database className="mr-2 h-4 w-4" />
              Blockchain Deployment Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            {blockchainLoading ? (
              <Skeleton className="h-8 w-full" />
            ) : (
              <>
                <div className="text-2xl font-bold">{blockchainDeploymentRate}%</div>
                <Progress 
                  value={blockchainDeploymentRate} 
                  className="h-2 mt-2" 
                />
                <p className="text-xs text-muted-foreground mt-2">
                  {blockchainStats?.blockchain_elections} of {blockchainStats?.total_elections} elections on blockchain
                </p>
              </>
            )}
          </CardContent>
        </Card>

        {/* Transaction Success Rate */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center">
              <CheckCircle className="mr-2 h-4 w-4" />
              Transaction Success Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            {blockchainLoading ? (
              <Skeleton className="h-8 w-full" />
            ) : (
              <>
                <div className="text-2xl font-bold">{transactionSuccessRate}%</div>
                <Progress 
                  value={transactionSuccessRate} 
                  className="h-2 mt-2" 
                />
                <p className="text-xs text-muted-foreground mt-2">
                  {blockchainStats?.transaction_stats?.successful_transactions} of {blockchainStats?.transaction_stats?.total_transactions} transactions successful
                </p>
              </>
            )}
          </CardContent>
        </Card>

        {/* Active Elections */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center">
              <Vote className="mr-2 h-4 w-4" />
              Active Elections
            </CardTitle>
          </CardHeader>
          <CardContent>
            {activeElectionsLoading ? (
              <Skeleton className="h-8 w-full" />
            ) : (
              <>
                <div className="text-2xl font-bold">{activeElections?.length || 0}</div>
                <div className="flex flex-wrap gap-2 mt-2">
                  {activeElections?.map((election: any) => (
                    <Badge key={election.id} variant="secondary">
                      {election.name}
                    </Badge>
                  ))}
                  {(!activeElections || activeElections.length === 0) && (
                    <p className="text-xs text-muted-foreground">No active elections</p>
                  )}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="participation" className="space-y-4">
        <TabsList>
          <TabsTrigger value="participation">Faculty Participation</TabsTrigger>
          <TabsTrigger value="timeline">Voting Timeline</TabsTrigger>
          <TabsTrigger value="blockchain">Blockchain Status</TabsTrigger>
          <TabsTrigger value="active">Active Elections</TabsTrigger>
        </TabsList>
        
        {/* Faculty Participation Tab */}
        <TabsContent value="participation" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Faculty Participation Breakdown</CardTitle>
              <CardDescription>
                Percentage of eligible students who voted by faculty
              </CardDescription>
            </CardHeader>
            <CardContent>
              {facultyLoading ? (
                <div className="w-full h-[300px] flex items-center justify-center">
                  <Skeleton className="h-[300px] w-full" />
                </div>
              ) : facultyParticipation?.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart
                    data={facultyParticipation}
                    margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="faculty" />
                    <YAxis label={{ value: 'Participation %', angle: -90, position: 'insideLeft' }} />
                    <Tooltip 
                      formatter={(value: any) => [`${value}%`, 'Participation']}
                      labelFormatter={(label) => `Faculty: ${label}`}
                    />
                    <Legend />
                    <Bar 
                      dataKey="participation_percentage" 
                      fill="#8884d8" 
                      name="Participation Rate" 
                      label={{ position: 'top' }}
                    />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="w-full h-[300px] flex items-center justify-center text-muted-foreground">
                  No participation data available
                </div>
              )}
            </CardContent>
            <CardFooter>
              <p className="text-sm text-muted-foreground">
                <Info className="inline mr-1 h-4 w-4" />
                Higher participation rates indicate stronger faculty engagement
              </p>
            </CardFooter>
          </Card>
        </TabsContent>
        
        {/* Voting Timeline Tab */}
        <TabsContent value="timeline">
          <Card>
            <CardHeader>
              <CardTitle>Voting Activity Timeline</CardTitle>
              <CardDescription>
                Vote counts aggregated by hour
              </CardDescription>
            </CardHeader>
            <CardContent>
              {timelineLoading ? (
                <div className="w-full h-[300px] flex items-center justify-center">
                  <Skeleton className="h-[300px] w-full" />
                </div>
              ) : formattedTimelineData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart
                    data={formattedTimelineData}
                    margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="hour" 
                      angle={-45} 
                      textAnchor="end" 
                      height={80}
                      interval={0}
                    />
                    <YAxis label={{ value: 'Vote Count', angle: -90, position: 'insideLeft' }} />
                    <Tooltip />
                    <Legend />
                    <Line 
                      type="monotone" 
                      dataKey="votes" 
                      stroke="#8884d8" 
                      activeDot={{ r: 8 }} 
                      name="Votes"
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="w-full h-[300px] flex items-center justify-center text-muted-foreground">
                  No timeline data available
                </div>
              )}
            </CardContent>
            <CardFooter>
              <p className="text-sm text-muted-foreground">
                <Clock className="inline mr-1 h-4 w-4" />
                Patterns show peak voting times and participation trends
              </p>
            </CardFooter>
          </Card>
        </TabsContent>
        
        {/* Blockchain Status Tab */}
        <TabsContent value="blockchain">
          <Card>
            <CardHeader>
              <CardTitle>Blockchain Deployment Status</CardTitle>
              <CardDescription>
                Status of elections deployed to blockchain
              </CardDescription>
            </CardHeader>
            <CardContent>
              {blockchainLoading ? (
                <div className="w-full h-[300px] flex items-center justify-center">
                  <Skeleton className="h-[300px] w-full" />
                </div>
              ) : blockchainStats?.elections?.length > 0 ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <h3 className="text-lg font-semibold mb-2">Blockchain Deployment</h3>
                      <ResponsiveContainer width="100%" height={200}>
                        <PieChart>
                          <Pie
                            data={[
                              { name: 'On Blockchain', value: blockchainStats.blockchain_elections },
                              { name: 'Not on Blockchain', value: blockchainStats.total_elections - blockchainStats.blockchain_elections }
                            ]}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                            outerRadius={80}
                            fill="#8884d8"
                            dataKey="value"
                          >
                            {[0, 1].map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip formatter={(value) => [value, 'Elections']} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold mb-2">Transaction Success</h3>
                      <ResponsiveContainer width="100%" height={200}>
                        <PieChart>
                          <Pie
                            data={[
                              { 
                                name: 'Successful', 
                                value: blockchainStats.transaction_stats.successful_transactions 
                              },
                              { 
                                name: 'Failed', 
                                value: blockchainStats.transaction_stats.total_transactions - 
                                  blockchainStats.transaction_stats.successful_transactions 
                              }
                            ]}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                            outerRadius={80}
                            fill="#8884d8"
                            dataKey="value"
                          >
                            {[0, 1].map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip formatter={(value) => [value, 'Transactions']} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                  
                  <div className="mt-6">
                    <h3 className="text-lg font-semibold mb-2">Election Blockchain Status</h3>
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50 dark:bg-gray-800">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                              Election
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                              Position
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                              Status
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                              Blockchain
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                          {blockchainStats.elections.map((election: any) => (
                            <tr key={election.id}>
                              <td className="px-6 py-4 whitespace-nowrap text-sm">{election.name}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm">{election.position}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm">
                                <Badge variant={
                                  election.status === 'active' ? 'default' : 
                                  election.status === 'upcoming' ? 'secondary' : 'outline'
                                }>
                                  {election.status}
                                </Badge>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm">
                                {election.is_on_blockchain ? (
                                  <Badge variant="success" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100">
                                    <Database className="mr-1 h-3 w-3" />
                                    On Chain
                                  </Badge>
                                ) : (
                                  <Badge variant="destructive" className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100">
                                    <AlertCircle className="mr-1 h-3 w-3" />
                                    Not Deployed
                                  </Badge>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="w-full h-[300px] flex items-center justify-center text-muted-foreground">
                  No blockchain data available
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Active Elections Tab */}
        <TabsContent value="active">
          <Card>
            <CardHeader>
              <CardTitle>Active Elections</CardTitle>
              <CardDescription>
                Live vote count updates for ongoing elections
              </CardDescription>
            </CardHeader>
            <CardContent>
              {activeElectionsLoading ? (
                <div className="w-full h-[300px] flex items-center justify-center">
                  <Skeleton className="h-[300px] w-full" />
                </div>
              ) : activeElections?.length > 0 ? (
                <div className="space-y-8">
                  {activeElections.map((election: any) => (
                    <div key={election.id} className="border rounded-lg p-4">
                      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4">
                        <div>
                          <h3 className="text-lg font-semibold">{election.name}</h3>
                          <p className="text-sm text-muted-foreground">{election.position}</p>
                        </div>
                        <div className="mt-2 md:mt-0">
                          <div className="flex items-center gap-2">
                            <Users className="h-4 w-4" />
                            <span className="text-sm">
                              {election.vote_count} / {election.total_eligible_voters} voters participated
                            </span>
                          </div>
                          <div className="mt-1">
                            <Progress 
                              value={(election.vote_count / election.total_eligible_voters) * 100}
                              className="h-2"
                            />
                          </div>
                        </div>
                      </div>

                      <div className="mt-4">
                        <h4 className="text-md font-medium mb-2">Candidate Results:</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <table className="min-w-full divide-y divide-gray-200">
                              <thead className="bg-gray-50 dark:bg-gray-800">
                                <tr>
                                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                    Candidate
                                  </th>
                                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                    Faculty
                                  </th>
                                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                    Votes
                                  </th>
                                </tr>
                              </thead>
                              <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                                {election.candidates.map((candidate: any) => (
                                  <tr key={candidate.id}>
                                    <td className="px-4 py-2 whitespace-nowrap text-sm">
                                      {candidate.full_name}
                                    </td>
                                    <td className="px-4 py-2 whitespace-nowrap text-sm">
                                      {candidate.faculty_name || candidate.faculty}
                                    </td>
                                    <td className="px-4 py-2 whitespace-nowrap text-sm font-medium">
                                      {candidate.vote_count}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                          <div>
                            <ResponsiveContainer width="100%" height={200}>
                              <PieChart>
                                <Pie
                                  dataKey="vote_count"
                                  nameKey="full_name"
                                  data={election.candidates}
                                  cx="50%"
                                  cy="50%"
                                  outerRadius={80}
                                  fill="#8884d8"
                                  label={({ full_name, vote_count, percent }) => 
                                    `${full_name.split(' ')[0]}: ${vote_count} (${(percent * 100).toFixed(0)}%)`
                                  }
                                >
                                  {election.candidates.map((_: any, index: number) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                  ))}
                                </Pie>
                                <Tooltip />
                              </PieChart>
                            </ResponsiveContainer>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="w-full h-[300px] flex items-center justify-center text-muted-foreground">
                  No active elections at this time
                </div>
              )}
            </CardContent>
            <CardFooter>
              <p className="text-sm text-muted-foreground">
                <Percent className="inline mr-1 h-4 w-4" />
                Results update automatically as votes are cast
              </p>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminDashboard;