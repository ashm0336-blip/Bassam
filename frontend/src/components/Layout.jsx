import { useState, useEffect } from "react";
import { Outlet, NavLink, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import { useLanguage } from "@/context/LanguageContext";
import { useSidebar } from "@/context/SidebarContext";
import { useHeader } from "@/context/HeaderContext";
import axios from "axios";
import { 
  LayoutDashboard, 
  ClipboardList, 
  LayoutGrid, 
  DoorOpen, 
  Users, 
  Circle,
  FileText,
  Bell,
  Settings,
  Menu,
  X,
  ChevronLeft,
  ChevronDown,
  Map,
  Shield,
  ShieldAlert,
  LogOut,
  Moon,
  Sun,
  Languages,
  Home,
  UserCheck,
  Building,
  MapPin,
  Navigation,
  Layers,
  List,
  Grid,
  Database,
  Archive,
  Folder,
  Calendar,
  BarChart3,
  PieChart,
  TrendingUp,
  Activity,
  User
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

// Icon mapping
const ICON_MAP = {
  LayoutDashboard, ClipboardList, LayoutGrid, DoorOpen, Users, Circle,
  FileText, Bell, Settings, Map, Shield, Home, UserCheck, Building,
  MapPin, Navigation, Layers, List, Grid, Database, Archive, Folder,
  Calendar, BarChart3, PieChart, TrendingUp, Activity, User, Menu
};

export const Layout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [expandedMenuId, setExpandedMenuId] = useState(null); // Only one menu can be open at a time
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout, isAdmin } = useAuth();
  const { theme, toggleTheme, isDark } = useTheme();
  const { t, language, toggleLanguage, isRTL } = useLanguage();
  const { menuItems, loading } = useSidebar();
  const { headerSettings } = useHeader();

  // Convert menu items from API to navigation format
  const allMenuItems = menuItems.map(item => ({
    ...item,
    name: language === 'ar' ? item.name_ar : item.name_en,
    icon: ICON_MAP[item.icon] || LayoutDashboard,
  })).filter(item => item.is_active); // Only show active items

  // Organize into parent and children
  const parentItems = allMenuItems.filter(item => !item.parent_id);
  const childrenMap = {};
  allMenuItems.filter(item => item.parent_id).forEach(child => {
    if (!childrenMap[child.parent_id]) {
      childrenMap[child.parent_id] = [];
    }
    childrenMap[child.parent_id].push(child);
  });

  // Split into primary and secondary navigation
  const navigation = parentItems.filter(item => !item.is_secondary);
  const secondaryNav = parentItems.filter(item => item.is_secondary);

  const toggleMenu = (menuId) => {
    // Close if same menu clicked, otherwise open new one (close others automatically)
    setExpandedMenuId(prev => prev === menuId ? null : menuId);
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const NavItem = ({ item, mobile = false, children = [] }) => {
    const isActive = location.pathname === item.href || 
                     (item.href.includes('?') && location.pathname + location.search === item.href);
    const Icon = item.icon;
    const hasChildren = children.length > 0;
    const isExpanded = expandedMenuId === item.id; // Check if THIS menu is the expanded one
    
    return (
      <div>
        <div className="relative">
          {hasChildren ? (
            <div
              onClick={() => toggleMenu(item.id)}
              className={`
                flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium
                transition-colors duration-200 relative cursor-pointer
                ${isActive 
                  ? "bg-primary/10 text-primary border-r-[3px] border-primary" 
                  : "text-muted-foreground hover:bg-muted hover:text-primary"
                }
                ${language === 'ar' ? 'flex-row-reverse' : ''}
              `}
            >
              <Icon className="w-5 h-5 flex-shrink-0" />
              {(sidebarOpen || mobile) && (
                <>
                  <span className="flex-1 text-right">{item.name}</span>
                  <ChevronDown 
                    className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} 
                  />
                </>
              )}
            </div>
          ) : (
            <NavLink
              to={item.href}
              onClick={() => mobile && setMobileMenuOpen(false)}
              className={`
                flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium
                transition-colors duration-200 relative
                ${isActive 
                  ? "bg-primary/10 text-primary border-r-[3px] border-primary" 
                  : "text-muted-foreground hover:bg-muted hover:text-primary"
                }
                ${language === 'ar' ? 'flex-row-reverse' : ''}
              `}
              data-testid={`nav-${item.href.replace("/", "") || "dashboard"}`}
            >
              <Icon className="w-5 h-5 flex-shrink-0" />
              {(sidebarOpen || mobile) && (
                <>
                  <span className="flex-1 text-right">{item.name}</span>
                  {item.badge && (
                    <Badge variant="destructive" className="text-xs px-2 py-0.5">
                      {item.badge}
                    </Badge>
                  )}
                </>
              )}
            </NavLink>
          )}
        </div>

        {/* Submenu items */}
        {hasChildren && isExpanded && (sidebarOpen || mobile) && (
          <div className={`mt-1 space-y-1 ${language === 'ar' ? 'pr-4' : 'pl-4'}`}>
            {children.map((child) => {
              const ChildIcon = child.icon;
              const isChildActive = location.pathname + location.search === child.href;
              return (
                <NavLink
                  key={child.id}
                  to={child.href}
                  onClick={() => mobile && setMobileMenuOpen(false)}
                  className={`
                    flex items-center gap-3 px-4 py-2 rounded-lg text-sm
                    transition-colors duration-200
                    ${isChildActive 
                      ? "bg-primary/10 text-primary" 
                      : "text-muted-foreground hover:bg-muted hover:text-primary"
                    }
                    ${language === 'ar' ? 'flex-row-reverse' : ''}
                  `}
                  data-testid={`nav-${child.href.replace("/", "")}`}
                >
                  <ChildIcon className="w-4 h-4 flex-shrink-0" />
                  <span className="flex-1 text-right">{child.name}</span>
                </NavLink>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Desktop Sidebar - Fixed */}
      <aside 
        className={`
          hidden lg:flex flex-col bg-card border-l border-border 
          transition-all duration-300 ease-in-out
          fixed right-0 top-0 h-screen z-40
          ${sidebarOpen ? "w-64" : "w-20"}
        `}
      >
        {/* Logo */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-border">
          {sidebarOpen && (
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center">
                <span className="text-white font-cairo font-bold text-lg">ح</span>
              </div>
              <div>
                <h1 className="font-cairo font-bold text-primary text-sm">{language === 'ar' ? 'خدمات الحشود' : 'Crowd Services'}</h1>
                <p className="text-[10px] text-muted-foreground">Al-Haram OS</p>
              </div>
            </div>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="text-muted-foreground hover:text-primary"
            data-testid="sidebar-toggle"
          >
            <ChevronLeft className={`w-5 h-5 transition-transform ${!sidebarOpen ? "rotate-180" : ""}`} />
          </Button>
        </div>

        {/* Navigation */}
        <ScrollArea className="flex-1 py-4">
          <nav className="space-y-1 px-3">
            {navigation.map((item) => (
              <NavItem 
                key={item.id} 
                item={item} 
                children={childrenMap[item.id] || []}
              />
            ))}
          </nav>
          
          <Separator className="my-4 mx-3" />
          
          <nav className="space-y-1 px-3">
            {secondaryNav.map((item) => (
              <NavItem 
                key={item.id} 
                item={item}
                children={childrenMap[item.id] || []}
              />
            ))}
          </nav>
        </ScrollArea>

        {/* User info */}
        {sidebarOpen && (
          <div className="p-4 border-t border-border">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-secondary/20 flex items-center justify-center">
                <span className="font-cairo font-semibold text-secondary-foreground">
                  {user?.name?.charAt(0) || 'م'}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{user?.name || t('platformName')}</p>
                <p className="text-xs text-muted-foreground truncate">
                  {user?.role === 'admin' ? (language === 'ar' ? 'مدير النظام' : 'System Admin') : 
                   user?.role === 'manager' ? (language === 'ar' ? 'مشرف' : 'Manager') : 
                   (language === 'ar' ? 'مستخدم' : 'User')}
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleLogout}
                className="text-muted-foreground hover:text-destructive"
                data-testid="logout-btn"
              >
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </aside>

      {/* Mobile menu overlay */}
      {mobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Mobile sidebar */}
      <aside 
        className={`
          fixed inset-y-0 right-0 w-72 bg-card z-50 transform transition-transform duration-300
          lg:hidden
          ${mobileMenuOpen ? "translate-x-0" : "translate-x-full"}
        `}
      >
        <div className="h-16 flex items-center justify-between px-4 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center">
              <span className="text-white font-cairo font-bold text-lg">ح</span>
            </div>
            <div>
              <h1 className="font-cairo font-bold text-primary text-sm">{language === 'ar' ? 'خدمات الحشود' : 'Crowd Services'}</h1>
              <p className="text-[10px] text-muted-foreground">Al-Haram OS</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setMobileMenuOpen(false)}
            data-testid="mobile-menu-close"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        <ScrollArea className="flex-1 py-4 h-[calc(100vh-64px)]">
          <nav className="space-y-1 px-3">
            {navigation.map((item) => (
              <NavItem 
                key={item.id} 
                item={item} 
                mobile 
                children={childrenMap[item.id] || []}
              />
            ))}
          </nav>
          
          <Separator className="my-4 mx-3" />
          
          <nav className="space-y-1 px-3">
            {secondaryNav.map((item) => (
              <NavItem 
                key={item.id} 
                item={item} 
                mobile
                children={childrenMap[item.id] || []}
              />
            ))}
          </nav>
        </ScrollArea>
      </aside>

      {/* Main content */}
      <div className={`flex-1 flex flex-col min-h-screen transition-all duration-300 ${sidebarOpen ? "mr-0 lg:mr-64" : "mr-0 lg:mr-20"}`}>
        {/* Top bar */}
        <header 
          className={`flex items-center justify-between px-4 lg:px-6 sticky top-0 z-30 border-b transition-all duration-200 ${headerSettings.show_shadow ? 'shadow-md' : ''}`}
          style={{
            height: `${headerSettings.header_height || 64}px`,
            backgroundColor: headerSettings.background_color || '#FFFFFF',
            color: headerSettings.text_color || '#000000',
            opacity: (headerSettings.transparency || 100) / 100,
            borderColor: 'var(--border)'
          }}
        >
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              onClick={() => setMobileMenuOpen(true)}
              data-testid="mobile-menu-open"
              style={{ color: headerSettings.text_color }}
            >
              <Menu className="w-5 h-5" />
            </Button>
            
            {headerSettings.show_logo && headerSettings.header_logo_url && (
              <img 
                src={headerSettings.header_logo_url} 
                alt="Logo" 
                className="h-8 object-contain"
              />
            )}
            
            <div>
              {headerSettings.show_page_name && (
                <h2 className="font-cairo font-bold text-lg" style={{ color: headerSettings.text_color }}>
                  {navigation.find(n => n.href === location.pathname)?.name || 
                   secondaryNav.find(n => n.href === location.pathname)?.name || 
                   "لوحة التحكم"}
                </h2>
              )}
              {headerSettings.show_date && (
                <p className="text-xs" style={{ color: headerSettings.text_color, opacity: 0.7 }}>
                  {new Date().toLocaleDateString('ar-SA', { 
                    weekday: 'long', 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {headerSettings.show_user_name && user && (
              <span className="text-sm font-medium mr-2" style={{ color: headerSettings.text_color }}>
                {language === 'ar' ? headerSettings.custom_greeting_ar : headerSettings.custom_greeting_en}، {user.name}
              </span>
            )}
            
            {/* Theme Toggle */}
            {headerSettings.show_theme_toggle && (
              <Button 
                variant="ghost" 
                size="icon"
                onClick={toggleTheme}
                className="hover:text-primary"
                style={{ color: headerSettings.text_color }}
                data-testid="theme-toggle"
              >
                {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </Button>
            )}

            {/* Language Toggle */}
            {headerSettings.show_language_toggle && (
              <Button 
                variant="ghost" 
                size="icon"
                onClick={toggleLanguage}
                className="hover:text-primary"
                style={{ color: headerSettings.text_color }}
                data-testid="language-toggle"
              >
                <Languages className="w-5 h-5" />
              </Button>
            )}

            {/* Notifications Bell */}
            {headerSettings.show_notifications_bell && (
              <Button 
                variant="ghost" 
                size="icon" 
                className="relative hover:text-primary"
                style={{ color: headerSettings.text_color }}
                onClick={() => navigate('/notifications')}
                data-testid="header-notifications"
              >
                <Bell className="w-5 h-5" />
                <span className="absolute top-1 right-1 w-2 h-2 bg-destructive rounded-full" />
              </Button>
            )}

            {headerSettings.show_logout_button && (
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={handleLogout}
                className="hover:text-destructive"
                style={{ color: headerSettings.text_color }}
                data-testid="logout-header"
              >
                <LogOut className="w-5 h-5" />
              </Button>
            )}
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-4 lg:p-6 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default Layout;
