import { useState, useEffect } from "react";
import axios from "axios";
import EmployeeManagement from "@/components/EmployeeManagement";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  DoorOpen, 
  DoorClosed,
  Wrench,
  ArrowUpRight,
  ArrowDownRight,
  ArrowLeftRight,
  Users,
  Activity,
  MapPin,
  Filter
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
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

const GateCard = ({ gate }) => {
  const statusConfig = {
    open: { icon: DoorOpen, color: "bg-primary", label: "مفتوح", textColor: "text-primary" },
    closed: { icon: DoorClosed, color: "bg-destructive", label: "مغلق", textColor: "text-destructive" },
    maintenance: { icon: Wrench, color: "bg-secondary", label: "صيانة", textColor: "text-secondary" }
  };

  const directionConfig = {
    entry: { icon: ArrowDownRight, label: "دخول" },
    exit: { icon: ArrowUpRight, label: "خروج" },
    both: { icon: ArrowLeftRight, label: "دخول/خروج" }
  };

  const status = statusConfig[gate.status] || statusConfig.open;
  const direction = directionConfig[gate.direction] || directionConfig.both;
  const StatusIcon = status.icon;
  const DirectionIcon = direction.icon;
  const flowPercentage = (gate.current_flow / gate.max_flow) * 100;

  return (
    <Card className="card-hover" data-testid={`gate-card-${gate.id}`}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-lg ${status.color}/10 flex items-center justify-center`}>
              <StatusIcon className={`w-5 h-5 ${status.textColor}`} />
            </div>
            <div>
              <h3 className="font-cairo font-semibold text-sm">{gate.name}</h3>
              <p className="text-xs text-muted-foreground">باب رقم {gate.number}</p>
            </div>
          </div>
          <Badge className={`${status.color} text-white text-[10px]`}>{status.label}</Badge>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs">
            <span className="flex items-center gap-1 text-muted-foreground">
              <DirectionIcon className="w-4 h-4" />
              {direction.label}
            </span>
            <span className="flex items-center gap-1 text-muted-foreground">
              <MapPin className="w-4 h-4" />
              {gate.location}
            </span>
          </div>

          {gate.status === "open" && (
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-muted-foreground">التدفق الحالي</span>
                <span className="font-semibold">{gate.current_flow.toLocaleString('ar-SA')} / {gate.max_flow.toLocaleString('ar-SA')}</span>
              </div>
              <Progress 
                value={flowPercentage} 
                className={`h-2 ${
                  flowPercentage < 70 ? "[&>div]:bg-primary" :
                  flowPercentage < 85 ? "[&>div]:bg-secondary" :
                  "[&>div]:bg-destructive"
                }`}
              />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default function GatesDepartment() {
  const [gates, setGates] = useState([]);
  const [stats, setStats] = useState(null);
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [gatesRes, statsRes] = await Promise.all([
          axios.get(`${API}/gates`),
          axios.get(`${API}/gates/stats`)
        ]);
        setGates(gatesRes.data);
        setStats(statsRes.data);
      } catch (error) {
        console.error("Error fetching gates data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  const filteredGates = filter === "all" 
    ? gates 
    : gates.filter(g => g.status === filter);

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
    <div className="space-y-6" data-testid="gates-page">
      <Tabs defaultValue="gates" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="employees">
            <Users className="w-4 h-4 ml-2" />
            الموظفون
          </TabsTrigger>
          <TabsTrigger value="gates">
            <DoorOpen className="w-4 h-4 ml-2" />
            الأبواب
          </TabsTrigger>
        </TabsList>

        <TabsContent value="gates" className="space-y-6 mt-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-cairo font-bold text-2xl">إدارة الأبواب</h1>
          <p className="text-sm text-muted-foreground mt-1">مراقبة وإدارة أبواب الحرم المكي الشريف</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="w-40" data-testid="gate-filter">
              <Filter className="w-4 h-4 ml-2" />
              <SelectValue placeholder="تصفية" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">جميع الأبواب</SelectItem>
              <SelectItem value="open">مفتوح</SelectItem>
              <SelectItem value="closed">مغلق</SelectItem>
              <SelectItem value="maintenance">صيانة</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="card-hover">
          <CardContent className="p-5">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <DoorOpen className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">أبواب مفتوحة</p>
                <p className="text-2xl font-cairo font-bold text-primary">{stats?.open || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="card-hover">
          <CardContent className="p-5">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-destructive/10 flex items-center justify-center">
                <DoorClosed className="w-6 h-6 text-destructive" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">أبواب مغلقة</p>
                <p className="text-2xl font-cairo font-bold text-destructive">{stats?.closed || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="card-hover">
          <CardContent className="p-5">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-secondary/20 flex items-center justify-center">
                <Wrench className="w-6 h-6 text-secondary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">تحت الصيانة</p>
                <p className="text-2xl font-cairo font-bold text-secondary">{stats?.maintenance || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="card-hover">
          <CardContent className="p-5">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
                <Activity className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">إجمالي التدفق</p>
                <p className="text-2xl font-cairo font-bold">{stats?.total_flow?.toLocaleString('ar-SA') || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Gates Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filteredGates.map((gate, index) => (
          <div key={gate.id} className={`animate-fade-in stagger-${(index % 5) + 1}`}>
            <GateCard gate={gate} />
          </div>
        ))}
      </div>

      {/* Gates Table */}
      <Card data-testid="gates-table">
        <CardHeader className="pb-2">
          <CardTitle className="font-cairo text-lg">قائمة الأبواب التفصيلية</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-right">رقم الباب</TableHead>
                  <TableHead className="text-right">الاسم</TableHead>
                  <TableHead className="text-right">الحالة</TableHead>
                  <TableHead className="text-right">الاتجاه</TableHead>
                  <TableHead className="text-right">الموقع</TableHead>
                  <TableHead className="text-right">التدفق الحالي</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {gates.slice(0, 8).map((gate) => (
                  <TableRow key={gate.id}>
                    <TableCell className="font-medium">{gate.number}</TableCell>
                    <TableCell>{gate.name}</TableCell>
                    <TableCell>
                      <Badge 
                        variant="outline"
                        className={
                          gate.status === "open" ? "border-primary text-primary" :
                          gate.status === "closed" ? "border-destructive text-destructive" :
                          "border-secondary text-secondary"
                        }
                      >
                        {gate.status === "open" ? "مفتوح" : 
                         gate.status === "closed" ? "مغلق" : "صيانة"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {gate.direction === "entry" ? "دخول" :
                       gate.direction === "exit" ? "خروج" : "دخول/خروج"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{gate.location}</TableCell>
                    <TableCell>{gate.current_flow.toLocaleString('ar-SA')}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default GatesDepartment;
