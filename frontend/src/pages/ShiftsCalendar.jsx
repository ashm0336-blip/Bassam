import { useState, useEffect } from "react";
import axios from "axios";
import { useLanguage } from "@/context/LanguageContext";
import { Calendar as CalendarIcon, Users, Clock, Briefcase, Coffee } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function ShiftsCalendar() {
  const { language } = useLanguage();
  const [employees, setEmployees] = useState([]);
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
      console.error("Error fetching employees:", error);
    } finally {
      setLoading(false);
    }
  };

  const shiftColors = {
    'الأولى صيف': 'bg-blue-100 text-blue-800 border-blue-200',
    'الأولى شتاء': 'bg-blue-200 text-blue-900 border-blue-300',
    'الثانية صيف': 'bg-green-100 text-green-800 border-green-200',
    'الثانية شتاء': 'bg-green-200 text-green-900 border-green-300',
    'الثالثة صيف': 'bg-orange-100 text-orange-800 border-orange-200',
    'الثالثة شتاء': 'bg-orange-200 text-orange-900 border-orange-300'
  };

  const taskColors = {
    'الشؤون الإدارية': 'bg-purple-100 text-purple-800',
    'الشؤون الفنية والميدانية': 'bg-cyan-100 text-cyan-800'
  };

  const groupByShift = employees.reduce((acc, emp) => {
    const shift = emp.shift || 'غير محدد';
    if (!acc[shift]) acc[shift] = [];
    acc[shift].push(emp);
    return acc;
  }, {});

  const groupByTasks = employees.reduce((acc, emp) => {
    const task = emp.work_tasks || 'غير محدد';
    if (!acc[task]) acc[task] = [];
    acc[task].push(emp);
    return acc;
  }, {});

  return (
    <div className="space-y-6" data-testid="shifts-calendar">
      {/* Header Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="text-right">
                <p className="text-xs text-muted-foreground">
                  {language === 'ar' ? 'إجمالي الموظفين' : 'Total Staff'}
                </p>
                <p className="text-2xl font-bold">{employees.length}</p>
              </div>
              <Users className="w-8 h-8 text-primary" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="text-right">
                <p className="text-xs text-muted-foreground">
                  {language === 'ar' ? 'الورديات' : 'Shifts'}
                </p>
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
                <p className="text-xs text-muted-foreground">
                  {language === 'ar' ? 'الشؤون الإدارية' : 'Administrative'}
                </p>
                <p className="text-2xl font-bold text-purple-600">
                  {groupByTasks['الشؤون الإدارية']?.length || 0}
                </p>
              </div>
              <Briefcase className="w-8 h-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="text-right">
                <p className="text-xs text-muted-foreground">
                  {language === 'ar' ? 'الفنية والميدانية' : 'Technical & Field'}
                </p>
                <p className="text-2xl font-bold text-cyan-600">
                  {groupByTasks['الشؤون الفنية والميدانية']?.length || 0}
                </p>
              </div>
              <Briefcase className="w-8 h-8 text-cyan-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Shifts Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* By Shift */}
        <Card>
          <CardHeader>
            <CardTitle className="font-cairo text-base text-right flex items-center gap-2 justify-end">
              <Clock className="w-5 h-5" />
              {language === 'ar' ? 'توزيع الورديات' : 'Shift Distribution'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {Object.entries(groupByShift).map(([shift, emps]) => (
              <div key={shift} className="space-y-2">
                <div className="flex items-center justify-between">
                  <Badge className={shiftColors[shift] || 'bg-gray-100'}>
                    {shift}
                  </Badge>
                  <p className="text-sm font-medium">{emps.length} {language === 'ar' ? 'موظف' : 'staff'}</p>
                </div>
                <div className="pr-4 space-y-1">
                  {emps.map(emp => (
                    <div key={emp.id} className="flex items-center justify-between text-sm p-2 bg-muted/30 rounded">
                      <div className="text-right flex-1">
                        <p className="font-medium">{emp.name}</p>
                        <p className="text-xs text-muted-foreground">{emp.job_title}</p>
                      </div>
                      {emp.shift_time && (
                        <Badge variant="outline" className="text-xs">
                          {emp.shift_time}
                        </Badge>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* By Work Tasks */}
        <Card>
          <CardHeader>
            <CardTitle className="font-cairo text-base text-right flex items-center gap-2 justify-end">
              <Briefcase className="w-5 h-5" />
              {language === 'ar' ? 'توزيع المهام' : 'Task Distribution'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {Object.entries(groupByTasks).map(([task, emps]) => (
              <div key={task} className="space-y-2">
                <div className="flex items-center justify-between">
                  <Badge className={taskColors[task] || 'bg-gray-100'}>
                    {task}
                  </Badge>
                  <p className="text-sm font-medium">{emps.length} {language === 'ar' ? 'موظف' : 'staff'}</p>
                </div>
                <div className="pr-4 space-y-1">
                  {emps.map(emp => (
                    <div key={emp.id} className="flex items-center justify-between text-sm p-2 bg-muted/30 rounded">
                      <div className="text-right flex-1">
                        <p className="font-medium">{emp.name}</p>
                        <p className="text-xs text-muted-foreground">{emp.employee_number}</p>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        <Coffee className="w-3 h-3 ml-1" />
                        {emp.weekly_rest}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
