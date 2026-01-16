import { useState, useEffect } from "react";
import axios from "axios";
import { useLanguage } from "@/context/LanguageContext";
import { 
  Activity,
  UserPlus,
  Edit,
  Trash2,
  LogIn,
  LogOut,
  Filter,
  Calendar,
  User,
  AlertCircle
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const ACTION_CONFIG = {
  user_created: { 
    icon: UserPlus, 
    color: "bg-green-500", 
    label: { ar: "إضافة مستخدم", en: "User Created" } 
  },
  user_updated: { 
    icon: Edit, 
    color: "bg-blue-500", 
    label: { ar: "تعديل مستخدم", en: "User Updated" } 
  },
  user_deleted: { 
    icon: Trash2, 
    color: "bg-red-500", 
    label: { ar: "حذف مستخدم", en: "User Deleted" } 
  },
  login: { 
    icon: LogIn, 
    color: "bg-primary", 
    label: { ar: "تسجيل دخول", en: "Login" } 
  },
  logout: { 
    icon: LogOut, 
    color: "bg-gray-500", 
    label: { ar: "تسجيل خروج", en: "Logout" } 
  },
  gate_created: { 
    icon: Activity, 
    color: "bg-purple-500", 
    label: { ar: "إضافة باب", en: "Gate Created" } 
  },
  gate_updated: { 
    icon: Edit, 
    color: "bg-purple-500", 
    label: { ar: "تعديل باب", en: "Gate Updated" } 
  },
  alert_created: { 
    icon: AlertCircle, 
    color: "bg-orange-500", 
    label: { ar: "إضافة تنبيه", en: "Alert Created" } 
  },
};

export default function ActivityLog() {
  const { language } = useLanguage();
  const [logs, setLogs] = useState([]);
  const [filteredLogs, setFilteredLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterAction, setFilterAction] = useState("all");
  const [filterUser, setFilterUser] = useState("");
  const [filterDate, setFilterDate] = useState("");

  useEffect(() => {
    fetchLogs();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [logs, filterAction, filterUser, filterDate]);

  const fetchLogs = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(`${API}/admin/activity-logs`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setLogs(response.data);
    } catch (error) {
      console.error("Error fetching logs:", error);
      // Mock data for now
      const mockLogs = [
        {
          id: "1",
          action: "user_created",
          user_name: "مسؤول النظام",
          user_email: "admin@crowd.sa",
          target: "عبدالرحمن الشهري",
          details: "تم إنشاء حساب المدير العام",
          timestamp: new Date().toISOString()
        },
        {
          id: "2",
          action: "login",
          user_name: "عبدالرحمن الشهري",
          user_email: "general.manager@crowd.sa",
          target: null,
          details: "تسجيل دخول ناجح",
          timestamp: new Date(Date.now() - 3600000).toISOString()
        },
        {
          id: "3",
          action: "user_updated",
          user_name: "مسؤول النظام",
          user_email: "admin@crowd.sa",
          target: "فهد الدوسري",
          details: "تم تحديث الدور إلى مدير إدارة",
          timestamp: new Date(Date.now() - 7200000).toISOString()
        }
      ];
      setLogs(mockLogs);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...logs];
    
    if (filterAction !== "all") {
      filtered = filtered.filter(log => log.action === filterAction);
    }
    
    if (filterUser) {
      filtered = filtered.filter(log => 
        log.user_name.toLowerCase().includes(filterUser.toLowerCase()) ||
        log.user_email.toLowerCase().includes(filterUser.toLowerCase())
      );
    }
    
    if (filterDate) {
      filtered = filtered.filter(log => {
        const logDate = new Date(log.timestamp).toISOString().split('T')[0];
        return logDate === filterDate;
      });
    }
    
    setFilteredLogs(filtered);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-pulse">
          {language === 'ar' ? 'جاري التحميل...' : 'Loading...'}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="font-cairo font-bold text-xl text-right">
          {language === 'ar' ? 'سجل النشاط' : 'Activity Log'}
        </h2>
        <p className="text-sm text-muted-foreground mt-1 text-right">
          {language === 'ar' ? 'تتبع جميع الإجراءات والأنشطة في النظام' : 'Track all actions and activities in the system'}
        </p>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium">
                {language === 'ar' ? 'تصفية:' : 'Filter:'}
              </span>
            </div>
            
            <Select value={filterAction} onValueChange={setFilterAction}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder={language === 'ar' ? 'نوع الإجراء' : 'Action Type'} />
              </SelectTrigger>
              <SelectContent position="popper">
                <SelectItem value="all">{language === 'ar' ? 'جميع الإجراءات' : 'All Actions'}</SelectItem>
                {Object.entries(ACTION_CONFIG).map(([key, config]) => (
                  <SelectItem key={key} value={key}>
                    {config.label[language]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Input
              placeholder={language === 'ar' ? 'بحث بالمستخدم...' : 'Search by user...'}
              value={filterUser}
              onChange={(e) => setFilterUser(e.target.value)}
              className="w-48"
            />
            
            <Input
              type="date"
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
              className="w-48"
            />
            
            {(filterAction !== "all" || filterUser || filterDate) && (
              <Badge variant="outline" className="cursor-pointer" onClick={() => {
                setFilterAction("all");
                setFilterUser("");
                setFilterDate("");
              }}>
                {language === 'ar' ? 'مسح الفلاتر' : 'Clear Filters'} ({filteredLogs.length})
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Activity Table */}
      <Card>
        <CardHeader>
          <CardTitle className="font-cairo">
            {language === 'ar' ? 'سجل الأنشطة' : 'Activity Log'}
          </CardTitle>
          <CardDescription>
            {language === 'ar' ? `عرض ${filteredLogs.length} من ${logs.length} نشاط` : `Showing ${filteredLogs.length} of ${logs.length} activities`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-right">{language === 'ar' ? 'التاريخ والوقت' : 'Date & Time'}</TableHead>
                  <TableHead className="text-right">{language === 'ar' ? 'التفاصيل' : 'Details'}</TableHead>
                  <TableHead className="text-right">{language === 'ar' ? 'الهدف' : 'Target'}</TableHead>
                  <TableHead className="text-right">{language === 'ar' ? 'المستخدم' : 'User'}</TableHead>
                  <TableHead className="text-right">{language === 'ar' ? 'الإجراء' : 'Action'}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLogs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      {language === 'ar' ? 'لا توجد أنشطة' : 'No activities found'}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredLogs.map((log) => {
                    const config = ACTION_CONFIG[log.action] || ACTION_CONFIG.login;
                    const Icon = config.icon;
                    
                    return (
                      <TableRow key={log.id}>
                        <TableCell className="text-sm text-muted-foreground text-right">
                          {new Date(log.timestamp).toLocaleString(language === 'ar' ? 'ar-SA' : 'en-US', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground max-w-xs truncate text-right">
                          {log.details}
                        </TableCell>
                        <TableCell className="text-right">
                          {log.target ? (
                            <span className="text-sm">{log.target}</span>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div>
                            <p className="text-sm font-medium">{log.user_name}</p>
                            <p className="text-xs text-muted-foreground">{log.user_email}</p>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center gap-2 justify-end">
                            <span className="text-sm">{config.label[language]}</span>
                            <div className={`w-8 h-8 rounded-lg ${config.color} flex items-center justify-center`}>
                              <Icon className="w-4 h-4 text-white" />
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
