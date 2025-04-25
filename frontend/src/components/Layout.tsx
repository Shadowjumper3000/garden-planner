
import { useAuth } from "@/contexts/AuthContext";
import { Link } from "react-router-dom";
import { Button } from "./ui/button";
import { Home, Leaf, LogOut, User } from "lucide-react";

interface LayoutProps {
  children: React.ReactNode;
}

const Layout = ({ children }: LayoutProps) => {
  const { isAuthenticated, logout, user } = useAuth();

  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-garden-primary text-white shadow-md">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center space-x-2">
            <Leaf className="h-6 w-6" />
            <h1 className="text-xl font-serif font-bold">Garden Planner</h1>
          </Link>
          
          <nav className="hidden md:flex items-center space-x-6">
            <Link to="/" className="hover:text-garden-light transition-colors">
              Home
            </Link>
            {isAuthenticated && (
              <>
                <Link to="/plants" className="hover:text-garden-light transition-colors">
                  Plant Library
                </Link>
              </>
            )}
          </nav>
          
          <div className="flex items-center space-x-4">
            {isAuthenticated ? (
              <div className="flex items-center space-x-4">
                <span className="hidden md:inline-block text-sm text-garden-light">
                  Welcome, {user?.name}
                </span>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={logout}
                  className="bg-transparent border-white text-white hover:bg-white/10"
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  <span className="hidden md:inline">Logout</span>
                </Button>
              </div>
            ) : (
              <Link to="/login">
                <Button 
                  variant="outline"
                  size="sm"
                  className="bg-transparent border-white text-white hover:bg-white/10"
                >
                  <User className="h-4 w-4 mr-2" />
                  <span className="hidden md:inline">Login</span>
                </Button>
              </Link>
            )}
          </div>
        </div>
      </header>
      
      <main className="flex-1 bg-garden-light/30">
        {children}
      </main>
      
      <footer className="bg-garden-soil text-white py-6">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="mb-4 md:mb-0">
              <p className="text-garden-sand">© 2025 Garden Planner</p>
            </div>
            <div className="flex flex-wrap space-x-6 text-sm">
              <a href="#" className="text-garden-sand hover:text-white transition-colors">Privacy Policy</a>
              <a href="#" className="text-garden-sand hover:text-white transition-colors">Terms of Service</a>
              <a href="#" className="text-garden-sand hover:text-white transition-colors">Contact</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Layout;
