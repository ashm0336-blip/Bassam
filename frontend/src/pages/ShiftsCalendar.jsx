import { useState } from "react";
import { useLanguage } from "@/context/LanguageContext";
import { useAuth } from "@/context/AuthContext";
import { Clock, Coffee, Plus, Edit, Trash2, Save, X } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";

export default function ShiftsManagement() {
  const { language } = useLanguage();
  const { isReadOnly } = useAuth();
  
  const [shifts, setShifts] = useState([
    { id: "1", name: "الأولى صيف", time: "3:00 - 8:00", type: "صيف" },
    { id: "2", name: "الأولى شتاء", time: "2:30 - 7:30", type: "شتاء" },
    { id: "3", name: "الثانية صيف", time: "2:30 - 9:30", type: "صيف" },
    { id: "4", name: "الثانية شتاء", time: "2:00 - 9:00", type: "شتاء" },
    { id: "5", name: "الثالثة صيف", time: "9:00 - 3:00", type: "صيف" }
  ]);

  const [restPatterns, setRestPatterns] = useState([
    { id: "1", pattern: "السبت - الأحد", days: 2 },
    { id: "2", pattern: "الخميس - الجمعة", days: 2 },
    { id: "3", pattern: "الجمعة - السبت", days: 2 }
  ]);

  const [shiftDialog, setShiftDialog] = useState(false);
  const [restDialog, setRestDialog] = useState(false);
  const [editingShift, setEditingShift] = useState(null);
  const [editingRest, setEditingRest] = useState(null);

  const [shiftForm, setShiftForm] = useState({ name: "", time: "", type: "صيف" });
  const [restForm, setRestForm] = useState({ pattern: "", days: 2 });

  // Shift handlers
  const handleShiftDialog = (shift = null) => {
    if (shift) {
      setEditingShift(shift);
      setShiftForm({ name: shift.name, time: shift.time, type: shift.type });
    } else {
      setEditingShift(null);
      setShiftForm({ name: "", time: "", type: "صيف" });
    }
    setShiftDialog(true);
  };

  const handleShiftSubmit = (e) => {
    e.preventDefault();
    if (editingShift) {
      setShifts(shifts.map(s => s.id === editingShift.id ? {...s, ...shiftForm} : s));
      toast.success('تم التحديث');
    } else {
      setShifts([...shifts, {...shiftForm, id: Date.now().toString()}]);
      toast.success('تمت الإضافة');
    }
    setShiftDialog(false);
  };

  const handleShiftDelete = (id) => {
    setShifts(shifts.filter(s => s.id !== id));
    toast.success('تم الحذف');
  };

  // Rest pattern handlers
  const handleRestDialog = (rest = null) => {
    if (rest) {
      setEditingRest(rest);
      setRestForm({ pattern: rest.pattern, days: rest.days });
    } else {
      setEditingRest(null);
      setRestForm({ pattern: "", days: 2 });
    }
    setRestDialog(true);
  };

  const handleRestSubmit = (e) => {
    e.preventDefault();
    if (editingRest) {
      setRestPatterns(restPatterns.map(r => r.id === editingRest.id ? {...r, ...restForm} : r));
      toast.success('تم التحديث');
    } else {
      setRestPatterns([...restPatterns, {...restForm, id: Date.now().toString()}]);
      toast.success('تمت الإضافة');
    }
    setRestDialog(false);
  };

  const handleRestDelete = (id) => {
    setRestPatterns(restPatterns.filter(r => r.id !== id));
    toast.success('تم الحذف');
  };

  return (
    <div className="space-y-6" dir="rtl">
      <div className="text-right">
        <h1 className="font-cairo font-bold text-2xl">إعداد الورديات وأيام الراحة</h1>
        <p className="text-sm text-muted-foreground mt-1">
          إنشاء وتعديل الورديات وأنماط الراحة المتاحة للموظفين
        </p>
      </div>

      {/* Shifts Section */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            {!isReadOnly() && (
              <Button onClick={() => handleShiftDialog()} className="bg-primary">
                <Plus className="w-4 h-4 ml-2" />
                إضافة وردية
              </Button>
            )}
            <div className="text-right flex-1">
              <CardTitle className="font-cairo text-base flex items-center gap-2 justify-end">
                <Clock className="w-5 h-5" />
                الورديات المتاحة
              </CardTitle>
              <CardDescription className="text-right">
                {shifts.length} وردية
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-right">الوردية</TableHead>
                <TableHead className="text-center">الوقت</TableHead>
                <TableHead className="text-center">النوع</TableHead>
                <TableHead className="text-center">الإجراءات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {shifts.map((shift) => (
                <TableRow key={shift.id}>
                  <TableCell className="text-right font-medium">{shift.name}</TableCell>
                  <TableCell className="text-center">
                    <Badge variant="outline">{shift.time}</Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge className={shift.type === 'صيف' ? 'bg-yellow-500 text-white' : 'bg-blue-500 text-white'}>
                      {shift.type}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    {!isReadOnly() && (
                      <div className="flex gap-2 justify-center">
                        <Button size="sm" variant="ghost" onClick={() => handleShiftDialog(shift)}>
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button size="sm" variant="ghost" className="text-destructive" onClick={() => handleShiftDelete(shift.id)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Rest Patterns Section */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            {!isReadOnly() && (
              <Button onClick={() => handleRestDialog()} className="bg-secondary">
                <Plus className="w-4 h-4 ml-2" />
                إضافة نمط راحة
              </Button>
            )}
            <div className="text-right flex-1">
              <CardTitle className="font-cairo text-base flex items-center gap-2 justify-end">
                <Coffee className="w-5 h-5" />
                أنماط الراحة المتاحة
              </CardTitle>
              <CardDescription className="text-right">
                {restPatterns.length} نمط
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-right">نمط الراحة</TableHead>
                <TableHead className="text-center">عدد الأيام</TableHead>
                <TableHead className="text-center">الإجراءات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {restPatterns.map((rest) => (
                <TableRow key={rest.id}>
                  <TableCell className="text-right font-medium">{rest.pattern}</TableCell>
                  <TableCell className="text-center">
                    <Badge variant="outline">{rest.days} {language === 'ar' ? 'يوم' : 'days'}</Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    {!isReadOnly() && (
                      <div className="flex gap-2 justify-center">
                        <Button size="sm" variant="ghost" onClick={() => handleRestDialog(rest)}>
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button size="sm" variant="ghost" className="text-destructive" onClick={() => handleRestDelete(rest.id)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Shift Dialog */}
      <Dialog open={shiftDialog} onOpenChange={setShiftDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-cairo text-right">
              {editingShift ? 'تعديل الوردية' : 'إضافة وردية جديدة'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleShiftSubmit} className="space-y-4" dir="rtl">
            <div>
              <Label className="text-right block mb-2">اسم الوردية</Label>
              <Input value={shiftForm.name} onChange={(e) => setShiftForm({...shiftForm, name: e.target.value})} placeholder="الأولى صيف" className="text-right" required />
            </div>
            <div>
              <Label className="text-right block mb-2">الوقت</Label>
              <Input value={shiftForm.time} onChange={(e) => setShiftForm({...shiftForm, time: e.target.value})} placeholder="3:00 - 8:00" className="text-right" required />
            </div>
            <div>
              <Label className="text-right block mb-2">النوع</Label>
              <Input value={shiftForm.type} onChange={(e) => setShiftForm({...shiftForm, type: e.target.value})} placeholder="صيف" className="text-right" required />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShiftDialog(false)}>إلغاء</Button>
              <Button type="submit"><Save className="w-4 h-4 ml-2" />حفظ</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Rest Pattern Dialog */}
      <Dialog open={restDialog} onOpenChange={setRestDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-cairo text-right">
              {editingRest ? 'تعديل نمط الراحة' : 'إضافة نمط راحة جديد'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleRestSubmit} className="space-y-4" dir="rtl">
            <div>
              <Label className="text-right block mb-2">نمط الراحة</Label>
              <Input value={restForm.pattern} onChange={(e) => setRestForm({...restForm, pattern: e.target.value})} placeholder="السبت - الأحد" className="text-right" required />
            </div>
            <div>
              <Label className="text-right block mb-2">عدد الأيام</Label>
              <Input type="number" value={restForm.days} onChange={(e) => setRestForm({...restForm, days: parseInt(e.target.value)})} className="text-right" required />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setRestDialog(false)}>إلغاء</Button>
              <Button type="submit"><Save className="w-4 h-4 ml-2" />حفظ</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
