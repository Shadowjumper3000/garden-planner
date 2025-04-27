import { useEffect, useState } from 'react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '../../components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '../../components/ui/alert-dialog';
import { Search, MoreHorizontal, Shield, UserRoundX, ChevronLeft, ChevronRight, UserPlus } from 'lucide-react';
import { useToast } from '../../components/ui/use-toast';
import { adminAPI, authAPI } from '../../api';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  lastLogin: string;
  createdAt: string;
}

interface UsersResponse {
  users: User[];
  total: number;
  page: number;
  pageSize: number;
}

const UsersPage = () => {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [users, setUsers] = useState<User[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [search, setSearch] = useState('');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isRoleDialogOpen, setIsRoleDialogOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState('');
  const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState(false);
  const [isCreatingDemoUser, setIsCreatingDemoUser] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const { toast } = useToast();

  // Check if user is admin
  useEffect(() => {
    if (isAuthenticated && user) {
      if (user.role !== 'admin') {
        setAuthError("You don't have permission to access this page. Admin role required.");
        toast({
          title: "Access Denied",
          description: "You don't have permission to access the admin area.",
          variant: "destructive",
        });
      }
    } else if (!isLoading) {
      // Not authenticated and not in loading state
      navigate('/login?redirect=/admin/users');
    }
  }, [isAuthenticated, user, navigate]);

  const fetchUsers = async () => {
    try {
      setIsLoading(true);
      console.log('Fetching users with params:', { page, pageSize, search });
      const response = await adminAPI.getUsers(page, pageSize, search || undefined);
      
      console.log('User API response:', response);
      setUsers(response.users);
      setTotal(response.total);
      setPage(response.page);
    } catch (err) {
      console.error('Failed to fetch users:', err);
      toast({
        title: 'Error',
        description: 'Failed to load users. Please try again.',
        variant: 'destructive',
      });
      
      // Check if this might be an auth error
      if (err instanceof Error && err.message.includes('API returned HTML')) {
        setAuthError('Authentication error. Please log in again.');
        toast({
          title: 'Session Expired',
          description: 'Your session has expired. Please log in again.',
          variant: 'destructive',
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [page, pageSize]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1); // Reset page when searching
    fetchUsers();
  };

  const handleRoleUpdate = async () => {
    if (!selectedUser || !selectedRole) return;

    try {
      await adminAPI.setUserRole(selectedUser.id, selectedRole as 'user' | 'admin');

      // Update local state
      setUsers(prev => 
        prev.map(user => 
          user.id === selectedUser.id ? { ...user, role: selectedRole } : user
        )
      );

      toast({
        title: 'Role Updated',
        description: `${selectedUser.name}'s role has been updated to ${selectedRole}.`,
      });

      setIsRoleDialogOpen(false);
    } catch (err) {
      console.error('Failed to update role:', err);
      toast({
        title: 'Error',
        description: 'Failed to update user role. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const openRoleDialog = (user: User) => {
    setSelectedUser(user);
    setSelectedRole(user.role);
    setIsRoleDialogOpen(true);
  };

  const createDemoUser = async () => {
    try {
      setIsCreatingDemoUser(true);
      // Generate a random email to avoid conflicts
      const randomSuffix = Math.floor(Math.random() * 10000);
      const demoUser = {
        name: `Demo User ${randomSuffix}`,
        email: `demo.user${randomSuffix}@example.com`,
        password: 'Password123!'
      };
      
      await authAPI.register(demoUser.name, demoUser.email, demoUser.password);
      
      toast({
        title: 'Demo User Created',
        description: `Created user: ${demoUser.email} with password: ${demoUser.password}`,
      });
      
      // Refetch users list
      fetchUsers();
    } catch (err) {
      console.error('Failed to create demo user:', err);
      toast({
        title: 'Error',
        description: 'Failed to create demo user. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsCreatingDemoUser(false);
    }
  };

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="container mx-auto">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <h1 className="text-3xl font-bold">User Management</h1>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={createDemoUser} 
            disabled={isCreatingDemoUser}
            className="flex items-center gap-2"
          >
            <UserPlus className="h-4 w-4" />
            {isCreatingDemoUser ? 'Creating...' : 'Create Demo User'}
          </Button>
        </div>
        
        <form onSubmit={handleSearchSubmit} className="relative w-64">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search users..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8"
          />
        </form>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle>Users</CardTitle>
          <CardDescription>
            Manage user accounts and permissions for your garden planner application.
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
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Last Login</TableHead>
                    <TableHead>Joined</TableHead>
                    <TableHead className="w-16"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-slate-500">
                        No users found
                      </TableCell>
                    </TableRow>
                  ) : (
                    users.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell className="font-medium">{user.name}</TableCell>
                        <TableCell>{user.email}</TableCell>
                        <TableCell>
                          <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                            user.role === 'admin' ? 'bg-purple-100 text-purple-800' : 'bg-slate-100 text-slate-800'
                          }`}>
                            {user.role}
                          </span>
                        </TableCell>
                        <TableCell>
                          {user.lastLogin ? new Date(user.lastLogin).toLocaleDateString() : 'Never'}
                        </TableCell>
                        <TableCell>
                          {new Date(user.createdAt).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => openRoleDialog(user)}>
                                <Shield className="mr-2 h-4 w-4" />
                                <span>Change Role</span>
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem 
                                className="text-red-600"
                                onClick={() => {
                                  setSelectedUser(user);
                                  setIsConfirmDeleteOpen(true);
                                }}
                              >
                                <UserRoundX className="mr-2 h-4 w-4" />
                                <span>Deactivate</span>
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
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
                    <span className="font-medium">{total}</span> users
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

      {/* Role Change Dialog */}
      <Dialog open={isRoleDialogOpen} onOpenChange={setIsRoleDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change User Role</DialogTitle>
            <DialogDescription>
              Update the role for {selectedUser?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <div className="font-medium">Select Role</div>
              <div className="flex flex-col gap-2">
                <div className="flex items-center space-x-2">
                  <input
                    type="radio"
                    id="role-user"
                    name="role"
                    value="user"
                    checked={selectedRole === 'user'}
                    onChange={() => setSelectedRole('user')}
                    className="h-4 w-4 border-gray-300 text-primary focus:ring-primary"
                  />
                  <label htmlFor="role-user" className="block text-sm font-medium">
                    User - Can manage their own gardens only
                  </label>
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="radio"
                    id="role-admin"
                    name="role"
                    value="admin"
                    checked={selectedRole === 'admin'}
                    onChange={() => setSelectedRole('admin')}
                    className="h-4 w-4 border-gray-300 text-primary focus:ring-primary"
                  />
                  <label htmlFor="role-admin" className="block text-sm font-medium">
                    Admin - Full access to all system features
                  </label>
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRoleDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleRoleUpdate}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm Delete Dialog */}
      <AlertDialog open={isConfirmDeleteOpen} onOpenChange={setIsConfirmDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action will deactivate {selectedUser?.name}'s account. They will no longer be able to access the system.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-red-600 hover:bg-red-700">
              Deactivate Account
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default UsersPage;