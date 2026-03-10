import { useState, useEffect } from "react";
import { Outlet, NavLink, useLocation, useNavigate } from "react-router-dom";
import { useAuth, ROLE_LABELS, DEPT_LABELS } from "@/context/AuthContext";
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
  FileText, Bell, Settings, Map, Shield, ShieldAlert, Home, UserCheck, Building,
  MapPin, Navigation, Layers, List, Grid, Database, Archive, Folder,
  Calendar, BarChart3, PieChart, TrendingUp, Activity, User, Menu
};

export const Layout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [expandedMenuId, setExpandedMenuId] = useState(null);
  const [autoExpanded, setAutoExpanded] = useState(false);
  const [unreadAlerts, setUnreadAlerts] = useState(0);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout, isAdmin, roleChangeAlert, dismissRoleChange } = useAuth();
  const { theme, toggleTheme, isDark } = useTheme();
  const { t, language, toggleLanguage, isRTL } = useLanguage();
  const { menuItems, loading } = useSidebar();
  const { headerSettings } = useHeader();

  // Fetch unread alerts count
  useEffect(() => {
    const fetchUnread = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) return;
        const res = await axios.get(`${API}/alerts/unread-count`, { headers: { Authorization: `Bearer ${token}` } });
        setUnreadAlerts(res.data.count || 0);
      } catch (e) { /* silent */ }
    };
    fetchUnread();
    const interval = setInterval(fetchUnread, 30000);
    return () => clearInterval(interval);
  }, []);

  // Convert menu items from API — backend already filters by role/department/permissions
  const allMenuItems = menuItems.map(item => ({
    ...item,
    name: language === 'ar' ? item.name_ar : item.name_en,
    icon: ICON_MAP[item.icon] || LayoutDashboard,
  })).filter(item => item.is_active);

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

  // Auto-expand department menu for department managers
  useEffect(() => {
    if (autoExpanded || !user?.department || user?.role === 'system_admin' || user?.role === 'general_manager') return;
    const deptParent = parentItems.find(item => item.department === user.department && childrenMap[item.id]?.length > 0);
    if (deptParent) {
      setExpandedMenuId(deptParent.id);
      setAutoExpanded(true);
    }
  }, [parentItems.length, user?.department, autoExpanded]);

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
                  <span className="flex-1 text-right whitespace-nowrap truncate text-[13px]">{item.name}</span>
                  <ChevronDown 
                    className={`w-4 h-4 flex-shrink-0 transition-transform ${isExpanded ? 'rotate-180' : ''}`} 
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
                  {ROLE_LABELS[user?.role]?.[language] || user?.role}
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

        {/* Date at top of mobile sidebar */}
        <div className="px-4 py-3 border-b border-border bg-muted/30">
          <p className="text-xs text-muted-foreground text-right">
            {new Date().toLocaleDateString('ar-SA', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>

        <ScrollArea className="flex-1 py-4 h-[calc(100vh-280px)]">
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

        {/* User info + action buttons at bottom of mobile sidebar */}
        <div className="border-t border-border pb-20">
          <div className="px-4 py-3 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <span className="font-cairo font-semibold text-primary">
                {user?.name?.charAt(0) || 'م'}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{user?.name}</p>
              <span className={`inline-block mt-0.5 px-2 py-0.5 rounded-full text-[10px] font-semibold ${ROLE_LABELS[user?.role]?.color || 'bg-slate-100 text-slate-700'}`}>
                {ROLE_LABELS[user?.role]?.[language] || user?.role}
              </span>
            </div>
          </div>
          <div className="px-4 pb-4 flex items-center gap-2">
            <Button variant="outline" size="sm" className="flex-1 gap-1.5 text-xs" onClick={() => { navigate('/notifications'); setMobileMenuOpen(false); }} data-testid="mobile-notifications-btn">
              <Bell className="w-4 h-4" />
              <span>{language === 'ar' ? 'التنبيهات' : 'Alerts'}</span>
            </Button>
            <Button variant="outline" size="sm" className="flex-1 gap-1.5 text-xs" onClick={toggleTheme} data-testid="mobile-theme-btn">
              {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              <span>{isDark ? (language === 'ar' ? 'فاتح' : 'Light') : (language === 'ar' ? 'داكن' : 'Dark')}</span>
            </Button>
            <Button variant="outline" size="sm" className="flex-1 gap-1.5 text-xs text-destructive hover:bg-destructive hover:text-white" onClick={handleLogout} data-testid="mobile-logout-btn">
              <LogOut className="w-4 h-4" />
              <span>{language === 'ar' ? 'خروج' : 'Logout'}</span>
            </Button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className={`flex-1 flex flex-col min-h-screen min-w-0 transition-all duration-300 ${sidebarOpen ? "mr-0 lg:mr-64" : "mr-0 lg:mr-20"}`}>
        {/* Top bar */}
        <header 
          className={`flex items-center justify-between px-4 lg:px-6 sticky top-0 z-30 border-b transition-all duration-200 ${headerSettings.show_shadow ? 'shadow-md' : ''}`}
          style={{
            height: `${headerSettings.header_height || 64}px`,
            backgroundColor: isDark ? 'hsl(var(--card))' : (headerSettings.background_color || '#FFFFFF'),
            color: isDark ? 'hsl(var(--foreground))' : (headerSettings.text_color || '#000000'),
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
                <h2 className="font-cairo font-bold text-base lg:text-lg">
                  {navigation.find(n => n.href === location.pathname)?.name || 
                   secondaryNav.find(n => n.href === location.pathname)?.name || 
                   "لوحة التحكم"}
                </h2>
              )}
              {headerSettings.show_date && (
                <p className="text-xs opacity-70 hidden lg:block">
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
            {/* Mobile: short greeting only */}
            {headerSettings.show_user_name && user && (
              <span className="text-sm font-medium lg:hidden" data-testid="header-mobile-greeting">
                {language === 'ar' ? 'أهلاً' : 'Hi'}، {(user.name || '').split(' ').slice(0, 2).join(' ')}
              </span>
            )}

            {/* Desktop: full greeting + role badge */}
            {headerSettings.show_user_name && user && (
              <div className="hidden lg:flex items-center gap-2 mr-2">
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${ROLE_LABELS[user.role]?.color || 'bg-slate-100 text-slate-700'}`} data-testid="header-role-badge">
                  {ROLE_LABELS[user.role]?.[language] || user.role}
                </span>
                <span className="text-sm font-medium">
                  {language === 'ar' ? headerSettings.custom_greeting_ar : headerSettings.custom_greeting_en}، {user.name}
                </span>
              </div>
            )}
            
            {/* Desktop only buttons */}
            {headerSettings.show_theme_toggle && (
              <Button 
                variant="ghost" 
                size="icon"
                onClick={toggleTheme}
                className="hover:text-primary hidden lg:flex"
                data-testid="theme-toggle"
              >
                {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </Button>
            )}

            {headerSettings.show_language_toggle && (
              <Button 
                variant="ghost" 
                size="icon"
                onClick={toggleLanguage}
                className="hover:text-primary hidden lg:flex"
                data-testid="language-toggle"
              >
                <Languages className="w-5 h-5" />
              </Button>
            )}

            {headerSettings.show_notifications_bell && (
              <Button 
                variant="ghost" 
                size="icon" 
                className="relative hover:text-primary hidden lg:flex"
                onClick={() => navigate('/notifications')}
                data-testid="header-notifications"
              >
                <Bell className="w-5 h-5" />
                {unreadAlerts > 0 && <span className="absolute top-1 right-1 w-2 h-2 bg-destructive rounded-full" />}
              </Button>
            )}

            {headerSettings.show_logout_button && (
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={handleLogout}
                className="hover:text-destructive hidden lg:flex"
                data-testid="logout-header"
              >
                <LogOut className="w-5 h-5" />
              </Button>
            )}
          </div>
        </header>

        {/* Role Change Alert Banner */}
        {roleChangeAlert && (
          <div className="mx-3 lg:mx-6 mt-3 p-3 rounded-lg bg-amber-50 border border-amber-200 dark:bg-amber-900/20 dark:border-amber-800 flex items-center justify-between gap-3" dir="rtl" data-testid="role-change-alert">
            <div className="flex items-center gap-2 flex-1">
              <Shield className="w-5 h-5 text-amber-600 shrink-0" />
              <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
                {language === 'ar' 
                  ? `تم تحديث صلاحياتك — دورك الحالي: ${ROLE_LABELS[roleChangeAlert.newRole]?.ar || roleChangeAlert.newRole}`
                  : `Your role has been updated — Current role: ${ROLE_LABELS[roleChangeAlert.newRole]?.en || roleChangeAlert.newRole}`
                }
              </p>
            </div>
            <button onClick={dismissRoleChange} className="px-3 py-1 rounded-md text-xs font-medium bg-amber-600 text-white hover:bg-amber-700 shrink-0" data-testid="role-change-dismiss">
              {language === 'ar' ? 'فهمت' : 'Got it'}
            </button>
          </div>
        )}

        {/* Page content */}
        <main className="flex-1 p-3 lg:p-6 overflow-x-hidden overflow-y-auto pb-24 lg:pb-6">
          <Outlet />
        </main>
      </div>

      {/* ── Mobile Bottom Navigation Bar ── */}
      <nav
        data-testid="mobile-bottom-nav"
        className="lg:hidden fixed bottom-0 left-0 right-0 z-50 border-t border-border"
        style={{
          background: 'hsl(var(--card) / 0.97)',
          backdropFilter: 'blur(20px)',
          paddingBottom: 'env(safe-area-inset-bottom)',
        }}
      >
        <div className="flex h-16 items-stretch">
          {[...navigation.slice(0, 4)].map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.id}
                to={item.href}
                end={item.href === '/'}
                onClick={() => setMobileMenuOpen(false)}
                data-testid={`bottom-nav-${item.href.replace(/\//g, '') || 'home'}`}
                className={({ isActive }) =>
                  `flex-1 flex flex-col items-center justify-center gap-0.5 transition-colors duration-200 relative
                  ${isActive ? 'text-primary' : 'text-muted-foreground'}`
                }
              >
                {({ isActive }) => (
                  <>
                    {isActive && (
                      <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-primary rounded-b-full" />
                    )}
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-200 ${isActive ? 'bg-primary/10 scale-110' : ''}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <span className="text-[9px] font-cairo font-medium truncate max-w-[56px] text-center leading-tight">
                      {item.name}
                    </span>
                  </>
                )}
              </NavLink>
            );
          })}

          {/* More Button */}
          <button
            data-testid="bottom-nav-more"
            onClick={() => setMobileMenuOpen(true)}
            className="flex-1 flex flex-col items-center justify-center gap-0.5 text-muted-foreground hover:text-primary transition-colors"
          >
            <div className="w-9 h-9 rounded-xl flex items-center justify-center">
              <Menu className="w-5 h-5" />
            </div>
            <span className="text-[9px] font-cairo font-medium">
              {language === 'ar' ? 'المزيد' : 'More'}
            </span>
          </button>
        </div>
      </nav>
    </div>
  );
};

export default Layout;
