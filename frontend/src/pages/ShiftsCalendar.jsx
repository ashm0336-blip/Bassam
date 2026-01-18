import { useState, useEffect } from "react";
import axios from "axios";
import { useLanguage } from "@/context/LanguageContext";
import { useAuth } from "@/context/AuthContext";
import { 
  Calendar as CalendarIcon, 
  Clock, 
  Coffee,
  Edit,
  Save,
  X,
  Loader2
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
import { toast } from "sonner";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const SHIFTS = [
  { value: "الأولى صيف", label: "الأولى صيف", time: "3:00 - 8:00", color: "bg-blue-500" },
  { value: "الأولى شتاء", label: "الأولى شتاء", time: "2:30 - 7:30", color: "bg-blue-600" },
  { value: "الثانية صيف", label: "الثانية صيف", time: "2:30 - 9:30", color: "bg-green-500" },
  { value: "الثانية شتاء", label: "الثانية شتاء", time: "2:00 - 9:00", color: "bg-green-600" },
  { value: "الثالثة صيف", label: "الثالثة صيف", time: "9:00 - 3:00", color: "bg-orange-500" },
  { value: "الثالثة شتاء", label: "الثالثة شتاء", time: "", color: "bg-orange-600" },
  { value: "الرابعة", label: "الرابعة", time: "", color: "bg-purple-500" }
];

const WEEKDAYS = [
  "السبت", "الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة"
];

export default function ShiftsManagement() {
  const { language } = useLanguage();
  const { isReadOnly } = useAuth();
  const [employees, setEmployees] = useState([]);
  const [editingShift, setEditingShift] = useState(null);
  const [editingRest, setEditingRest] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchEmployees();
  }, []);

  const fetchEmployees = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(`${API}/employees?department=planning`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setEmployees(response.data);
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateShift = async (employeeId, newShift) => {
    try {
      const token = localStorage.getItem("token");
      await axios.put(
        `${API}/employees/${employeeId}`,
        { shift: newShift },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success(language === 'ar' ? 'تم تحديث الوردية' : 'Shift updated');
      fetchEmployees();
      setEditingShift(null);
    } catch (error) {
      console.error("Error:", error);
      toast.error(language === 'ar' ? 'فشل التحديث' : 'Failed');
    }
  };

  const handleUpdateRest = async (employeeId, newRest) => {
    try {
      const token = localStorage.getItem("token");
      await axios.put(
        `${API}/employees/${employeeId}`,
        { weekly_rest: newRest },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success(language === 'ar' ? 'تم تحديث أيام الراحة' : 'Rest days updated');
      fetchEmployees();
      setEditingRest(null);
    } catch (error) {
      console.error("Error:", error);
      toast.error(language === 'ar' ? 'فشل التحديث' : 'Failed');
    }
  };

  const groupByShift = employees.reduce((acc, emp) => {
    const shift = emp.shift || 'غير محدد';
    if (!acc[shift]) acc[shift] = [];
    acc[shift].push(emp);
    return acc;
  }, {});

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header */}
      <div className="text-right">
        <h1 className="font-cairo font-bold text-2xl">
          {language === 'ar' ? 'إدارة الورديات وأيام الراحة' : 'Shifts & Rest Days Management'}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          {language === 'ar' ? 'تحكم كامل في جداول الورديات وأيام الراحة للموظفين' : 'Complete control over shifts and rest days'}
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="text-right">
                <p className="text-xs text-muted-foreground">إجمالي الموظفين</p>
                <p className="text-2xl font-bold">{employees.length}</p>
              </div>
              <Clock className="w-8 h-8 text-primary" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="text-right">
                <p className="text-xs text-muted-foreground">الورديات النشطة</p>
                <p className="text-2xl font-bold">{Object.keys(groupByShift).length}</p>
              </div>
              <Clock className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="text-right">
                <p className="text-xs text-muted-foreground">موظفين بورديات</p>
                <p className="text-2xl font-bold text-green-600">
                  {employees.filter(e => e.shift).length}
                </p>
              </div>
              <Clock className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Shifts Table */}
      <Card>
        <CardHeader>
          <CardTitle className="font-cairo text-base text-right flex items-center gap-2 justify-end">
            <Clock className="w-5 h-5" />
            جدول الورديات
          </CardTitle>
          <CardDescription className="text-right">
            اضغط على الوردية لتعديلها
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-right">الموظف</TableHead>
                <TableHead className="text-center">الرقم الوظيفي</TableHead>
                <TableHead className="text-center">الوردية</TableHead>
                <TableHead className="text-center">الوقت</TableHead>
                <TableHead className="text-center">مهام العمل</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {employees.map((emp) => {
                const shiftInfo = SHIFTS.find(s => s.value === emp.shift);
                
                return (
                  <TableRow key={emp.id}>
                    <TableCell className="text-right font-medium">{emp.name}</TableCell>
                    <TableCell className="text-center text-sm">{emp.employee_number}</TableCell>
                    <TableCell className="text-center">
                      {!isReadOnly() ? (
                        <Select 
                          value={emp.shift || ""} 
                          onValueChange={(v) => handleUpdateShift(emp.id, v)}
                        >
                          <SelectTrigger className="h-8 w-36">
                            <SelectValue placeholder="اختر..." />
                          </SelectTrigger>
                          <SelectContent>
                            {SHIFTS.map((shift) => (
                              <SelectItem key={shift.value} value={shift.value}>
                                {shift.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        emp.shift && (
                          <Badge className={`${shiftInfo?.color || 'bg-gray-500'} text-white`}>
                            {emp.shift}
                          </Badge>
                        )
                      )}
                    </TableCell>
                    <TableCell className="text-center text-sm">
                      {shiftInfo?.time || emp.shift_time || '-'}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="outline" className="text-xs">
                        {emp.work_tasks || '-'}
                      </Badge>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Rest Days Table */}
      <Card>
        <CardHeader>
          <CardTitle className="font-cairo text-base text-right flex items-center gap-2 justify-end">
            <Coffee className="w-5 h-5" />
            جدول أيام الراحة
          </CardTitle>
          <CardDescription className="text-right">
            اضغط لتعديل أيام الراحة
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-right">الموظف</TableHead>
                <TableHead className="text-center">الرقم الوظيفي</TableHead>
                <TableHead className="text-center">أيام الراحة الحالية</TableHead>
                <TableHead className="text-center">الإجراءات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {employees.map((emp) => (
                <TableRow key={emp.id}>
                  <TableCell className="text-right font-medium">{emp.name}</TableCell>
                  <TableCell className="text-center text-sm">{emp.employee_number}</TableCell>
                  <TableCell className="text-center">
                    {editingRest === emp.id ? (
                      <div className="flex gap-2 justify-center">
                        <Input 
                          defaultValue={emp.weekly_rest}
                          id={`rest-${emp.id}`}
                          className="h-8 w-48 text-center"
                          placeholder="مثال: السبت - الأحد"
                        />
                        <Button
                          size="sm"
                          onClick={() => {
                            const newRest = document.getElementById(`rest-${emp.id}`).value;
                            handleUpdateRest(emp.id, newRest);
                          }}
                        >
                          <Save className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setEditingRest(null)}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    ) : (
                      <Badge variant="outline" className="text-sm">
                        {emp.weekly_rest || '-'}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-center">
                    {!isReadOnly() && editingRest !== emp.id && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setEditingRest(emp.id)}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
