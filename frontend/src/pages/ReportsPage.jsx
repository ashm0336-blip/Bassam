import { useState, useEffect } from "react";
import axios from "axios";
import { useLanguage } from "@/context/LanguageContext";
import { useAuth } from "@/context/AuthContext";
import { 
  FileText, 
  Download,
  Calendar,
  Filter,
  TrendingUp,
  BarChart3,
  PieChart,
  FileBarChart,
  FileSpreadsheet,
  Loader2
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { 
  exportGatesReport, 
  exportPlazasReport, 
  exportMatafReport, 
  exportDailySummary 
} from "@/utils/exportUtils";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const ReportCard = ({ report }) => {
  const typeConfig = {
    daily: { icon: Calendar, color: "bg-primary/10 text-primary", label: "يومي" },
    weekly: { icon: BarChart3, color: "bg-secondary/20 text-secondary", label: "أسبوعي" },
    monthly: { icon: PieChart, color: "bg-blue-100 text-blue-600", label: "شهري" }
  };

  const type = typeConfig[report.type] || typeConfig.daily;
  const Icon = type.icon;

  const deptLabels = {
    all: "جميع الإدارات",
    gates: "إدارة الأبواب",
    plazas: "إدارة الساحات",
    mataf: "صحن المطاف",
    planning: "التخطيط",
    crowd_services: "خدمات الحشود"
  };

  return (
    <Card className="card-hover" data-testid={`report-card-${report.id}`}>
      <CardContent className="p-5">
        <div className="flex items-start gap-4">
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${type.color}`}>
            <Icon className="w-6 h-6" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between mb-2">
              <h3 className="font-semibold text-sm">{report.title}</h3>
              <Badge variant="outline" className="text-[10px]">{type.label}</Badge>
            </div>
            <p className="text-xs text-muted-foreground mb-3">{report.summary}</p>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {report.date}
                </span>
                <span>{deptLabels[report.department] || report.department}</span>
              </div>
              <Button variant="ghost" size="sm" className="text-primary text-xs h-7">
                <Download className="w-3 h-3 ml-1" />
                تحميل
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default function ReportsPage() {
  const { t, language } = useLanguage();
  const { user } = useAuth();
  const [reports, setReports] = useState([]);
  const [gates, setGates] = useState([]);
  const [plazas, setPlazas] = useState([]);
  const [mataf, setMataf] = useState([]);
  const [stats, setStats] = useState(null);
  const [departments, setDepartments] = useState([]);
  const [filterType, setFilterType] = useState("all");
  const [filterDept, setFilterDept] = useState("all");
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(null);

  // Check if user can access all departments
  const canAccessAllDepartments = user?.role === "system_admin" || 
                                    user?.role === "general_manager" || 
                                    user?.role === "monitoring_team";

  // Get user's department for filtering
  const userDepartment = user?.department;

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [reportsRes, gatesRes, plazasRes, matafRes, statsRes, deptsRes] = await Promise.all([
          axios.get(`${API}/reports`),
          axios.get(`${API}/gates`),
          axios.get(`${API}/plazas`),
          axios.get(`${API}/mataf`),
          axios.get(`${API}/dashboard/stats`),
          axios.get(`${API}/dashboard/departments`)
        ]);
        setReports(reportsRes.data);
        setGates(gatesRes.data);
        setPlazas(plazasRes.data);
        setMataf(matafRes.data);
        setStats(statsRes.data);
        setDepartments(deptsRes.data);
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleExport = async (type, format) => {
    setExporting(`${type}-${format}`);
    try {
      switch (type) {
        case 'gates':
          exportGatesReport(gates, format);
          break;
        case 'plazas':
          exportPlazasReport(plazas, format);
          break;
        case 'mataf':
          exportMatafReport(mataf, format);
          break;
        case 'daily':
          exportDailySummary(stats, departments, format);
          break;
        default:
          break;
      }
      toast.success(language === 'ar' ? `تم تصدير التقرير بنجاح (${format.toUpperCase()})` : `Report exported successfully (${format.toUpperCase()})`);
    } catch (error) {
      console.error("Export error:", error);
      toast.error(language === 'ar' ? "حدث خطأ أثناء التصدير" : "Export error occurred");
    } finally {
      setExporting(null);
    }
  };

  const quickStats = [
    { label: language === 'ar' ? "التقارير اليومية" : "Daily Reports", value: 28, icon: Calendar, color: "bg-primary/10 text-primary" },
    { label: language === 'ar' ? "التقارير الأسبوعية" : "Weekly Reports", value: 12, icon: BarChart3, color: "bg-secondary/20 text-secondary" },
    { label: language === 'ar' ? "التقارير الشهرية" : "Monthly Reports", value: 4, icon: PieChart, color: "bg-blue-100 text-blue-600" },
    { label: language === 'ar' ? "التحليلات المقارنة" : "Comparative Analysis", value: 8, icon: TrendingUp, color: "bg-green-100 text-green-600" }
  ];

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <Card key={i}><CardContent className="p-5 h-24 bg-muted/50" /></Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="reports-page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-cairo font-bold text-2xl">التقارير والإحصائيات</h1>
          <p className="text-sm text-muted-foreground mt-1">عرض وتصدير التقارير والتحليلات</p>
        </div>
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button className="bg-primary hover:bg-primary/90" data-testid="export-daily-btn">
                <Download className="w-4 h-4 ml-2" />
                تصدير التقرير اليومي
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => handleExport('daily', 'pdf')}>
                <FileBarChart className="w-4 h-4 ml-2" />
                تصدير PDF
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport('daily', 'excel')}>
                <FileSpreadsheet className="w-4 h-4 ml-2" />
                تصدير Excel
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {quickStats.map((stat, index) => (
          <Card key={index} className="card-hover">
            <CardContent className="p-5">
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${stat.color}`}>
                  <stat.icon className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                  <p className="text-2xl font-cairo font-bold">{stat.value}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Export Section */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="font-cairo text-lg">تصدير التقارير</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Gates Report */}
            <div className="p-4 rounded-lg border border-gray-200 hover:border-primary/30 transition-colors">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <FileText className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm">تقرير الأبواب</h3>
                  <p className="text-xs text-muted-foreground">{gates.length} باب</p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="flex-1"
                  onClick={() => handleExport('gates', 'pdf')}
                  disabled={exporting === 'gates-pdf'}
                  data-testid="export-gates-pdf"
                >
                  {exporting === 'gates-pdf' ? <Loader2 className="w-4 h-4 animate-spin" /> : 'PDF'}
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="flex-1"
                  onClick={() => handleExport('gates', 'excel')}
                  disabled={exporting === 'gates-excel'}
                  data-testid="export-gates-excel"
                >
                  {exporting === 'gates-excel' ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Excel'}
                </Button>
              </div>
            </div>

            {/* Plazas Report */}
            <div className="p-4 rounded-lg border border-gray-200 hover:border-secondary/30 transition-colors">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-lg bg-secondary/20 flex items-center justify-center">
                  <FileText className="w-5 h-5 text-secondary" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm">تقرير الساحات</h3>
                  <p className="text-xs text-muted-foreground">{plazas.length} ساحة</p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="flex-1"
                  onClick={() => handleExport('plazas', 'pdf')}
                  disabled={exporting === 'plazas-pdf'}
                  data-testid="export-plazas-pdf"
                >
                  {exporting === 'plazas-pdf' ? <Loader2 className="w-4 h-4 animate-spin" /> : 'PDF'}
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="flex-1"
                  onClick={() => handleExport('plazas', 'excel')}
                  disabled={exporting === 'plazas-excel'}
                  data-testid="export-plazas-excel"
                >
                  {exporting === 'plazas-excel' ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Excel'}
                </Button>
              </div>
            </div>

            {/* Mataf Report */}
            <div className="p-4 rounded-lg border border-gray-200 hover:border-blue-300 transition-colors">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                  <FileText className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm">تقرير المطاف</h3>
                  <p className="text-xs text-muted-foreground">{mataf.length} طوابق</p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="flex-1"
                  onClick={() => handleExport('mataf', 'pdf')}
                  disabled={exporting === 'mataf-pdf'}
                  data-testid="export-mataf-pdf"
                >
                  {exporting === 'mataf-pdf' ? <Loader2 className="w-4 h-4 animate-spin" /> : 'PDF'}
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="flex-1"
                  onClick={() => handleExport('mataf', 'excel')}
                  disabled={exporting === 'mataf-excel'}
                  data-testid="export-mataf-excel"
                >
                  {exporting === 'mataf-excel' ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Excel'}
                </Button>
              </div>
            </div>

            {/* Daily Summary */}
            <div className="p-4 rounded-lg border border-gray-200 hover:border-green-300 transition-colors">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm">التقرير الشامل</h3>
                  <p className="text-xs text-muted-foreground">ملخص يومي</p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="flex-1"
                  onClick={() => handleExport('daily', 'pdf')}
                  disabled={exporting === 'daily-pdf'}
                  data-testid="export-summary-pdf"
                >
                  {exporting === 'daily-pdf' ? <Loader2 className="w-4 h-4 animate-spin" /> : 'PDF'}
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="flex-1"
                  onClick={() => handleExport('daily', 'excel')}
                  disabled={exporting === 'daily-excel'}
                  data-testid="export-summary-excel"
                >
                  {exporting === 'daily-excel' ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Excel'}
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium">تصفية:</span>
            </div>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-40" data-testid="type-filter">
                <SelectValue placeholder="نوع التقرير" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">جميع الأنواع</SelectItem>
                <SelectItem value="daily">يومي</SelectItem>
                <SelectItem value="weekly">أسبوعي</SelectItem>
                <SelectItem value="monthly">شهري</SelectItem>
              </SelectContent>
            </Select>
            
            {/* Show department filter only for users who can access all departments */}
            {canAccessAllDepartments && (
              <Select value={filterDept} onValueChange={setFilterDept}>
                <SelectTrigger className="w-48" data-testid="dept-filter">
                  <SelectValue placeholder="الإدارة" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">جميع الإدارات</SelectItem>
                  <SelectItem value="gates">إدارة الأبواب</SelectItem>
                  <SelectItem value="plazas">إدارة الساحات</SelectItem>
                  <SelectItem value="mataf">صحن المطاف</SelectItem>
                  <SelectItem value="planning">التخطيط</SelectItem>
                  <SelectItem value="crowd_services">خدمات الحشود</SelectItem>
                </SelectContent>
              </Select>
            )}
            
            {/* Show info badge for department managers */}
            {!canAccessAllDepartments && userDepartment && (
              <Badge variant="secondary" className="text-xs">
                عرض تقارير: {
                  userDepartment === "gates" ? "إدارة الأبواب" :
                  userDepartment === "plazas" ? "إدارة الساحات" :
                  userDepartment === "mataf" ? "صحن المطاف" :
                  userDepartment === "planning" ? "التخطيط" :
                  userDepartment === "crowd_services" ? "خدمات الحشود" :
                  userDepartment
                }
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Reports List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {reports
          .filter(r => filterType === 'all' || r.type === filterType)
          .filter(r => filterDept === 'all' || r.department === filterDept)
          .map((report, index) => (
            <div key={report.id} className={`animate-fade-in stagger-${(index % 4) + 1}`}>
              <ReportCard report={report} />
            </div>
          ))}
      </div>
    </div>
  );
}
