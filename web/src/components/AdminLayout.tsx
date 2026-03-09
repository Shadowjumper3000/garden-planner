import { useEffect } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Button } from './ui/button';
import { 
  BarChart3, 
  Users, 
  ClipboardList, 
  Settings, 
  Home,
  LogOut,
  LineChart,
  ExternalLink
} from 'lucide-react';
import ErrorBoundary from './ErrorBoundary';

const AdminLayout = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  
  useEffect(() => {
    // Redirect non-admin users
    if (user && user.role !== 'admin') {
      navigate('/');
    }
  }, [user, navigate]);

  if (!user || user.role !== 'admin') {
    return <div className="flex items-center justify-center h-screen">Loading...</div>;
  }

  const navigationItems = [
    { name: 'Overview', href: '/admin', icon: <BarChart3 className="h-5 w-5" /> },
    { name: 'Users', href: '/admin/users', icon: <Users className="h-5 w-5" /> },
    { name: 'User Activities', href: '/admin/activities', icon: <ClipboardList className="h-5 w-5" /> },
    { name: 'Settings', href: '/admin/settings', icon: <Settings className="h-5 w-5" /> },
  ];

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <div className="w-64 bg-slate-800 text-white flex flex-col">
        <div className="p-6">
          <h1 className="text-xl font-bold">Admin Dashboard</h1>
          <div className="text-sm text-slate-400 mt-1">Garden Planner</div>
        </div>
        
        <nav className="flex-1 p-4">
          <ul className="space-y-1">
            {navigationItems.map((item) => (
              <li key={item.name}>
                <Link
                  to={item.href}
                  className={`flex items-center px-4 py-3 rounded-md hover:bg-slate-700 transition-colors
                    ${location.pathname === item.href ? 'bg-slate-700 text-white' : 'text-slate-300'}`}
                >
                  {item.icon}
                  <span className="ml-3">{item.name}</span>
                </Link>
              </li>
            ))}
          </ul>

          {/* Grafana dashboard — proxied at /admin/dashboard/ by nginx */}
          <div className="mt-4 pt-4 border-t border-slate-700">
            <a
              href="/admin/dashboard/"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center px-4 py-3 rounded-md text-slate-300 hover:bg-slate-700 hover:text-white transition-colors"
            >
              <LineChart className="h-5 w-5" />
              <span className="ml-3">Grafana Dashboard</span>
              <ExternalLink className="ml-auto h-3.5 w-3.5 opacity-60" />
            </a>
          </div>
        </nav>
        
        <div className="p-4 border-t border-slate-700">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="font-medium">{user.name}</p>
              <p className="text-sm text-slate-400">Admin</p>
            </div>
          </div>
          
          <div className="flex space-x-2">
            <Button variant="outline" size="sm" className="flex-1 justify-start" onClick={() => navigate('/')}>
              <Home className="mr-2 h-4 w-4" />
              Home
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              className="flex-1 justify-start" 
              onClick={() => {
                logout();
                navigate('/'); // Redirect to home page after logout
              }}
            >
              <LogOut className="mr-2 h-4 w-4" />
              Logout
            </Button>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto p-8 bg-slate-50">
          <ErrorBoundary>
            <Outlet />
          </ErrorBoundary>
        </div>
      </div>
    </div>
  );
};

export default AdminLayout;