import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { BarChart } from '../../components/ui/chart';
import { Users, Leaf, Calendar, Activity } from 'lucide-react';
import { adminAPI } from '../../api';

interface SystemStat {
  name: string;
  value: number;
}

interface DailyMetric {
  date: string;
  metricType: string;
  value: number;
}

interface MetricsData {
  systemStats: SystemStat[];
  dailyMetrics: DailyMetric[];
}

const Dashboard = () => {
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [metrics, setMetrics] = useState<MetricsData>({
    systemStats: [],
    dailyMetrics: []
  });
  const [error, setError] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState<string>('30days');

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        setIsLoading(true);
        const metricsData = await adminAPI.getMetrics();
        setMetrics(metricsData || { systemStats: [], dailyMetrics: [] });
        setError(null);
      } catch (err) {
        console.error('Failed to fetch metrics:', err);
        setError('Failed to load metrics data. Please try again later.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchMetrics();
  }, []);

  const getStat = (name: string) => {
    if (!metrics?.systemStats) return 0;
    return metrics.systemStats.find(stat => stat.name === name)?.value || 0;
  };

  // Prepare chart data
  const prepareUsersChartData = () => {
    if (!metrics?.dailyMetrics || metrics.dailyMetrics.length === 0) {
      return { labels: [], datasets: [] };
    }

    // Filter metrics by type and sort by date
    const activeUsers = metrics.dailyMetrics
      .filter(metric => metric.metricType === 'ACTIVE_USERS')
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    const newUsers = metrics.dailyMetrics
      .filter(metric => metric.metricType === 'NEW_USERS')
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // Get dates as labels
    const labels = activeUsers.map(metric => {
      const date = new Date(metric.date);
      return `${date.getMonth() + 1}/${date.getDate()}`;
    });

    return {
      labels,
      datasets: [
        {
          label: 'Active Users',
          data: activeUsers.map(metric => metric.value),
          backgroundColor: 'rgba(59, 130, 246, 0.5)',
          borderColor: 'rgb(59, 130, 246)',
          borderWidth: 1,
        },
        {
          label: 'New Users',
          data: newUsers.map(metric => metric.value),
          backgroundColor: 'rgba(16, 185, 129, 0.5)',
          borderColor: 'rgb(16, 185, 129)',
          borderWidth: 1,
        },
      ],
    };
  };

  const prepareGardensChartData = () => {
    if (!metrics?.dailyMetrics || metrics.dailyMetrics.length === 0) {
      return { labels: [], datasets: [] };
    }

    // Filter metrics and sort by date
    const newGardens = metrics.dailyMetrics
      .filter(metric => metric.metricType === 'NEW_GARDENS')
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // Get dates as labels
    const labels = newGardens.map(metric => {
      const date = new Date(metric.date);
      return `${date.getMonth() + 1}/${date.getDate()}`;
    });

    return {
      labels,
      datasets: [
        {
          label: 'New Gardens',
          data: newGardens.map(metric => metric.value),
          backgroundColor: 'rgba(245, 158, 11, 0.5)',
          borderColor: 'rgb(245, 158, 11)',
          borderWidth: 1,
        }
      ],
    };
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-2rem)]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-2rem)]">
        <div className="text-center">
          <h3 className="text-lg font-medium text-red-600 mb-2">Error</h3>
          <p className="text-slate-700">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto">
      <h1 className="text-3xl font-bold mb-6">Admin Dashboard</h1>
      
      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">Total Users</p>
                <h3 className="text-2xl font-bold">{getStat('TOTAL_USERS')}</h3>
              </div>
              <div className="bg-blue-100 p-3 rounded-full">
                <Users className="h-6 w-6 text-blue-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">Active Users (30d)</p>
                <h3 className="text-2xl font-bold">{getStat('ACTIVE_USERS_LAST_30_DAYS')}</h3>
              </div>
              <div className="bg-green-100 p-3 rounded-full">
                <Activity className="h-6 w-6 text-green-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">Total Gardens</p>
                <h3 className="text-2xl font-bold">{getStat('TOTAL_GARDENS')}</h3>
              </div>
              <div className="bg-amber-100 p-3 rounded-full">
                <Calendar className="h-6 w-6 text-amber-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">Total Plants</p>
                <h3 className="text-2xl font-bold">{getStat('TOTAL_PLANTS')}</h3>
              </div>
              <div className="bg-emerald-100 p-3 rounded-full">
                <Leaf className="h-6 w-6 text-emerald-500" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Charts */}
      <Tabs defaultValue="users" className="w-full">
        <TabsList>
          <TabsTrigger value="users">User Metrics</TabsTrigger>
          <TabsTrigger value="gardens">Garden Metrics</TabsTrigger>
        </TabsList>
        <TabsContent value="users">
          <Card>
            <CardHeader>
              <CardTitle>User Activity</CardTitle>
              <CardDescription>
                Daily active users and new user registrations over the last 30 days
              </CardDescription>
              <div className="flex items-center mt-2">
                <div className="space-x-2">
                  <select 
                    className="text-sm border rounded p-1"
                    value={timeRange} 
                    onChange={(e) => setTimeRange(e.target.value)}
                  >
                    <option value="7days">Last 7 Days</option>
                    <option value="30days">Last 30 Days</option>
                    <option value="90days">Last 90 Days</option>
                  </select>
                </div>
              </div>
            </CardHeader>
            <CardContent className="px-2">
              <div className="h-[300px]">
                <BarChart data={prepareUsersChartData()} />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="gardens">
          <Card>
            <CardHeader>
              <CardTitle>Garden Creation</CardTitle>
              <CardDescription>
                New gardens created over the last 30 days
              </CardDescription>
            </CardHeader>
            <CardContent className="px-2">
              <div className="h-[300px]">
                <BarChart data={prepareGardensChartData()} />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Last Updated */}
      <div className="text-right mt-6 text-sm text-slate-400">
        Last updated: {metrics?.systemStats.length > 0 && metrics.systemStats[0]?.lastUpdated 
          ? new Date(metrics.systemStats[0].lastUpdated).toLocaleString() 
          : 'N/A'
        }
      </div>
    </div>
  );
};

export default Dashboard;