import { useEffect, useState } from 'react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Search, ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
import { useToast } from '../../components/ui/use-toast';
import { adminAPI } from '../../api';

interface User {
  id: string;
  name: string;
  email: string;
}

interface UserActivity {
  id: string;
  userId: string;
  user?: User;
  activityType: string;
  resourceId?: string;
  resourceType?: string;
  timestamp: string;
  details?: Record<string, any>;
}

interface ActivitiesResponse {
  activities: UserActivity[];
  total: number;
  page: number;
  pageSize: number;
}

const activityTypeLabels: Record<string, string> = {
  LOGIN: 'Login',
  REGISTER: 'Registration',
  CREATE_GARDEN: 'Garden Created',
  ADD_PLANT: 'Plant Added',
  REMOVE_PLANT: 'Plant Removed',
  UPDATE_GARDEN: 'Garden Updated',
  VIEW_GARDEN: 'Garden Viewed',
};

const ActivitiesPage = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [activities, setActivities] = useState<UserActivity[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [userIdFilter, setUserIdFilter] = useState('');
  const [activityTypeFilter, setActivityTypeFilter] = useState('all'); // Changed from empty string to 'all'
  const { toast } = useToast();

  const fetchActivities = async () => {
    try {
      setIsLoading(true);
      const filters: { activityType?: string, userId?: string } = {};
      
      if (userIdFilter) filters.userId = userIdFilter;
      if (activityTypeFilter && activityTypeFilter !== 'all') filters.activityType = activityTypeFilter;
      
      const response = await adminAPI.getUserActivities(page, pageSize, filters);

      setActivities(response.activities);
      setTotal(response.total);
    } catch (err) {
      console.error('Failed to fetch activities:', err);
      toast({
        title: 'Error',
        description: 'Failed to load user activities. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchActivities();
  }, [page, pageSize]);

  const handleFilterChange = () => {
    setPage(1); // Reset to first page when applying filters
    fetchActivities();
  };

  // Format the timestamp to a readable string
  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return new Intl.DateTimeFormat('en-US', {
      dateStyle: 'medium',
      timeStyle: 'short'
    }).format(date);
  };

  // Get a badge color based on activity type
  const getActivityBadgeColor = (activityType: string) => {
    switch (activityType) {
      case 'LOGIN':
        return 'bg-blue-100 text-blue-800';
      case 'REGISTER':
        return 'bg-green-100 text-green-800';
      case 'CREATE_GARDEN':
      case 'ADD_PLANT':
        return 'bg-amber-100 text-amber-800';
      case 'UPDATE_GARDEN':
        return 'bg-purple-100 text-purple-800';
      case 'REMOVE_PLANT':
        return 'bg-red-100 text-red-800';
      case 'VIEW_GARDEN':
        return 'bg-slate-100 text-slate-800';
      default:
        return 'bg-slate-100 text-slate-800';
    }
  };

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="container mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">User Activities</h1>
        <p className="text-slate-600 mt-2">
          Track and monitor all user actions within the garden planner application.
        </p>
      </div>

      {/* Filters */}
      <div className="mb-6 flex flex-wrap gap-4">
        <div className="w-64">
          <label className="block text-sm font-medium text-slate-700 mb-1">Activity Type</label>
          <Select value={activityTypeFilter} onValueChange={(value) => {
            setActivityTypeFilter(value);
            handleFilterChange();
          }}>
            <SelectTrigger>
              <SelectValue placeholder="All Activities" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Activities</SelectItem>
              <SelectItem value="LOGIN">Login</SelectItem>
              <SelectItem value="REGISTER">Registration</SelectItem>
              <SelectItem value="CREATE_GARDEN">Garden Created</SelectItem>
              <SelectItem value="ADD_PLANT">Plant Added</SelectItem>
              <SelectItem value="REMOVE_PLANT">Plant Removed</SelectItem>
              <SelectItem value="UPDATE_GARDEN">Garden Updated</SelectItem>
              <SelectItem value="VIEW_GARDEN">Garden Viewed</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="w-64">
          <label className="block text-sm font-medium text-slate-700 mb-1">User ID (Optional)</label>
          <div className="flex gap-2">
            <Input
              value={userIdFilter}
              onChange={(e) => setUserIdFilter(e.target.value)}
              placeholder="Filter by user ID"
            />
            <Button onClick={handleFilterChange} size="sm">
              <Search className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle>Activity Log</CardTitle>
          <CardDescription>
            View detailed user activity history to monitor usage patterns.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center my-8">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Time</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Activity</TableHead>
                    <TableHead>Resource</TableHead>
                    <TableHead>Details</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {activities.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-slate-500">
                        No activities found
                      </TableCell>
                    </TableRow>
                  ) : (
                    activities.map((activity) => (
                      <TableRow key={activity.id}>
                        <TableCell className="whitespace-nowrap">
                          <div className="flex items-center">
                            <Calendar className="h-4 w-4 mr-2 text-slate-400" />
                            {formatTimestamp(activity.timestamp)}
                          </div>
                        </TableCell>
                        <TableCell>
                          {activity.user ? (
                            <div>
                              <div className="font-medium">{activity.user.name}</div>
                              <div className="text-xs text-slate-500">{activity.user.email}</div>
                            </div>
                          ) : (
                            <span className="text-slate-500">User {activity.userId}</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                            getActivityBadgeColor(activity.activityType)
                          }`}>
                            {activityTypeLabels[activity.activityType] || activity.activityType}
                          </span>
                        </TableCell>
                        <TableCell>
                          {activity.resourceType && (
                            <div>
                              <span className="text-slate-600">{activity.resourceType}</span>
                              {activity.resourceId && (
                                <span className="text-xs ml-1 text-slate-500">({activity.resourceId.substring(0, 8)}...)</span>
                              )}
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          {activity.details && (
                            <pre className="text-xs overflow-hidden text-ellipsis max-w-xs">
                              {JSON.stringify(activity.details, null, 2).substring(0, 50)}
                              {JSON.stringify(activity.details, null, 2).length > 50 && '...'}
                            </pre>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between space-x-2 py-4">
                  <div className="text-sm text-muted-foreground">
                    Showing <span className="font-medium">{(page - 1) * pageSize + 1}</span> to{" "}
                    <span className="font-medium">{Math.min(page * pageSize, total)}</span> of{" "}
                    <span className="font-medium">{total}</span> activities
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(prev => Math.max(1, prev - 1))}
                      disabled={page === 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                      <span className="sr-only">Previous Page</span>
                    </Button>
                    <div className="text-sm font-medium">
                      Page {page} of {totalPages}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(prev => Math.min(totalPages, prev + 1))}
                      disabled={page === totalPages}
                    >
                      <ChevronRight className="h-4 w-4" />
                      <span className="sr-only">Next Page</span>
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ActivitiesPage;