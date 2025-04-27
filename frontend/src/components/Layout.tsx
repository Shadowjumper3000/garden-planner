import { useAuth } from "@/contexts/AuthContext";
import { Link } from "react-router-dom";
import { Button } from "./ui/button";
import { Home, Leaf, LogOut, User, LayoutDashboard, Menu, X, Sprout } from "lucide-react";
import { useState } from "react";
import { Sheet, SheetContent, SheetTrigger } from "./ui/sheet";

interface LayoutProps {
  children: React.ReactNode;
}

const Layout = ({ children }: LayoutProps) => {
  const { isAuthenticated, logout, user } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

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
              {isAuthenticated ? "My Gardens" : "Home"}
            </Link>
            {isAuthenticated && (
              <>
                <Link to="/plants" className="hover:text-garden-light transition-colors">
                  Plant Library
                </Link>
                {user?.role === 'admin' && (
                  <Link to="/admin" className="hover:text-garden-light transition-colors flex items-center">
                    <LayoutDashboard className="h-4 w-4 mr-1" />
                    Admin
                  </Link>
                )}
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
                  <LogOut className="h-4 w-4 md:mr-2" />
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
                  <User className="h-4 w-4 md:mr-2" />
                  <span className="hidden md:inline">Login</span>
                </Button>
              </Link>
            )}
            
            {/* Mobile Menu Button */}
            <Sheet open={isMenuOpen} onOpenChange={setIsMenuOpen}>
              <SheetTrigger asChild className="flex md:hidden">
                <Button variant="ghost" size="icon" className="text-white hover:bg-white/10">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[250px] bg-garden-primary/95 text-white border-garden-primary">
                <div className="flex flex-col space-y-6 pt-6">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-2">
                      <Leaf className="h-5 w-5" />
                      <span className="font-serif font-bold">Garden Planner</span>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => setIsMenuOpen(false)} className="text-white hover:bg-white/10">
                      <X className="h-5 w-5" />
                    </Button>
                  </div>
                  
                  {isAuthenticated ? (
                    <div className="flex flex-col space-y-1">
                      <p className="px-2 py-1 text-sm text-garden-light mb-2">
                        Welcome, {user?.name}
                      </p>
                      <Link 
                        to="/" 
                        className="flex items-center gap-2 px-2 py-3 hover:bg-white/10 rounded-md"
                        onClick={() => setIsMenuOpen(false)}
                      >
                        <Home className="h-5 w-5" />
                        <span>My Gardens</span>
                      </Link>
                      <Link 
                        to="/plants" 
                        className="flex items-center gap-2 px-2 py-3 hover:bg-white/10 rounded-md"
                        onClick={() => setIsMenuOpen(false)}
                      >
                        <Sprout className="h-5 w-5" />
                        <span>Plant Library</span>
                      </Link>
                      {user?.role === 'admin' && (
                        <Link 
                          to="/admin" 
                          className="flex items-center gap-2 px-2 py-3 hover:bg-white/10 rounded-md"
                          onClick={() => setIsMenuOpen(false)}
                        >
                          <LayoutDashboard className="h-5 w-5" />
                          <span>Admin Dashboard</span>
                        </Link>
                      )}
                      <Button 
                        variant="ghost" 
                        className="flex items-center justify-start gap-2 px-2 py-3 hover:bg-white/10 hover:text-white text-white rounded-md"
                        onClick={() => {
                          logout();
                          setIsMenuOpen(false);
                        }}
                      >
                        <LogOut className="h-5 w-5" />
                        <span>Logout</span>
                      </Button>
                    </div>
                  ) : (
                    <div className="flex flex-col space-y-1">
                      <Link 
                        to="/" 
                        className="flex items-center gap-2 px-2 py-3 hover:bg-white/10 rounded-md"
                        onClick={() => setIsMenuOpen(false)}
                      >
                        <Home className="h-5 w-5" />
                        <span>Home</span>
                      </Link>
                      <Link 
                        to="/login" 
                        className="flex items-center gap-2 px-2 py-3 hover:bg-white/10 rounded-md"
                        onClick={() => setIsMenuOpen(false)}
                      >
                        <User className="h-5 w-5" />
                        <span>Login</span>
                      </Link>
                      <Link 
                        to="/register" 
                        className="flex items-center gap-2 px-2 py-3 hover:bg-white/10 rounded-md"
                        onClick={() => setIsMenuOpen(false)}
                      >
                        <User className="h-5 w-5" />
                        <span>Register</span>
                      </Link>
                    </div>
                  )}
                </div>
              </SheetContent>
            </Sheet>
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
