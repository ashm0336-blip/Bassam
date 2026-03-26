import { useState, useEffect, useCallback, useContext, useRef } from "react";
import { Outlet, NavLink, useLocation, useNavigate } from "react-router-dom";
import { useAuth, ROLE_LABELS, DEPT_LABELS } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import { useLanguage } from "@/context/LanguageContext";
import { useSidebar } from "@/context/SidebarContext";
import { useHeader } from "@/context/HeaderContext";
import { useMobileSettings } from "@/context/MobileSettingsContext";
import { useRealtimeRefresh, useLastEvent } from "@/context/WebSocketContext";
import { NotificationManager } from "@/components/NotificationManager";
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
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const touchStartY = useRef(0);
  const mainRef = useRef(null);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout, isAdmin, roleChangeAlert, dismissRoleChange } = useAuth();
  const { theme, toggleTheme, isDark } = useTheme();
  const { t, language, toggleLanguage, isRTL } = useLanguage();
  const { menuItems, loading } = useSidebar();
  const { headerSettings } = useHeader();
  const { mobileSettings } = useMobileSettings();
  const lastEvent = useLastEvent();

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
  }, []);

  useRealtimeRefresh(["alerts"], useCallback(() => {
    const token = localStorage.getItem("token");
    if (!token) return;
    axios.get(`${API}/alerts/unread-count`, { headers: { Authorization: `Bearer ${token}` } })
      .then(res => setUnreadAlerts(res.data.count || 0)).catch(() => {});
  }, []));

  const PULL_THRESHOLD = 80;
  const handleTouchStart = useCallback((e) => {
    if (!mobileSettings.pull_to_refresh) return;
    if (mainRef.current && mainRef.current.scrollTop <= 0) {
      touchStartY.current = e.touches[0].clientY;
    }
  }, [mobileSettings.pull_to_refresh]);
  const handleTouchMove = useCallback((e) => {
    if (!mobileSettings.pull_to_refresh) return;
    if (!touchStartY.current || isRefreshing) return;
    if (mainRef.current && mainRef.current.scrollTop > 0) return;
    const diff = e.touches[0].clientY - touchStartY.current;
    if (diff > 0) {
      const dampened = Math.min(diff * 0.4, 120);
      setPullDistance(dampened);
    }
  }, [isRefreshing, mobileSettings.pull_to_refresh]);
  const handleTouchEnd = useCallback(() => {
    if (!mobileSettings.pull_to_refresh) return;
    if (pullDistance >= PULL_THRESHOLD && !isRefreshing) {
      setIsRefreshing(true);
      setPullDistance(PULL_THRESHOLD);
      window.location.reload();
    } else {
      setPullDistance(0);
    }
    touchStartY.current = 0;
  }, [pullDistance, isRefreshing, mobileSettings.pull_to_refresh]);

  // Convert menu items from API — backend already filters by role/department/permissions
  const allMenuItems = menuItems.map(item => ({
    ...item,
    name: language === 'ar' ? item.name_ar : item.name_en,
    icon: ICON_MAP[item.icon] || LayoutDashboard,
  })).filter(item => item.is_active);

  // Organize into parent and children (exclude sidebar_hidden items from nav)
  const parentItems = allMenuItems.filter(item => !item.parent_id && !item.sidebar_hidden);
  const childrenMap = {};
  allMenuItems.filter(item => item.parent_id && !item.sidebar_hidden).forEach(child => {
    if (!childrenMap[child.parent_id]) {
      childrenMap[child.parent_id] = [];
    }
    childrenMap[child.parent_id].push(child);
  });

  // All parent items (including hidden ones — needed for bottom nav custom items)
  const allParentItems = allMenuItems.filter(item => !item.parent_id);

  // Split into primary and secondary navigation
  const navigation = parentItems.filter(item => !item.is_secondary);
  const secondaryNav = parentItems.filter(item => item.is_secondary);

  // Auto-expand department menu for department managers
  useEffect(() => {
    if (autoExpanded || !user?.department || user?.role === 'system_admin' || user?.permission_group_name) return;
    const deptParent = parentItems.find(item => item.department === user.department && childrenMap[item.id]?.length > 0);
    if (deptParent) {
      setExpandedMenuId(deptParent.id);
      setAutoExpanded(true);
    }
  }, [parentItems.length, user?.department, autoExpanded]);

  const prevPathRef = useRef(location.pathname + location.search);
  useEffect(() => {
    const currentPath = location.pathname + location.search;
    const pathChanged = prevPathRef.current !== currentPath;
    prevPathRef.current = currentPath;
    if (!pathChanged) return;
    const activeParent = parentItems.find(item => {
      if (item._header_only || item.menu_only) {
        if (location.pathname === item.href) return true;
        const kids = childrenMap[item.id] || [];
        return kids.some(c => 
          location.pathname === c.href?.split('?')[0] || 
          currentPath === c.href
        );
      }
      return false;
    });
    if (activeParent) {
      setExpandedMenuId(activeParent.id);
    }
  }, [location.pathname, location.search]);

  const toggleMenu = (menuId) => {
    // Close if same menu clicked, otherwise open new one (close others automatically)
    setExpandedMenuId(prev => prev === menuId ? null : menuId);
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const NavItem = ({ item, mobile = false, children = [] }) => {
    const Icon = item.icon;
    const hasChildren = children.length > 0;
    const isExpanded = expandedMenuId === item.id;
    const isHeaderOnly = item._header_only;
    const isMenuOnly = item.menu_only;
    const childActive = children.some(c => 
      location.pathname === c.href?.split('?')[0] || 
      (c.href?.includes('?') && location.pathname + location.search === c.href)
    );
    const isActive = isMenuOnly 
      ? (location.pathname === item.href || childActive)
      : (location.pathname === item.href || 
         (item.href.includes('?') && location.pathname + location.search === item.href));
    
    const itemPy = mobile ? 'py-2.5' : 'py-3';
    const itemPx = mobile ? 'px-3' : 'px-4';
    const itemGap = mobile ? 'gap-2.5' : 'gap-3';
    const itemText = mobile ? 'text-[13px]' : 'text-sm';
    const iconSize = mobile ? 'w-[18px] h-[18px]' : 'w-5 h-5';
    
    return (
      <div>
        <div className="relative">
          {hasChildren ? (
            <div
              onClick={() => {
                toggleMenu(item.id);
                if (!isHeaderOnly && !isMenuOnly) {
                  navigate(item.href);
                  if (mobile) setMobileMenuOpen(false);
                }
              }}
              className={`
                flex items-center ${itemGap} ${itemPx} ${itemPy} rounded-lg ${itemText} font-medium
                transition-colors duration-200 relative cursor-pointer
                ${isHeaderOnly
                  ? "text-muted-foreground/60"
                  : isActive 
                    ? "bg-primary/10 text-primary border-r-[3px] border-primary" 
                    : "text-muted-foreground hover:bg-muted hover:text-primary"
                }
                ${language === 'ar' ? 'flex-row-reverse' : ''}
              `}
            >
              <Icon className={`${iconSize} flex-shrink-0 ${isHeaderOnly ? 'opacity-40' : ''}`} />
              {(sidebarOpen || mobile) && (
                <>
                  <span className={`flex-1 text-right whitespace-nowrap truncate ${isHeaderOnly ? 'opacity-50' : ''}`}>{item.name}</span>
                  <ChevronDown 
                    className={`w-3.5 h-3.5 flex-shrink-0 transition-transform ${isExpanded ? 'rotate-180' : ''}`} 
                  />
                </>
              )}
            </div>
          ) : (
            <NavLink
              to={item.href}
              onClick={() => mobile && setMobileMenuOpen(false)}
              className={`
                flex items-center ${itemGap} ${itemPx} ${itemPy} rounded-lg ${itemText} font-medium
                transition-colors duration-200 relative
                ${isActive 
                  ? "bg-primary/10 text-primary border-r-[3px] border-primary" 
                  : "text-muted-foreground hover:bg-muted hover:text-primary"
                }
                ${language === 'ar' ? 'flex-row-reverse' : ''}
              `}
              data-testid={`nav-${item.href.replace("/", "") || "dashboard"}`}
            >
              <Icon className={`${iconSize} flex-shrink-0`} />
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

        {hasChildren && isExpanded && (sidebarOpen || mobile) && (
          <div className={`mt-0.5 space-y-0.5 ${language === 'ar' ? 'pr-4' : 'pl-4'}`}>
            {children.map((child) => {
              const ChildIcon = child.icon;
              const isChildActive = location.pathname + location.search === child.href;
              return (
                <NavLink
                  key={child.id}
                  to={child.href}
                  onClick={() => mobile && setMobileMenuOpen(false)}
                  className={`
                    flex items-center ${itemGap} ${itemPx} py-2 rounded-lg text-[12px] sm:text-sm
                    transition-colors duration-200
                    ${isChildActive 
                      ? "bg-primary/10 text-primary" 
                      : "text-muted-foreground hover:bg-muted hover:text-primary"
                    }
                    ${language === 'ar' ? 'flex-row-reverse' : ''}
                  `}
                  data-testid={`nav-${child.href.replace("/", "")}`}
                >
                  <ChildIcon className="w-3.5 h-3.5 flex-shrink-0" />
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
      {/* Real-time Notification Listener */}
      <NotificationManager lastEvent={lastEvent} userId={user?.id} />

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

        {sidebarOpen && (
          <div className="px-4 py-2 border-t border-border flex items-center justify-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
            </span>
            <span className="text-[10px] text-emerald-600 font-medium font-cairo">{language === 'ar' ? 'مباشر' : 'Live'}</span>
          </div>
        )}

        {sidebarOpen && (
          <div className="p-4 border-t border-border">
            <div className="flex items-center gap-3">
              <button onClick={() => navigate('/my-profile')} className="w-10 h-10 rounded-full bg-secondary/20 flex items-center justify-center hover:bg-primary/20 transition-colors cursor-pointer" data-testid="sidebar-profile-btn">
                <span className="font-cairo font-semibold text-secondary-foreground">
                  {user?.name?.charAt(0) || 'م'}
                </span>
              </button>
              <button onClick={() => navigate('/my-profile')} className="flex-1 min-w-0 text-right hover:opacity-80 transition-opacity cursor-pointer">
                <p className="text-sm font-medium truncate">{user?.name || t('platformName')}</p>
                <p className="text-xs text-muted-foreground truncate">
                  {user.permission_group_name || ROLE_LABELS[user?.role]?.[language] || user?.role}
                </p>
              </button>
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

      {/* Mobile sidebar - Premium sheet style */}
      <aside 
        className={`
          fixed top-0 right-0 bottom-0 w-[300px] z-50 flex flex-col transform transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]
          lg:hidden rounded-l-2xl
        `}
        style={{
          background: isDark ? 'hsl(var(--card))' : 'rgba(255,255,255,0.97)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          boxShadow: mobileMenuOpen ? '-8px 0 40px rgba(0,0,0,0.12)' : 'none',
          transform: mobileMenuOpen ? 'translateX(0)' : 'translateX(100%)',
        }}
      >
        <div className="flex-shrink-0" style={{ paddingTop: 'max(0.75rem, env(safe-area-inset-top, 0.75rem))' }}>
          <div className="flex items-center justify-between px-4 pb-2">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center shadow-lg shadow-primary/20">
                <span className="text-white font-cairo font-bold text-sm">ح</span>
              </div>
              <div>
                <h1 className="font-cairo font-bold text-primary text-sm leading-tight">{language === 'ar' ? 'خدمات الحشود' : 'Crowd Services'}</h1>
                <p className="text-[10px] text-muted-foreground leading-tight mt-0.5">
                  {new Date().toLocaleDateString('ar-SA', { weekday: 'long', day: 'numeric', month: 'long' })}
                </p>
              </div>
            </div>
            <button
              onClick={() => setMobileMenuOpen(false)}
              data-testid="mobile-menu-close"
              className="w-8 h-8 rounded-full bg-muted/60 flex items-center justify-center hover:bg-muted transition-colors"
            >
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>

          {mobileSettings.show_sidebar_profile && (
            <button onClick={() => { navigate('/my-profile'); setMobileMenuOpen(false); }} className="mx-3 mb-2 w-[calc(100%-1.5rem)] flex items-center gap-3 p-2.5 rounded-xl bg-primary/5 hover:bg-primary/10 transition-colors border border-primary/10">
              <div className="w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: 'linear-gradient(135deg, hsl(var(--primary)), hsl(var(--primary) / 0.7))' }}>
                <span className="font-cairo font-bold text-white text-sm">
                  {user?.name?.charAt(0) || 'م'}
                </span>
              </div>
              <div className="flex-1 min-w-0 text-right">
                <p className="text-sm font-semibold truncate">{user?.name}</p>
                <span className={`inline-block mt-0.5 px-2 py-0.5 rounded-md text-[9px] font-bold ${ROLE_LABELS[user?.role]?.color || 'bg-slate-100 text-slate-700'}`}>
                  {user.permission_group_name || ROLE_LABELS[user?.role]?.[language] || user?.role}
                </span>
              </div>
              <ChevronLeft className="w-4 h-4 text-muted-foreground flex-shrink-0" />
            </button>
          )}

          <div className="flex items-center gap-1.5 px-3 pb-3">
            {mobileSettings.show_sidebar_notifications && (
              <button onClick={() => { navigate('/notifications'); setMobileMenuOpen(false); }} data-testid="mobile-notifications-btn" className="w-10 h-10 rounded-xl bg-muted/50 hover:bg-muted transition-colors flex items-center justify-center relative">
                <Bell className="w-4 h-4" />
                {unreadAlerts > 0 && (
                  <span className="absolute -top-1 -left-1 min-w-[16px] h-4 bg-destructive text-white text-[9px] font-bold rounded-full flex items-center justify-center px-1">
                    {unreadAlerts > 9 ? "9+" : unreadAlerts}
                  </span>
                )}
              </button>
            )}
            {mobileSettings.show_sidebar_language && (
              <button onClick={toggleLanguage} data-testid="mobile-lang-btn" className="w-10 h-10 rounded-xl bg-muted/50 hover:bg-muted transition-colors flex items-center justify-center text-xs font-bold">
                {language === 'ar' ? 'EN' : 'ع'}
              </button>
            )}
            {mobileSettings.show_sidebar_theme && (
              <button onClick={toggleTheme} data-testid="mobile-theme-btn" className="w-10 h-10 rounded-xl bg-muted/50 hover:bg-muted transition-colors flex items-center justify-center">
                {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </button>
            )}
          </div>
          <div className="mx-3 h-px bg-border/40" />
        </div>

        <div className="flex-1 overflow-y-auto overscroll-contain pt-2 pb-2" style={{ WebkitOverflowScrolling: 'touch' }}>
          <nav className="space-y-0.5 px-3">
            {navigation.map((item) => (
              <NavItem 
                key={item.id} 
                item={item} 
                mobile 
                children={childrenMap[item.id] || []}
              />
            ))}
          </nav>
          
          {secondaryNav.length > 0 && (
            <>
              <div className="mx-4 my-3 h-px bg-border/50" />
              <nav className="space-y-0.5 px-3">
                {secondaryNav.map((item) => (
                  <NavItem 
                    key={item.id} 
                    item={item} 
                    mobile
                    children={childrenMap[item.id] || []}
                  />
                ))}
              </nav>
            </>
          )}
          <div className="h-3" />
        </div>

        {mobileSettings.show_sidebar_logout && (
          <div className="flex-shrink-0 px-3 pb-3" style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom, 0.75rem))' }}>
            <button onClick={handleLogout} data-testid="mobile-logout-btn" className="w-full flex items-center justify-center gap-2 h-11 rounded-xl bg-destructive/10 hover:bg-destructive/20 transition-colors text-destructive text-sm font-medium">
              <LogOut className="w-4 h-4" />
              <span>{language === 'ar' ? 'تسجيل الخروج' : 'Logout'}</span>
            </button>
          </div>
        )}
      </aside>

      {/* Main content */}
      <div className={`flex-1 flex flex-col min-h-screen min-w-0 transition-all duration-300 ${sidebarOpen ? "mr-0 lg:mr-64" : "mr-0 lg:mr-20"}`}>
        {/* Top bar */}
        <header 
          className={`flex items-center justify-between px-3 lg:px-6 sticky top-0 z-30 transition-all duration-200`}
          style={{
            minHeight: `${headerSettings.header_height || 64}px`,
            paddingTop: 'env(safe-area-inset-top, 0px)',
            backgroundColor: isDark ? 'hsl(var(--card))' : (headerSettings.background_color || '#FFFFFF'),
            color: isDark ? 'hsl(var(--foreground))' : (headerSettings.text_color || '#000000'),
            opacity: (headerSettings.transparency || 100) / 100,
            borderBottom: '1px solid hsl(var(--border) / 0.5)',
            boxShadow: headerSettings.show_shadow ? '0 1px 8px rgba(0,0,0,0.04)' : 'none',
          }}
        >
          <div className="flex items-center gap-3">
            <button
              className="lg:hidden w-9 h-9 rounded-xl bg-muted/50 flex items-center justify-center active:bg-muted transition-colors"
              onClick={() => setMobileMenuOpen(true)}
              data-testid="mobile-menu-open"
            >
              <Menu className="w-[18px] h-[18px]" />
            </button>
            
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

          <div className="flex items-center gap-1.5 lg:gap-2">
            {/* Mobile: short greeting only */}
            {headerSettings.show_user_name && user && (
              <span className="text-xs font-semibold lg:hidden text-muted-foreground" data-testid="header-mobile-greeting">
                {language === 'ar' ? 'أهلاً' : 'Hi'}، {(user.name || '').split(' ')[0]}
              </span>
            )}

            {/* Mobile: notification bell */}
            {headerSettings.show_notifications_bell && (
              <button
                className="relative w-9 h-9 rounded-xl flex items-center justify-center hover:bg-muted/60 active:bg-muted transition-colors lg:hidden"
                onClick={() => navigate('/notifications')}
                data-testid="header-notifications-mobile">
                <Bell className="w-[18px] h-[18px]" />
                {unreadAlerts > 0 && (
                  <span className="absolute top-1 right-1 min-w-[14px] h-3.5 bg-destructive text-white text-[8px] font-bold rounded-full flex items-center justify-center px-0.5">
                    {unreadAlerts > 9 ? "9+" : unreadAlerts}
                  </span>
                )}
              </button>
            )}

            {/* Desktop: full greeting + role badge */}
            {headerSettings.show_user_name && user && (
              <div className="hidden lg:flex items-center gap-2 mr-2">
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${ROLE_LABELS[user.role]?.color || 'bg-slate-100 text-slate-700'}`} data-testid="header-role-badge">
                  {user.permission_group_name || ROLE_LABELS[user.role]?.[language] || user.role}
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

        {/* Pull-to-refresh indicator (mobile only) */}
        {pullDistance > 0 && (
          <div className="lg:hidden flex justify-center items-center overflow-hidden transition-all" style={{ height: `${pullDistance}px` }}>
            <div
              className={`w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all duration-200 ${
                pullDistance >= PULL_THRESHOLD
                  ? 'border-primary bg-primary/10 scale-110'
                  : 'border-muted-foreground/30 bg-muted/50'
              }`}
              style={{ transform: `rotate(${pullDistance * 3}deg)` }}
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 5v14M5 12l7-7 7 7" className={pullDistance >= PULL_THRESHOLD ? 'text-primary' : 'text-muted-foreground/50'} />
              </svg>
            </div>
          </div>
        )}

        {/* Page content */}
        <main
          ref={mainRef}
          className="flex-1 p-2 sm:p-3 lg:p-6 overflow-x-hidden overflow-y-auto pb-20 lg:pb-6"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          <Outlet />
        </main>
      </div>

      {/* ── Mobile Bottom Navigation Bar ── */}
      <nav
        data-testid="mobile-bottom-nav"
        className={`lg:hidden fixed bottom-0 left-0 right-0 z-40 transition-all duration-300 ${mobileMenuOpen ? 'opacity-0 pointer-events-none translate-y-full' : 'opacity-100 translate-y-0'}`}
        style={{
          background: isDark ? 'hsl(var(--card) / 0.92)' : 'rgba(255,255,255,0.92)',
          backdropFilter: 'saturate(180%) blur(20px)',
          WebkitBackdropFilter: 'saturate(180%) blur(20px)',
          borderTop: '1px solid hsl(var(--border) / 0.3)',
          paddingBottom: 'env(safe-area-inset-bottom)',
          boxShadow: '0 -1px 12px rgba(0,0,0,0.04)',
        }}
      >
        <div className="flex h-[56px] items-stretch px-2">
          {(mobileSettings.bottom_nav_items
            ? mobileSettings.bottom_nav_items
                .map(href => allMenuItems.find(i => i.href === href))
                .filter(Boolean)
            : navigation.slice(0, mobileSettings.bottom_nav_count || 4)
          ).map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.id}
                to={item.href}
                end={item.href === '/'}
                onClick={() => setMobileMenuOpen(false)}
                data-testid={`bottom-nav-${item.href.replace(/\//g, '') || 'home'}`}
                className={({ isActive }) =>
                  `flex-1 flex flex-col items-center justify-center gap-[3px] transition-all duration-200 relative
                  ${isActive ? 'text-primary' : 'text-muted-foreground'}`
                }
              >
                {({ isActive }) => (
                  <>
                    <div className={`relative flex items-center justify-center transition-all duration-300`}>
                      <Icon className={`w-[22px] h-[22px] transition-all duration-300 ${isActive ? 'scale-105' : ''}`} />
                      {isActive && (
                        <span className="absolute -bottom-0.5 w-1 h-1 rounded-full bg-primary" />
                      )}
                    </div>
                    <span className={`text-[9px] font-cairo font-semibold truncate max-w-[56px] text-center leading-none transition-all
                      ${isActive ? 'text-primary font-bold' : 'text-muted-foreground'}`}>
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
            className="flex-1 flex flex-col items-center justify-center gap-[3px] text-muted-foreground active:text-primary transition-colors"
          >
            <Menu className="w-[22px] h-[22px]" />
            <span className="text-[9px] font-cairo font-semibold leading-none">
              {language === 'ar' ? 'المزيد' : 'More'}
            </span>
          </button>
        </div>
      </nav>
    </div>
  );
};

export default Layout;
