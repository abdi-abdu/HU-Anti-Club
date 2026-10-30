import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Menu, X, User, LogOut, LayoutDashboard, Calendar, FileText, MessageCircle, BookOpen, Users, Award } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { currentUser, userProfile, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  // ── public nav (guests only) ─────────────────────────────────────────────
  const publicLinks = [
    { to: '/',          label: 'Home'      },
    { to: '/about',     label: 'About'     },
    { to: '/events',    label: 'Events'    },
    { to: '/blog',      label: 'Blog'      },
    { to: '/resources', label: 'Resources' },
    { to: '/help',      label: 'Get Help'  },
  ];

  // ── admin dashboard nav ──────────────────────────────────────────────────
  const adminLinks = [
    { to: '/admin',            label: 'Overview',      icon: LayoutDashboard },
    { to: '/admin/members',    label: 'Members',       icon: Users           },
    { to: '/admin/leadership', label: 'Leadership',    icon: Award           },
    { to: '/admin/events',     label: 'Events',        icon: Calendar        },
    { to: '/admin/posts',      label: 'Blog Posts',    icon: FileText        },
    { to: '/admin/messages',   label: 'Help Messages', icon: MessageCircle   },
  ];

  // ── student dashboard nav ────────────────────────────────────────────────
  const studentLinks = [
    { to: '/profile',   label: 'My Profile', icon: User        },
    { to: '/events',    label: 'Events',     icon: Calendar    },
    { to: '/blog',      label: 'Blog',       icon: BookOpen    },
    { to: '/resources', label: 'Resources',  icon: FileText    },
    { to: '/help',      label: 'Get Help',   icon: MessageCircle },
  ];

  const isAdmin   = currentUser && userProfile?.role === 'admin';
  const isStudent = currentUser && userProfile?.role !== 'admin';

  const dashboardLinks = isAdmin ? adminLinks : studentLinks;
  const location = useLocation();

  return (
    <nav className="bg-white shadow-lg sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">

          {/* Logo */}
          <div className="flex items-center">
            <Link
              to={isAdmin ? '/admin' : isStudent ? '/profile' : '/'}
              className="flex items-center space-x-2"
            >
              <img src="/images/logo.png" alt="HU Anti-Drug Club Logo"
                className="h-10 w-10 object-contain rounded-full" />
              <span className="font-bold text-xl text-gray-900">HU Anti-Drug Club</span>
            </Link>
          </div>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center space-x-1">
            {/* Guest: show public links */}
            {!currentUser && publicLinks.map(link => (
              <Link key={link.to} to={link.to}
                className="text-gray-700 hover:text-primary-600 px-3 py-2 rounded-md text-sm font-medium transition-colors">
                {link.label}
              </Link>
            ))}

            {/* Logged in: show role-specific dashboard links */}
            {currentUser && dashboardLinks.map(link => (
              <Link key={link.label} to={link.to}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  location.pathname === link.to
                    ? 'bg-primary-50 text-primary-600'
                    : 'text-gray-700 hover:text-primary-600 hover:bg-gray-50'
                }`}>
                <link.icon className="h-4 w-4" />
                {link.label}
              </Link>
            ))}

            {/* Auth buttons / user menu */}
            {currentUser ? (
              <div className="relative group ml-4">
                <button className="flex items-center space-x-2 bg-gray-100 hover:bg-gray-200 px-3 py-2 rounded-lg text-gray-700 transition-colors">
                  <User className="h-4 w-4" />
                  <span className="text-sm font-medium">
                    {userProfile?.fullName?.split(' ')[0] || currentUser.email}
                  </span>
                  {isAdmin && (
                    <span className="bg-purple-100 text-purple-700 text-xs px-1.5 py-0.5 rounded-full">Admin</span>
                  )}
                </button>
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 border border-gray-100">
                  <div className="px-4 py-2 border-b border-gray-100">
                    <p className="text-xs text-gray-500">Signed in as</p>
                    <p className="text-sm font-medium text-gray-900 truncate">{currentUser.email}</p>
                  </div>
                  {isStudent && (
                    <Link to="/profile"
                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                      My Profile
                    </Link>
                  )}
                  <button onClick={handleLogout}
                    className="flex items-center w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50">
                    <LogOut className="h-4 w-4 mr-2" />
                    Logout
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center space-x-3 ml-4">
                <Link to="/login"
                  className="text-gray-700 hover:text-primary-600 px-3 py-2 rounded-md text-sm font-medium">
                  Login
                </Link>
                <Link to="/register" className="btn-primary text-sm">
                  Register
                </Link>
              </div>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden flex items-center">
            <button onClick={() => setIsOpen(!isOpen)}
              className="text-gray-700 hover:text-primary-600 focus:outline-none">
              {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {isOpen && (
          <div className="md:hidden">
            <div className="px-2 pt-2 pb-3 space-y-1 bg-gray-50 border-t border-gray-200">

              {/* Guest links */}
              {!currentUser && publicLinks.map(link => (
                <Link key={link.to} to={link.to}
                  className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-primary-600"
                  onClick={() => setIsOpen(false)}>
                  {link.label}
                </Link>
              ))}

              {/* Logged-in dashboard links */}
              {currentUser && dashboardLinks.map(link => (
                <Link key={link.label} to={link.to}
                  className={`flex items-center gap-2 px-3 py-2 rounded-md text-base font-medium ${
                    location.pathname === link.to
                      ? 'bg-primary-50 text-primary-600'
                      : 'text-gray-700 hover:text-primary-600'
                  }`}
                  onClick={() => setIsOpen(false)}>
                  <link.icon className="h-4 w-4" />
                  {link.label}
                </Link>
              ))}

              {/* User info + logout */}
              {currentUser ? (
                <div className="border-t border-gray-200 pt-3 mt-2">
                  <div className="px-3 py-2 mb-1">
                    <p className="text-sm font-medium text-gray-900">
                      {userProfile?.fullName || currentUser.email}
                    </p>
                    <p className="text-xs text-gray-500 capitalize">
                      {userProfile?.role} • {userProfile?.status}
                    </p>
                  </div>
                  <button
                    onClick={() => { handleLogout(); setIsOpen(false); }}
                    className="flex items-center w-full px-3 py-2 text-base font-medium text-red-600 hover:bg-red-50 rounded-md">
                    <LogOut className="h-4 w-4 mr-2" />
                    Logout
                  </button>
                </div>
              ) : (
                <div className="border-t border-gray-200 pt-3 mt-2 space-y-1">
                  <Link to="/login"
                    className="block px-3 py-2 text-base font-medium text-gray-700 hover:text-primary-600"
                    onClick={() => setIsOpen(false)}>
                    Login
                  </Link>
                  <Link to="/register"
                    className="block px-3 py-2 text-base font-medium text-primary-600 hover:text-primary-700"
                    onClick={() => setIsOpen(false)}>
                    Register
                  </Link>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
