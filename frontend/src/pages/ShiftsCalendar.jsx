import { useState, useEffect } from "react";
import axios from "axios";
import { useLanguage } from "@/context/LanguageContext";
import { useAuth } from "@/context/AuthContext";
import { Clock, Plus, Edit, Trash2, Save, X } from "lucide-react";
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

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function ShiftsManagement() {
  const { language } = useLanguage();
  const { isReadOnly } = useAuth();
  const [shifts, setShifts] = useState([
    { id: "1", name: "الأولى صيف", time: "3:00 - 8:00", type: "صيف", rest_days: "السبت - الأحد" },
    { id: "2", name: "الأولى شتاء", time: "2:30 - 7:30", type: "شتاء", rest_days: "الخميس - الجمعة" },
    { id: "3", name: "الثانية صيف", time: "2:30 - 9:30", type: "صيف", rest_days: "السبت - الأحد" },
    { id: "4", name: "الثانية شتاء", time: "2:00 - 9:00", type: "شتاء", rest_days: "الخميس - الجمعة" },
    { id: "5", name: "الثالثة صيف", time: "9:00 - 3:00", type: "صيف", rest_days: "الخميس - الجمعة" }
  ]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [selectedShift, setSelectedShift] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    time: "",
    type: "صيف",
    rest_days: ""
  });

  const handleOpenDialog = (shift = null) => {
    if (shift) {
      setEditMode(true);
      setSelectedShift(shift);
      setFormData({
        name: shift.name,
        time: shift.time,
        type: shift.type,
        rest_days: shift.rest_days
      });
    } else {
      setEditMode(false);
      setSelectedShift(null);
      setFormData({
        name: "",
        time: "",
        type: "صيف",
        rest_days: ""
      });
    }
    setDialogOpen(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (editMode) {
      setShifts(shifts.map(s => s.id === selectedShift.id ? {...selectedShift, ...formData} : s));
      toast.success(language === 'ar' ? 'تم التحديث' : 'Updated');
    } else {
      const newShift = {...formData, id: Date.now().toString()};
      setShifts([...shifts, newShift]);
      toast.success(language === 'ar' ? 'تمت الإضافة' : 'Added');
    }
    setDialogOpen(false);
  };

  const handleDelete = (shiftId) => {
    setShifts(shifts.filter(s => s.id !== shiftId));
    toast.success(language === 'ar' ? 'تم الحذف' : 'Deleted');
  };

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex items-start justify-between">
        {!isReadOnly() && (
          <Button onClick={() => handleOpenDialog()} className="bg-primary">
            <Plus className="w-4 h-4 ml-2" />
            {language === 'ar' ? 'إضافة وردية جديدة' : 'Add Shift'}
          </Button>
        )}
        <div className="text-right flex-1">
          <CardTitle className="font-cairo text-xl flex items-center gap-2 justify-end">
            <Clock className="w-5 h-5" />
            {language === 'ar' ? 'إدارة الورديات وأيام الراحة' : 'Shifts & Rest Management'}
          </CardTitle>
          <CardDescription className="text-right mt-1">
            {language === 'ar' ? 'إعداد الورديات وأيام الراحة المتاحة' : 'Configure available shifts and rest days'}
          </CardDescription>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-right">الوردية</TableHead>
                <TableHead className="text-center">الوقت</TableHead>
                <TableHead className="text-center">النوع</TableHead>
                <TableHead className="text-center">أيام الراحة</TableHead>
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
                  <TableCell className="text-center">{shift.rest_days}</TableCell>
                  <TableCell className="text-center">
                    {!isReadOnly() && (
                      <div className="flex gap-2 justify-center">
                        <Button size="sm" variant="ghost" onClick={() => handleOpenDialog(shift)}>
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button size="sm" variant="ghost" className="text-destructive" onClick={() => handleDelete(shift.id)}>
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

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-cairo text-right">
              {editMode ? 'تعديل الوردية' : 'إضافة وردية جديدة'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4" dir="rtl">
            <div>
              <Label className="text-right block mb-2">اسم الوردية</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                placeholder="مثال: الأولى صيف"
                className="text-right"
                required
              />
            </div>
            <div>
              <Label className="text-right block mb-2">الوقت</Label>
              <Input
                value={formData.time}
                onChange={(e) => setFormData({...formData, time: e.target.value})}
                placeholder="مثال: 3:00 - 8:00"
                className="text-right"
                required
              />
            </div>
            <div>
              <Label className="text-right block mb-2">النوع</Label>
              <Input
                value={formData.type}
                onChange={(e) => setFormData({...formData, type: e.target.value})}
                placeholder="صيف أو شتاء"
                className="text-right"
                required
              />
            </div>
            <div>
              <Label className="text-right block mb-2">أيام الراحة</Label>
              <Input
                value={formData.rest_days}
                onChange={(e) => setFormData({...formData, rest_days: e.target.value})}
                placeholder="مثال: السبت - الأحد"
                className="text-right"
                required
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                إلغاء
              </Button>
              <Button type="submit">
                <Save className="w-4 h-4 ml-2" />
                حفظ
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
