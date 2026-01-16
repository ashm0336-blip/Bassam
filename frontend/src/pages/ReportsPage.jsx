import { useState, useEffect } from "react";
import axios from "axios";
import { 
  FileText, 
  Download,
  Calendar,
  Filter,
  TrendingUp,
  BarChart3,
  PieChart,
  FileBarChart
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
  const [reports, setReports] = useState([]);
  const [filterType, setFilterType] = useState("all");
  const [filterDept, setFilterDept] = useState("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchReports = async () => {
      try {
        let url = `${API}/reports`;
        const params = [];
        if (filterType !== "all") params.push(`type=${filterType}`);
        if (filterDept !== "all") params.push(`department=${filterDept}`);
        if (params.length > 0) url += `?${params.join("&")}`;
        
        const response = await axios.get(url);
        setReports(response.data);
      } catch (error) {
        console.error("Error fetching reports:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchReports();
  }, [filterType, filterDept]);

  const quickStats = [
    { label: "التقارير اليومية", value: 28, icon: Calendar, color: "bg-primary/10 text-primary" },
    { label: "التقارير الأسبوعية", value: 12, icon: BarChart3, color: "bg-secondary/20 text-secondary" },
    { label: "التقارير الشهرية", value: 4, icon: PieChart, color: "bg-blue-100 text-blue-600" },
    { label: "التحليلات المقارنة", value: 8, icon: TrendingUp, color: "bg-green-100 text-green-600" }
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
        <Button className="bg-primary hover:bg-primary/90" data-testid="create-report-btn">
          <FileBarChart className="w-4 h-4 ml-2" />
          إنشاء تقرير
        </Button>
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
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Reports Tabs */}
      <Tabs defaultValue="list" className="w-full">
        <TabsList className="bg-muted/50">
          <TabsTrigger value="list">قائمة التقارير</TabsTrigger>
          <TabsTrigger value="table">عرض جدولي</TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {reports.map((report, index) => (
              <div key={report.id} className={`animate-fade-in stagger-${(index % 4) + 1}`}>
                <ReportCard report={report} />
              </div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="table" className="mt-4">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-right">عنوان التقرير</TableHead>
                    <TableHead className="text-right">النوع</TableHead>
                    <TableHead className="text-right">الإدارة</TableHead>
                    <TableHead className="text-right">التاريخ</TableHead>
                    <TableHead className="text-right">الملخص</TableHead>
                    <TableHead className="text-right">إجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reports.map((report) => (
                    <TableRow key={report.id}>
                      <TableCell className="font-medium">{report.title}</TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {report.type === "daily" ? "يومي" : 
                           report.type === "weekly" ? "أسبوعي" : "شهري"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {report.department === "all" ? "جميع الإدارات" :
                         report.department === "gates" ? "الأبواب" :
                         report.department === "plazas" ? "الساحات" :
                         report.department === "mataf" ? "المطاف" : report.department}
                      </TableCell>
                      <TableCell>{report.date}</TableCell>
                      <TableCell className="text-muted-foreground max-w-[200px] truncate">{report.summary}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm" className="text-primary">
                          <Download className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
