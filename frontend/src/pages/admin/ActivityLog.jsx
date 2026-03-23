import { useState, useEffect, useMemo } from "react";
import axios from "axios";
import { useLanguage } from "@/context/LanguageContext";
import { 
  Activity, UserPlus, Edit, Trash2, LogIn, LogOut,
  Filter, Calendar, AlertCircle, Search, Clock, TrendingUp,
  ChevronLeft, ChevronRight, X
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const ACTION_CONFIG = {
  user_created: { icon: UserPlus, color: "#22c55e", bg: "bg-green-100 dark:bg-green-900/30", label: { ar: "إضافة مستخدم", en: "User Created" } },
  user_updated: { icon: Edit, color: "#3b82f6", bg: "bg-blue-100 dark:bg-blue-900/30", label: { ar: "تعديل مستخدم", en: "User Updated" } },
  user_deleted: { icon: Trash2, color: "#ef4444", bg: "bg-red-100 dark:bg-red-900/30", label: { ar: "حذف مستخدم", en: "User Deleted" } },
  login: { icon: LogIn, color: "#6366f1", bg: "bg-indigo-100 dark:bg-indigo-900/30", label: { ar: "تسجيل دخول", en: "Login" } },
  logout: { icon: LogOut, color: "#6b7280", bg: "bg-gray-100 dark:bg-gray-800/30", label: { ar: "تسجيل خروج", en: "Logout" } },
  gate_created: { icon: Activity, color: "#7c3aed", bg: "bg-purple-100 dark:bg-purple-900/30", label: { ar: "إضافة باب", en: "Gate Created" } },
  gate_updated: { icon: Edit, color: "#7c3aed", bg: "bg-purple-100 dark:bg-purple-900/30", label: { ar: "تعديل باب", en: "Gate Updated" } },
  alert_created: { icon: AlertCircle, color: "#f59e0b", bg: "bg-amber-100 dark:bg-amber-900/30", label: { ar: "إضافة تنبيه", en: "Alert Created" } },
};

const PAGE_SIZE = 15;

export default function ActivityLog() {
  const { language } = useLanguage();
  const isAr = language === 'ar';
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterAction, setFilterAction] = useState("all");
  const [filterUser, setFilterUser] = useState("");
  const [filterDate, setFilterDate] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => { fetchLogs(); }, []);

  const fetchLogs = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(`${API}/admin/activity-logs`, {
        headers: { Authorization: `Bearer ${token}` },
        params: { limit: 200 }
      });
      setLogs(response.data);
    } catch (error) {
      console.error("Error fetching logs:", error);
      setLogs([]);
    } finally { setLoading(false); }
  };

  const computedFiltered = useMemo(() => {
    let filtered = [...logs];
    if (filterAction !== "all") filtered = filtered.filter(log => log.action === filterAction);
    if (filterUser) filtered = filtered.filter(log =>
      (log.user_name || '').toLowerCase().includes(filterUser.toLowerCase()) ||
      (log.user_email || '').toLowerCase().includes(filterUser.toLowerCase())
    );
    if (filterDate) filtered = filtered.filter(log => {
      const logDate = new Date(log.timestamp).toISOString().split('T')[0];
      return logDate === filterDate;
    });
    return filtered;
  }, [logs, filterAction, filterUser, filterDate]);

  useEffect(() => { setCurrentPage(1); }, [computedFiltered]);

  const clearFilters = () => { setFilterAction("all"); setFilterUser(""); setFilterDate(""); };
  const hasFilters = filterAction !== "all" || filterUser || filterDate;

  const totalPages = Math.ceil(computedFiltered.length / PAGE_SIZE);
  const paginatedLogs = computedFiltered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const todayLogs = logs.filter(log => {
    const logDate = new Date(log.timestamp).toDateString();
    return logDate === new Date().toDateString();
  });

  const actionCounts = {};
  logs.forEach(log => { actionCounts[log.action] = (actionCounts[log.action] || 0) + 1; });
  const topAction = Object.entries(actionCounts).sort((a, b) => b[1] - a[1])[0];

  const uniqueUsersToday = new Set(todayLogs.map(l => l.user_name)).size;

  if (loading) {
    return (
      <div className="space-y-5 animate-pulse">
        <div className="h-8 rounded-xl bg-muted w-1/3" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1,2,3,4].map(i => <Card key={i}><CardContent className="p-5 h-24" /></Card>)}
        </div>
        <Card><CardContent className="p-5 h-64" /></Card>
      </div>
    );
  }

  const summaryCards = [
    { label: isAr ? 'إجمالي الأنشطة' : 'Total Activities', value: logs.length, icon: Activity, color: '#6366f1', sub: isAr ? 'كل السجلات' : 'All records' },
    { label: isAr ? 'أنشطة اليوم' : 'Today\'s Activities', value: todayLogs.length, icon: Calendar, color: '#22c55e', sub: isAr ? 'اليوم' : 'Today' },
    { label: isAr ? 'مستخدمون نشطون اليوم' : 'Active Users Today', value: uniqueUsersToday, icon: TrendingUp, color: '#3b82f6', sub: isAr ? 'مستخدم فريد' : 'Unique users' },
    { label: isAr ? 'أكثر نشاط' : 'Top Activity', value: topAction ? topAction[1] : 0, icon: Clock, color: '#f59e0b', sub: topAction ? (ACTION_CONFIG[topAction[0]]?.label[language] || topAction[0]) : '—' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-cairo font-bold text-xl">
            {isAr ? 'سجل النشاط' : 'Activity Log'}
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            {isAr ? 'تتبع جميع الإجراءات والأنشطة في النظام' : 'Track all system actions and activities'}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {summaryCards.map((card, i) => {
          const Icon = card.icon;
          return (
            <Card key={i} className="relative overflow-hidden border-0 shadow-md">
              <div className="absolute inset-0 opacity-[0.04]" style={{ background: `radial-gradient(circle at top left, ${card.color}, transparent 70%)` }} />
              <CardContent className="p-4">
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-[11px] font-semibold text-muted-foreground truncate">{card.label}</p>
                    <p className="text-3xl font-black leading-none mt-1.5" style={{ color: card.color }}>{card.value}</p>
                    <p className="text-[10px] text-muted-foreground mt-1 truncate">{card.sub}</p>
                  </div>
                  <div className="w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0" style={{ background: `${card.color}15` }}>
                    <Icon className="w-5 h-5" style={{ color: card.color }} />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card className="border-0 shadow-md overflow-hidden">
        <div className="p-4 border-b bg-muted/30">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
              <Filter className="w-4 h-4" />
              {isAr ? 'تصفية' : 'Filter'}
            </div>

            <Select value={filterAction} onValueChange={setFilterAction}>
              <SelectTrigger className="w-44 h-9 text-xs">
                <SelectValue placeholder={isAr ? 'نوع الإجراء' : 'Action Type'} />
              </SelectTrigger>
              <SelectContent position="popper">
                <SelectItem value="all">{isAr ? 'جميع الإجراءات' : 'All Actions'}</SelectItem>
                {Object.entries(ACTION_CONFIG).map(([key, config]) => (
                  <SelectItem key={key} value={key}>{config.label[language]}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="relative">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <Input
                placeholder={isAr ? 'بحث بالمستخدم...' : 'Search user...'}
                value={filterUser}
                onChange={(e) => setFilterUser(e.target.value)}
                className="w-44 h-9 text-xs pr-9"
              />
            </div>

            <Input
              type="date"
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
              className="w-40 h-9 text-xs"
            />

            {hasFilters && (
              <Button variant="ghost" size="sm" className="h-9 gap-1.5 text-xs text-red-500 hover:text-red-600 hover:bg-red-50" onClick={clearFilters}>
                <X className="w-3.5 h-3.5" />
                {isAr ? 'مسح' : 'Clear'} ({computedFiltered.length})
              </Button>
            )}

            <div className="mr-auto text-[11px] text-muted-foreground">
              {isAr ? `عرض ${computedFiltered.length} من ${logs.length} نشاط` : `Showing ${computedFiltered.length} of ${logs.length}`}
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/20">
                <TableHead className="text-center text-xs font-bold">{isAr ? 'الإجراء' : 'Action'}</TableHead>
                <TableHead className="text-center text-xs font-bold">{isAr ? 'المستخدم' : 'User'}</TableHead>
                <TableHead className="text-center text-xs font-bold">{isAr ? 'الهدف' : 'Target'}</TableHead>
                <TableHead className="text-center text-xs font-bold">{isAr ? 'التفاصيل' : 'Details'}</TableHead>
                <TableHead className="text-center text-xs font-bold">{isAr ? 'التاريخ والوقت' : 'Date & Time'}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedLogs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-12">
                    <Activity className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
                    <p className="text-sm font-semibold text-muted-foreground">{isAr ? 'لا توجد أنشطة' : 'No activities found'}</p>
                    {hasFilters && <p className="text-xs text-muted-foreground mt-1">{isAr ? 'حاول تغيير الفلاتر' : 'Try adjusting filters'}</p>}
                  </TableCell>
                </TableRow>
              ) : (
                paginatedLogs.map((log) => {
                  const config = ACTION_CONFIG[log.action] || ACTION_CONFIG.login;
                  const Icon = config.icon;
                  return (
                    <TableRow key={log.id} className="hover:bg-muted/30 transition-colors">
                      <TableCell className="text-center">
                        <div className="flex items-center gap-2 justify-center">
                          <div className={`w-8 h-8 rounded-xl ${config.bg} flex items-center justify-center flex-shrink-0`}>
                            <Icon className="w-4 h-4" style={{ color: config.color }} />
                          </div>
                          <span className="text-xs font-semibold whitespace-nowrap">{config.label[language]}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center gap-2 justify-center">
                          <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center font-cairo font-bold text-[11px] text-primary flex-shrink-0">
                            {log.user_name?.charAt(0) || '؟'}
                          </div>
                          <div className="text-right min-w-0">
                            <p className="text-xs font-semibold truncate">{log.user_name}</p>
                            <p className="text-[10px] text-muted-foreground truncate">{log.user_email}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        {log.target ? (
                          <span className="text-xs font-medium bg-muted/50 px-2 py-1 rounded-md">{log.target}</span>
                        ) : (
                          <span className="text-muted-foreground text-xs">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-center max-w-[200px]">
                        <p className="text-xs text-muted-foreground truncate">{log.details}</p>
                      </TableCell>
                      <TableCell className="text-center">
                        <p className="text-[11px] text-muted-foreground whitespace-nowrap">
                          {new Date(log.timestamp).toLocaleString(isAr ? 'ar-SA' : 'en-US', {
                            month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                          })}
                        </p>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-3 border-t bg-muted/20">
            <p className="text-xs text-muted-foreground">
              {isAr ? `صفحة ${currentPage} من ${totalPages}` : `Page ${currentPage} of ${totalPages}`}
            </p>
            <div className="flex items-center gap-1">
              <Button variant="outline" size="sm" className="h-8 w-8 p-0" disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)}>
                <ChevronRight className="w-4 h-4" />
              </Button>
              {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                const page = currentPage <= 3 ? i + 1 : currentPage + i - 2;
                if (page < 1 || page > totalPages) return null;
                return (
                  <Button key={page} variant={currentPage === page ? "default" : "outline"} size="sm" className="h-8 w-8 p-0 text-xs" onClick={() => setCurrentPage(page)}>
                    {page}
                  </Button>
                );
              })}
              <Button variant="outline" size="sm" className="h-8 w-8 p-0" disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)}>
                <ChevronLeft className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
