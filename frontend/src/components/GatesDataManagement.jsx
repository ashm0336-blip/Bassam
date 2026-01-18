import { useState, useEffect } from "react";
import axios from "axios";
import { useLanguage } from "@/context/LanguageContext";
import { useAuth } from "@/context/AuthContext";
import { PLAZA_COLORS, GATE_TYPES, DIRECTIONS, CATEGORIES, CLASSIFICATIONS, GATE_STATUSES, CURRENT_INDICATORS } from "@/constants/gateData";
import { 
  Plus,
  Edit,
  Trash2,
  Loader2
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function GatesDataManagement() {
  const { language } = useLanguage();
  const { isReadOnly } = useAuth();
  const [gates, setGates] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [selectedGate, setSelectedGate] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  
  const [formData, setFormData] = useState({
    name: "",
    number: "",
    plaza: "الساحة الشرقية",
    gate_type: "رئيسي",
    direction: "دخول",
    category: [],
    classification: "عام",
    status: "مفتوح",
    current_indicator: "خفيف",
    current_flow: 0,
    max_flow: 5000
  });

  useEffect(() => {
    fetchGates();
    fetchEmployees();
  }, []);

  const fetchEmployees = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(`${API}/employees?department=gates`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setEmployees(response.data);
    } catch (error) {
      console.error("Error fetching employees:", error);
    }
  };

  const fetchGates = async () => {
    try {
      const response = await axios.get(`${API}/gates`);
      setGates(response.data);
    } catch (error) {
      console.error("Error fetching gates:", error);
    } finally {
      setLoading(false);
    }
  };

  const getEmployeesAtGate = (gateName) => {
    return employees.filter(emp => emp.location === gateName && emp.is_active);
  };

  const handleOpenDialog = (gate = null) => {
    if (gate) {
      setEditMode(true);
      setSelectedGate(gate);
      setFormData({
        name: gate.name,
        number: gate.number,
        plaza: gate.plaza,
        gate_type: gate.gate_type,
        direction: gate.direction,
        category: Array.isArray(gate.category) ? gate.category : [gate.category],
        classification: gate.classification,
        status: gate.status,
        current_indicator: gate.current_indicator,
        current_flow: gate.current_flow,
        max_flow: gate.max_flow
      });
    } else {
      setEditMode(false);
      setSelectedGate(null);
      setFormData({
        name: "",
        number: "",
        plaza: "الساحة الشرقية",
        gate_type: "رئيسي",
        direction: "دخول",
        category: [],
        classification: "عام",
        status: "مفتوح",
        current_indicator: "خفيف",
        current_flow: 0,
        max_flow: 5000
      });
    }
    setDialogOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const token = localStorage.getItem("token");
      const payload = {
        ...formData,
        number: parseInt(formData.number),
        current_flow: parseInt(formData.current_flow),
        max_flow: parseInt(formData.max_flow),
        plaza_color: PLAZA_COLORS[formData.plaza]
      };

      if (editMode) {
        await axios.put(`${API}/admin/gates/${selectedGate.id}`, payload, {
          headers: { Authorization: `Bearer ${token}` }
        });
        toast.success(language === 'ar' ? "تم تحديث الباب بنجاح" : "Gate updated successfully");
      } else {
        await axios.post(`${API}/admin/gates`, payload, {
          headers: { Authorization: `Bearer ${token}` }
        });
        toast.success(language === 'ar' ? "تم إضافة الباب بنجاح" : "Gate added successfully");
      }

      setDialogOpen(false);
      fetchGates();
    } catch (error) {
      console.error("Error saving gate:", error);
      toast.error(error.response?.data?.detail || (language === 'ar' ? "حدث خطأ" : "Error occurred"));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedGate) return;
    
    setSubmitting(true);
    try {
      const token = localStorage.getItem("token");
      await axios.delete(`${API}/admin/gates/${selectedGate.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success(language === 'ar' ? "تم حذف الباب بنجاح" : "Gate deleted successfully");
      setDeleteDialogOpen(false);
      fetchGates();
    } catch (error) {
      toast.error(error.response?.data?.detail || (language === 'ar' ? "حدث خطأ" : "Error occurred"));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center min-h-[400px]"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="text-right flex-1">
          <h2 className="font-cairo font-bold text-xl text-right">
            {language === 'ar' ? 'إدارة الأبواب' : 'Gates Management'}
          </h2>
          <p className="text-sm text-muted-foreground mt-1 text-right">
            {language === 'ar' ? 'إضافة وتعديل بيانات الأبواب' : 'Add and edit gates data'}
          </p>
        </div>
        {!isReadOnly() && (
          <Button onClick={() => handleOpenDialog()} className="bg-primary hover:bg-primary/90">
            <Plus className="w-4 h-4 ml-2" />
            {language === 'ar' ? 'إضافة باب جديد' : 'Add New Gate'}
          </Button>
        )}
      </div>

      {/* Gates Table */}
      <Card>
        <CardHeader>
          <CardTitle className="font-cairo text-right">{language === 'ar' ? 'قائمة الأبواب' : 'Gates List'}</CardTitle>
          <CardDescription className="text-right">{language === 'ar' ? `إجمالي ${gates.length} باب` : `Total ${gates.length} gates`}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-right">{language === 'ar' ? 'رقم الباب' : 'Number'}</TableHead>
                  <TableHead className="text-right">{language === 'ar' ? 'اسم الباب' : 'Name'}</TableHead>
                  <TableHead className="text-center">{language === 'ar' ? 'المنطقة' : 'Plaza'}</TableHead>
                  <TableHead className="text-center">{language === 'ar' ? 'النوع' : 'Type'}</TableHead>
                  <TableHead className="text-center">{language === 'ar' ? 'المسار' : 'Direction'}</TableHead>
                  <TableHead className="text-center">{language === 'ar' ? 'الفئة' : 'Category'}</TableHead>
                  <TableHead className="text-center">{language === 'ar' ? 'التصنيف' : 'Classification'}</TableHead>
                  <TableHead className="text-center">{language === 'ar' ? 'الحالة' : 'Status'}</TableHead>
                  <TableHead className="text-center">{language === 'ar' ? 'المؤشر' : 'Indicator'}</TableHead>
                  <TableHead className="text-center">{language === 'ar' ? 'الموظفين' : 'Staff'}</TableHead>
                  <TableHead className="text-center">{language === 'ar' ? 'الإجراءات' : 'Actions'}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {gates.map((gate) => {
                  const gateEmployees = getEmployeesAtGate(gate.name);
                  
                  return (
                    <TableRow key={gate.id}>
                      <TableCell className="text-right font-bold">{gate.number}</TableCell>
                      <TableCell className="text-right font-medium">{gate.name}</TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center gap-2 justify-center">
                          <div className="w-4 h-4 rounded-full" style={{ backgroundColor: gate.plaza_color || PLAZA_COLORS[gate.plaza] }} />
                          <span className="text-sm">{gate.plaza}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center text-sm">{gate.gate_type}</TableCell>
                      <TableCell className="text-center text-sm">{gate.direction}</TableCell>
                      <TableCell className="text-center text-sm">{Array.isArray(gate.category) ? gate.category.join(' + ') : gate.category}</TableCell>
                      <TableCell className="text-center text-sm">{gate.classification}</TableCell>
                      <TableCell className="text-center">
                        <Badge variant={gate.status === 'مفتوح' ? 'default' : 'destructive'}>
                          {gate.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        {gate.current_indicator && (
                          <div className="flex items-center gap-2 justify-center">
                            <div 
                              className="w-3 h-3 rounded-full" 
                              style={{ 
                                backgroundColor: 
                                  gate.current_indicator === 'خفيف' ? '#22c55e' :
                                  gate.current_indicator === 'متوسط' ? '#f97316' :
                                  gate.current_indicator === 'مزدحم' ? '#ef4444' : '#gray'
                              }}
                            />
                            <span className="text-sm">{gate.current_indicator}</span>
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex flex-col gap-1">
                          <Badge 
                            variant={
                              gateEmployees.length === 0 ? "destructive" :
                              gateEmployees.length <= 2 ? "secondary" :
                              "default"
                            }
                            className="text-xs"
                          >
                            {gateEmployees.length === 0 ? '⚠️ ' : ''}{gateEmployees.length} {language === 'ar' ? 'موظف' : 'staff'}
                          </Badge>
                          {gateEmployees.length > 0 && (
                            <div className="text-xs text-muted-foreground">
                              {gateEmployees.slice(0, 2).map(emp => emp.name.split(' ')[0]).join(', ')}
                              {gateEmployees.length > 2 && ` +${gateEmployees.length - 2}`}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        {!isReadOnly() ? (
                          <div className="flex gap-2 justify-center">
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => { setSelectedGate(gate); setDeleteDialogOpen(true); }}>
                              <Trash2 className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleOpenDialog(gate)}>
                              <Edit className="w-4 h-4" />
                            </Button>
                          </div>
                        ) : (
                          <Badge variant="secondary" className="text-xs">
                            {language === 'ar' ? 'قراءة فقط' : 'Read Only'}
                          </Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-cairo">{editMode ? (language === 'ar' ? 'تعديل الباب' : 'Edit Gate') : (language === 'ar' ? 'إضافة باب جديد' : 'Add New Gate')}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div><Label>{language === 'ar' ? 'رقم الباب' : 'Number'}</Label><Input type="number" value={formData.number} onChange={(e) => setFormData({...formData, number: e.target.value})} required className="mt-1" /></div>
                <div><Label>{language === 'ar' ? 'اسم الباب' : 'Name'}</Label><Input value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} required className="mt-1" /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>{language === 'ar' ? 'المنطقة' : 'Plaza'}</Label>
                  <Select value={formData.plaza} onValueChange={(value) => setFormData({...formData, plaza: value})}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent position="popper">{Object.keys(PLAZA_COLORS).map(plaza => (<SelectItem key={plaza} value={plaza}><div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full" style={{ backgroundColor: PLAZA_COLORS[plaza] }} />{plaza}</div></SelectItem>))}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>{language === 'ar' ? 'النوع' : 'Type'}</Label>
                  <Select value={formData.gate_type} onValueChange={(value) => setFormData({...formData, gate_type: value})}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent position="popper">{GATE_TYPES.map(type => (<SelectItem key={type} value={type}>{type}</SelectItem>))}</SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>{language === 'ar' ? 'المسار' : 'Direction'}</Label>
                  <Select value={formData.direction} onValueChange={(value) => setFormData({...formData, direction: value})}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent position="popper">{DIRECTIONS.map(dir => (<SelectItem key={dir} value={dir}>{dir}</SelectItem>))}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>{language === 'ar' ? 'التصنيف' : 'Classification'}</Label>
                  <Select value={formData.classification} onValueChange={(value) => setFormData({...formData, classification: value})}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent position="popper">{CLASSIFICATIONS.map(cls => (<SelectItem key={cls} value={cls}>{cls}</SelectItem>))}</SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label>{language === 'ar' ? 'الفئة (يمكن اختيار أكثر من فئة)' : 'Category'}</Label>
                <div className="mt-2 flex flex-wrap gap-2">{CATEGORIES.map(cat => {const isSelected = Array.isArray(formData.category) && formData.category.includes(cat);return (<Button key={cat} type="button" variant={isSelected ? "default" : "outline"} size="sm" onClick={() => {const current = Array.isArray(formData.category) ? formData.category : [];if (isSelected) {setFormData({...formData, category: current.filter(c => c !== cat)});} else {setFormData({...formData, category: [...current, cat]});}}}>{cat}</Button>);})}</div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>{language === 'ar' ? 'الحالة' : 'Status'}</Label>
                  <Select value={formData.status} onValueChange={(value) => setFormData({...formData, status: value})}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent position="popper">{GATE_STATUSES.map(status => (<SelectItem key={status} value={status}>{status}</SelectItem>))}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>{language === 'ar' ? 'المؤشر (الازدحام)' : 'Indicator'}</Label>
                  <div className="mt-2 flex gap-2">{CURRENT_INDICATORS.map(ind => {const isSelected = formData.current_indicator === ind.value;return (<Button key={ind.value} type="button" variant={isSelected ? "default" : "outline"} size="sm" onClick={() => setFormData({...formData, current_indicator: ind.value})} style={isSelected ? { backgroundColor: ind.color, borderColor: ind.color } : {}}><div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full" style={{ backgroundColor: ind.color }} />{ind.label}</div></Button>);})}</div>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>{language === 'ar' ? 'إلغاء' : 'Cancel'}</Button>
              <Button type="submit" disabled={submitting}>{submitting && <Loader2 className="w-4 h-4 animate-spin ml-2" />}{editMode ? (language === 'ar' ? 'تحديث' : 'Update') : (language === 'ar' ? 'إضافة' : 'Add')}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-cairo">{language === 'ar' ? 'تأكيد الحذف' : 'Confirm Delete'}</DialogTitle>
            <DialogDescription>{language === 'ar' ? `هل أنت متأكد من حذف "${selectedGate?.name}"؟` : `Delete "${selectedGate?.name}"?`}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>{language === 'ar' ? 'إلغاء' : 'Cancel'}</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={submitting}>{submitting && <Loader2 className="w-4 h-4 animate-spin ml-2" />}{language === 'ar' ? 'حذف' : 'Delete'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
