import { useState, useEffect } from "react";
import axios from "axios";
import { useLanguage } from "@/context/LanguageContext";
import { PLAZA_COLORS, GATE_TYPES, DIRECTIONS, CATEGORIES, CLASSIFICATIONS, GATE_STATUSES, CURRENT_INDICATORS } from "@/constants/gateData";
import { 
  Plus,
  Edit,
  Trash2,
  DoorOpen,
  LayoutGrid,
  Circle,
  Loader2,
  Search
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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

export default function DataManagement() {
  const { language } = useLanguage();
  const [activeTab, setActiveTab] = useState("gates");
  
  // Gates state
  const [gates, setGates] = useState([]);
  const [gatesLoading, setGatesLoading] = useState(true);
  const [gateDialogOpen, setGateDialogOpen] = useState(false);
  const [editingGate, setEditingGate] = useState(null);
  const [gateForm, setGateForm] = useState({
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
  
  // Plazas state
  const [plazas, setPlazas] = useState([]);
  const [plazasLoading, setPlazasLoading] = useState(true);
  const [plazaDialogOpen, setPlazaDialogOpen] = useState(false);
  const [editingPlaza, setEditingPlaza] = useState(null);
  const [plazaForm, setPlazaForm] = useState({
    name: "",
    zone: "north",
    current_crowd: 0,
    max_capacity: 40000
  });
  
  // Mataf state
  const [matafLevels, setMatafLevels] = useState([]);
  const [matafLoading, setMatafLoading] = useState(true);
  const [matafDialogOpen, setMatafDialogOpen] = useState(false);
  const [editingMataf, setEditingMataf] = useState(null);
  const [matafForm, setMatafForm] = useState({
    level: "",
    current_crowd: 0,
    max_capacity: 50000,
    average_tawaf_time: 45
  });

  const [submitting, setSubmitting] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState({ open: false, type: null, item: null });

  useEffect(() => {
    fetchGates();
    fetchPlazas();
    fetchMataf();
  }, []);

  // Gates Functions
  const fetchGates = async () => {
    try {
      const response = await axios.get(`${API}/gates`);
      setGates(response.data);
    } catch (error) {
      console.error("Error fetching gates:", error);
    } finally {
      setGatesLoading(false);
    }
  };

  const handleGateSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const token = localStorage.getItem("token");
      const payload = {
        ...gateForm,
        number: parseInt(gateForm.number),
        current_flow: parseInt(gateForm.current_flow),
        max_flow: parseInt(gateForm.max_flow),
        plaza_color: PLAZA_COLORS[gateForm.plaza]
      };
      
      if (editingGate) {
        await axios.put(`${API}/admin/gates/${editingGate.id}`, payload, {
          headers: { Authorization: `Bearer ${token}` }
        });
        toast.success(language === 'ar' ? "تم تحديث الباب بنجاح" : "Gate updated successfully");
      } else {
        await axios.post(`${API}/admin/gates`, payload, {
          headers: { Authorization: `Bearer ${token}` }
        });
        toast.success(language === 'ar' ? "تم إضافة الباب بنجاح" : "Gate added successfully");
      }
      
      setGateDialogOpen(false);
      setEditingGate(null);
      fetchGates();
    } catch (error) {
      console.error("Error saving gate:", error);
      toast.error(error.response?.data?.detail || (language === 'ar' ? "حدث خطأ" : "Error occurred"));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteGate = async () => {
    setSubmitting(true);
    try {
      const token = localStorage.getItem("token");
      await axios.delete(`${API}/admin/gates/${deleteDialog.item.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success(language === 'ar' ? "تم حذف الباب بنجاح" : "Gate deleted successfully");
      setDeleteDialog({ open: false, type: null, item: null });
      fetchGates();
    } catch (error) {
      toast.error(error.response?.data?.detail || (language === 'ar' ? "حدث خطأ" : "Error occurred"));
    } finally {
      setSubmitting(false);
    }
  };

  // Plazas Functions
  const fetchPlazas = async () => {
    try {
      const response = await axios.get(`${API}/plazas`);
      setPlazas(response.data);
    } catch (error) {
      console.error("Error fetching plazas:", error);
    } finally {
      setPlazasLoading(false);
    }
  };

  const handlePlazaSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const token = localStorage.getItem("token");
      const payload = {
        ...plazaForm,
        current_crowd: parseInt(plazaForm.current_crowd),
        max_capacity: parseInt(plazaForm.max_capacity)
      };
      
      if (editingPlaza) {
        await axios.put(`${API}/admin/plazas/${editingPlaza.id}`, payload, {
          headers: { Authorization: `Bearer ${token}` }
        });
        toast.success(language === 'ar' ? "تم تحديث الساحة بنجاح" : "Plaza updated successfully");
      } else {
        await axios.post(`${API}/admin/plazas`, payload, {
          headers: { Authorization: `Bearer ${token}` }
        });
        toast.success(language === 'ar' ? "تم إضافة الساحة بنجاح" : "Plaza added successfully");
      }
      
      setPlazaDialogOpen(false);
      setEditingPlaza(null);
      fetchPlazas();
    } catch (error) {
      toast.error(error.response?.data?.detail || (language === 'ar' ? "حدث خطأ" : "Error occurred"));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeletePlaza = async () => {
    setSubmitting(true);
    try {
      const token = localStorage.getItem("token");
      await axios.delete(`${API}/admin/plazas/${deleteDialog.item.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success(language === 'ar' ? "تم حذف الساحة بنجاح" : "Plaza deleted successfully");
      setDeleteDialog({ open: false, type: null, item: null });
      fetchPlazas();
    } catch (error) {
      toast.error(error.response?.data?.detail || (language === 'ar' ? "حدث خطأ" : "Error occurred"));
    } finally {
      setSubmitting(false);
    }
  };

  // Mataf Functions
  const fetchMataf = async () => {
    try {
      const response = await axios.get(`${API}/mataf`);
      setMatafLevels(response.data);
    } catch (error) {
      console.error("Error fetching mataf:", error);
    } finally {
      setMatafLoading(false);
    }
  };

  const handleMatafSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const token = localStorage.getItem("token");
      const payload = {
        ...matafForm,
        current_crowd: parseInt(matafForm.current_crowd),
        max_capacity: parseInt(matafForm.max_capacity),
        average_tawaf_time: parseInt(matafForm.average_tawaf_time)
      };
      
      if (editingMataf) {
        await axios.put(`${API}/admin/mataf/${editingMataf.id}`, payload, {
          headers: { Authorization: `Bearer ${token}` }
        });
        toast.success(language === 'ar' ? "تم تحديث الطابق بنجاح" : "Level updated successfully");
      } else {
        await axios.post(`${API}/admin/mataf`, payload, {
          headers: { Authorization: `Bearer ${token}` }
        });
        toast.success(language === 'ar' ? "تم إضافة الطابق بنجاح" : "Level added successfully");
      }
      
      setMatafDialogOpen(false);
      setEditingMataf(null);
      fetchMataf();
    } catch (error) {
      toast.error(error.response?.data?.detail || (language === 'ar' ? "حدث خطأ" : "Error occurred"));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteMataf = async () => {
    setSubmitting(true);
    try {
      const token = localStorage.getItem("token");
      await axios.delete(`${API}/admin/mataf/${deleteDialog.item.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success(language === 'ar' ? "تم حذف الطابق بنجاح" : "Level deleted successfully");
      setDeleteDialog({ open: false, type: null, item: null });
      fetchMataf();
    } catch (error) {
      toast.error(error.response?.data?.detail || (language === 'ar' ? "حدث خطأ" : "Error occurred"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="font-cairo font-bold text-xl text-right">
          {language === 'ar' ? 'إدارة البيانات الأساسية' : 'Master Data Management'}
        </h2>
        <p className="text-sm text-muted-foreground mt-1 text-right">
          {language === 'ar' ? 'إدارة الأبواب، الساحات، وطوابق المطاف' : 'Manage gates, plazas, and mataf levels'}
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="mataf" className="gap-2">
            <Circle className="w-4 h-4" />
            {language === 'ar' ? 'المطاف' : 'Mataf'} ({matafLevels.length})
          </TabsTrigger>
          <TabsTrigger value="plazas" className="gap-2">
            <LayoutGrid className="w-4 h-4" />
            {language === 'ar' ? 'الساحات' : 'Plazas'} ({plazas.length})
          </TabsTrigger>
          <TabsTrigger value="gates" className="gap-2">
            <DoorOpen className="w-4 h-4" />
            {language === 'ar' ? 'الأبواب' : 'Gates'} ({gates.length})
          </TabsTrigger>
        </TabsList>

        {/* Gates Tab */}
        <TabsContent value="gates" className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => {
              setEditingGate(null);
              setGateForm({ name: "", number: "", status: "open", direction: "both", current_flow: 0, max_flow: 5000, location: "" });
              setGateDialogOpen(true);
            }}>
              <Plus className="w-4 h-4 ml-2" />
              {language === 'ar' ? 'إضافة باب' : 'Add Gate'}
            </Button>
          </div>
          
          <Card>
            <CardContent className="p-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-center">{language === 'ar' ? 'المؤشر' : 'Indicator'}</TableHead>
                    <TableHead className="text-center">{language === 'ar' ? 'الحالة' : 'Status'}</TableHead>
                    <TableHead className="text-center">{language === 'ar' ? 'التصنيف' : 'Classification'}</TableHead>
                    <TableHead className="text-center">{language === 'ar' ? 'الفئة' : 'Category'}</TableHead>
                    <TableHead className="text-center">{language === 'ar' ? 'المسار' : 'Direction'}</TableHead>
                    <TableHead className="text-center">{language === 'ar' ? 'النوع' : 'Type'}</TableHead>
                    <TableHead className="text-center">{language === 'ar' ? 'المنطقة' : 'Plaza'}</TableHead>
                    <TableHead className="text-center">{language === 'ar' ? 'اسم الباب' : 'Name'}</TableHead>
                    <TableHead className="text-center">{language === 'ar' ? 'رقم الباب' : 'Number'}</TableHead>
                    <TableHead className="text-center">{language === 'ar' ? 'الإجراءات' : 'Actions'}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {gates.map((gate) => (
                    <TableRow key={gate.id}>
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
                        <Badge variant={gate.status === 'مفتوح' ? 'default' : 'destructive'}>
                          {gate.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className="text-sm">{gate.classification}</span>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className="text-sm">{Array.isArray(gate.category) ? gate.category.join(' + ') : gate.category}</span>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className="text-sm">{gate.direction}</span>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className="text-sm">{gate.gate_type}</span>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center gap-2 justify-center">
                          <div 
                            className="w-4 h-4 rounded-full" 
                            style={{ backgroundColor: PLAZA_COLORS[gate.plaza] || '#94a3b8' }}
                          />
                          <span className="text-sm">{gate.plaza}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center font-medium">{gate.name}</TableCell>
                      <TableCell className="text-center font-bold">{gate.number}</TableCell>
                      <TableCell className="text-center">
                        <div className="flex gap-2 justify-center">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive"
                            onClick={() => setDeleteDialog({ open: true, type: 'gate', item: gate })}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => {
                              setEditingGate(gate);
                              setGateForm({
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
                              setGateDialogOpen(true);
                            }}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Plazas Tab */}
        <TabsContent value="plazas" className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => {
              setEditingPlaza(null);
              setPlazaForm({ name: "", zone: "north", current_crowd: 0, max_capacity: 40000 });
              setPlazaDialogOpen(true);
            }}>
              <Plus className="w-4 h-4 ml-2" />
              {language === 'ar' ? 'إضافة ساحة' : 'Add Plaza'}
            </Button>
          </div>
          
          <Card>
            <CardContent className="p-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-center">{language === 'ar' ? 'الإجراءات' : 'Actions'}</TableHead>
                    <TableHead className="text-center">{language === 'ar' ? 'الطاقة القصوى' : 'Max Capacity'}</TableHead>
                    <TableHead className="text-center">{language === 'ar' ? 'الحشود الحالية' : 'Current Crowd'}</TableHead>
                    <TableHead className="text-center">{language === 'ar' ? 'المنطقة' : 'Zone'}</TableHead>
                    <TableHead className="text-center">{language === 'ar' ? 'الاسم' : 'Name'}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {plazas.map((plaza) => (
                    <TableRow key={plaza.id}>
                      <TableCell className="text-center">
                        <div className="flex gap-2 justify-center">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive"
                            onClick={() => setDeleteDialog({ open: true, type: 'plaza', item: plaza })}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => {
                              setEditingPlaza(plaza);
                              setPlazaForm({
                                name: plaza.name,
                                zone: plaza.zone,
                                current_crowd: plaza.current_crowd,
                                max_capacity: plaza.max_capacity
                              });
                              setPlazaDialogOpen(true);
                            }}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">{plaza.max_capacity?.toLocaleString('ar-SA')}</TableCell>
                      <TableCell className="text-center">{plaza.current_crowd?.toLocaleString('ar-SA')}</TableCell>
                      <TableCell className="text-sm text-center">{plaza.zone}</TableCell>
                      <TableCell className="font-medium text-center">{plaza.name}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Mataf Tab */}
        <TabsContent value="mataf" className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => {
              setEditingMataf(null);
              setMatafForm({ level: "", current_crowd: 0, max_capacity: 50000, average_tawaf_time: 45 });
              setMatafDialogOpen(true);
            }}>
              <Plus className="w-4 h-4 ml-2" />
              {language === 'ar' ? 'إضافة طابق' : 'Add Level'}
            </Button>
          </div>
          
          <Card>
            <CardContent className="p-4">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-center">{language === 'ar' ? 'الإجراءات' : 'Actions'}</TableHead>
                      <TableHead className="text-center">{language === 'ar' ? 'متوسط الطواف' : 'Avg. Tawaf Time'}</TableHead>
                      <TableHead className="text-center">{language === 'ar' ? 'الطاقة القصوى' : 'Max Capacity'}</TableHead>
                      <TableHead className="text-center">{language === 'ar' ? 'الحشود الحالية' : 'Current Crowd'}</TableHead>
                      <TableHead className="text-center">{language === 'ar' ? 'الطابق' : 'Level'}</TableHead>
                    </TableRow>
                  </TableHeader>
                <TableBody>
                  {matafLevels.map((level) => (
                    <TableRow key={level.id}>
                      <TableCell className="text-center">
                        <div className="flex gap-2 justify-center">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive"
                            onClick={() => setDeleteDialog({ open: true, type: 'mataf', item: level })}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => {
                              setEditingMataf(level);
                              setMatafForm({
                                level: level.level,
                                current_crowd: level.current_crowd,
                                max_capacity: level.max_capacity,
                                average_tawaf_time: level.average_tawaf_time
                              });
                              setMatafDialogOpen(true);
                            }}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">{level.average_tawaf_time} {language === 'ar' ? 'دقيقة' : 'min'}</TableCell>
                      <TableCell className="text-center">{level.max_capacity?.toLocaleString('ar-SA')}</TableCell>
                      <TableCell className="text-center">{level.current_crowd?.toLocaleString('ar-SA')}</TableCell>
                      <TableCell className="font-medium text-center">{level.level}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Gate Dialog */}
      <Dialog open={gateDialogOpen} onOpenChange={setGateDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="font-cairo">
              {editingGate ? (language === 'ar' ? 'تعديل الباب' : 'Edit Gate') : (language === 'ar' ? 'إضافة باب جديد' : 'Add New Gate')}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleGateSubmit}>
            <div className="space-y-4 py-4 max-h-[500px] overflow-y-auto">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>{language === 'ar' ? 'رقم الباب' : 'Gate Number'}</Label>
                  <Input
                    type="number" inputMode="numeric"
                    value={gateForm.number}
                    onChange={(e) => setGateForm({...gateForm, number: e.target.value})}
                    required
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>{language === 'ar' ? 'اسم الباب' : 'Gate Name'}</Label>
                  <Input
                    value={gateForm.name}
                    onChange={(e) => setGateForm({...gateForm, name: e.target.value})}
                    required
                    className="mt-1"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>{language === 'ar' ? 'المنطقة (الساحة)' : 'Plaza'}</Label>
                  <Select value={gateForm.plaza} onValueChange={(value) => setGateForm({...gateForm, plaza: value})}>
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent position="popper">
                      {Object.keys(PLAZA_COLORS).map(plaza => (
                        <SelectItem key={plaza} value={plaza}>
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: PLAZA_COLORS[plaza] }} />
                            {plaza}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>{language === 'ar' ? 'النوع' : 'Type'}</Label>
                  <Select value={gateForm.gate_type} onValueChange={(value) => setGateForm({...gateForm, gate_type: value})}>
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent position="popper">
                      {GATE_TYPES.map(type => (
                        <SelectItem key={type} value={type}>{type}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>{language === 'ar' ? 'المسار' : 'Direction'}</Label>
                  <Select value={gateForm.direction} onValueChange={(value) => setGateForm({...gateForm, direction: value})}>
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent position="popper">
                      {DIRECTIONS.map(dir => (
                        <SelectItem key={dir} value={dir}>{dir}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>{language === 'ar' ? 'التصنيف' : 'Classification'}</Label>
                  <Select value={gateForm.classification} onValueChange={(value) => setGateForm({...gateForm, classification: value})}>
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent position="popper">
                      {CLASSIFICATIONS.map(cls => (
                        <SelectItem key={cls} value={cls}>{cls}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div>
                <Label>{language === 'ar' ? 'الفئة (يمكن اختيار أكثر من فئة)' : 'Category (multiple)'}</Label>
                <div className="mt-2 flex flex-wrap gap-2">
                  {CATEGORIES.map(cat => {
                    const isSelected = Array.isArray(gateForm.category) && gateForm.category.includes(cat);
                    return (
                      <Button
                        key={cat}
                        type="button"
                        variant={isSelected ? "default" : "outline"}
                        size="sm"
                        onClick={() => {
                          const currentCategories = Array.isArray(gateForm.category) ? gateForm.category : [];
                          if (isSelected) {
                            setGateForm({...gateForm, category: currentCategories.filter(c => c !== cat)});
                          } else {
                            setGateForm({...gateForm, category: [...currentCategories, cat]});
                          }
                        }}
                      >
                        {cat}
                      </Button>
                    );
                  })}
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>{language === 'ar' ? 'الحالة' : 'Status'}</Label>
                  <Select value={gateForm.status} onValueChange={(value) => setGateForm({...gateForm, status: value})}>
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent position="popper">
                      {GATE_STATUSES.map(status => (
                        <SelectItem key={status} value={status}>{status}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>{language === 'ar' ? 'المؤشر الحالي (حسب الازدحام)' : 'Current Indicator'}</Label>
                  <div className="mt-2 flex gap-2">
                    {CURRENT_INDICATORS.map(ind => {
                      const isSelected = gateForm.current_indicator === ind.value;
                      return (
                        <Button
                          key={ind.value}
                          type="button"
                          variant={isSelected ? "default" : "outline"}
                          size="sm"
                          onClick={() => setGateForm({...gateForm, current_indicator: ind.value})}
                          className={isSelected ? "" : ""}
                          style={isSelected ? { backgroundColor: ind.color, borderColor: ind.color } : {}}
                        >
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: ind.color }} />
                            {ind.label}
                          </div>
                        </Button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setGateDialogOpen(false)}>
                {language === 'ar' ? 'إلغاء' : 'Cancel'}
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting && <Loader2 className="w-4 h-4 animate-spin ml-2" />}
                {editingGate ? (language === 'ar' ? 'تحديث' : 'Update') : (language === 'ar' ? 'إضافة' : 'Add')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Plaza Dialog */}
      <Dialog open={plazaDialogOpen} onOpenChange={setPlazaDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="font-cairo">
              {editingPlaza ? (language === 'ar' ? 'تعديل الساحة' : 'Edit Plaza') : (language === 'ar' ? 'إضافة ساحة جديدة' : 'Add New Plaza')}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handlePlazaSubmit}>
            <div className="space-y-4 py-4">
              <div>
                <Label>{language === 'ar' ? 'الاسم' : 'Name'}</Label>
                <Input
                  value={plazaForm.name}
                  onChange={(e) => setPlazaForm({...plazaForm, name: e.target.value})}
                  required
                  className="mt-1"
                />
              </div>
              
              <div>
                <Label>{language === 'ar' ? 'المنطقة' : 'Zone'}</Label>
                <Select value={plazaForm.zone} onValueChange={(value) => setPlazaForm({...plazaForm, zone: value})}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent position="popper">
                    <SelectItem value="north">{language === 'ar' ? 'شمال' : 'North'}</SelectItem>
                    <SelectItem value="south">{language === 'ar' ? 'جنوب' : 'South'}</SelectItem>
                    <SelectItem value="east">{language === 'ar' ? 'شرق' : 'East'}</SelectItem>
                    <SelectItem value="west">{language === 'ar' ? 'غرب' : 'West'}</SelectItem>
                    <SelectItem value="masa">{language === 'ar' ? 'المسعى' : 'Masa'}</SelectItem>
                    <SelectItem value="ajyad">{language === 'ar' ? 'أجياد' : 'Ajyad'}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>{language === 'ar' ? 'الحشود الحالية' : 'Current Crowd'}</Label>
                  <Input
                    type="number" inputMode="numeric"
                    value={plazaForm.current_crowd}
                    onChange={(e) => setPlazaForm({...plazaForm, current_crowd: e.target.value})}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>{language === 'ar' ? 'الطاقة القصوى' : 'Max Capacity'}</Label>
                  <Input
                    type="number" inputMode="numeric"
                    value={plazaForm.max_capacity}
                    onChange={(e) => setPlazaForm({...plazaForm, max_capacity: e.target.value})}
                    className="mt-1"
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setPlazaDialogOpen(false)}>
                {language === 'ar' ? 'إلغاء' : 'Cancel'}
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting && <Loader2 className="w-4 h-4 animate-spin ml-2" />}
                {editingPlaza ? (language === 'ar' ? 'تحديث' : 'Update') : (language === 'ar' ? 'إضافة' : 'Add')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Mataf Dialog */}
      <Dialog open={matafDialogOpen} onOpenChange={setMatafDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="font-cairo">
              {editingMataf ? (language === 'ar' ? 'تعديل الطابق' : 'Edit Level') : (language === 'ar' ? 'إضافة طابق جديد' : 'Add New Level')}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleMatafSubmit}>
            <div className="space-y-4 py-4">
              <div>
                <Label>{language === 'ar' ? 'الطابق' : 'Level'}</Label>
                <Input
                  value={matafForm.level}
                  onChange={(e) => setMatafForm({...matafForm, level: e.target.value})}
                  required
                  placeholder={language === 'ar' ? 'مثال: الطابق الأرضي' : 'e.g., Ground Floor'}
                  className="mt-1"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>{language === 'ar' ? 'الحشود الحالية' : 'Current Crowd'}</Label>
                  <Input
                    type="number" inputMode="numeric"
                    value={matafForm.current_crowd}
                    onChange={(e) => setMatafForm({...matafForm, current_crowd: e.target.value})}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>{language === 'ar' ? 'الطاقة القصوى' : 'Max Capacity'}</Label>
                  <Input
                    type="number" inputMode="numeric"
                    value={matafForm.max_capacity}
                    onChange={(e) => setMatafForm({...matafForm, max_capacity: e.target.value})}
                    className="mt-1"
                  />
                </div>
              </div>
              
              <div>
                <Label>{language === 'ar' ? 'متوسط وقت الطواف (بالدقائق)' : 'Average Tawaf Time (minutes)'}</Label>
                <Input
                  type="number" inputMode="numeric"
                  value={matafForm.average_tawaf_time}
                  onChange={(e) => setMatafForm({...matafForm, average_tawaf_time: e.target.value})}
                  className="mt-1"
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setMatafDialogOpen(false)}>
                {language === 'ar' ? 'إلغاء' : 'Cancel'}
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting && <Loader2 className="w-4 h-4 animate-spin ml-2" />}
                {editingMataf ? (language === 'ar' ? 'تحديث' : 'Update') : (language === 'ar' ? 'إضافة' : 'Add')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialog.open} onOpenChange={(open) => setDeleteDialog({ ...deleteDialog, open })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-cairo">
              {language === 'ar' ? 'تأكيد الحذف' : 'Confirm Delete'}
            </DialogTitle>
            <DialogDescription>
              {language === 'ar' 
                ? `هل أنت متأكد من حذف ${deleteDialog.type === 'gate' ? 'الباب' : deleteDialog.type === 'plaza' ? 'الساحة' : 'الطابق'} "${deleteDialog.item?.name || deleteDialog.item?.level}"؟`
                : `Are you sure you want to delete this ${deleteDialog.type}?`
              }
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialog({ open: false, type: null, item: null })}>
              {language === 'ar' ? 'إلغاء' : 'Cancel'}
            </Button>
            <Button 
              variant="destructive" 
              onClick={() => {
                if (deleteDialog.type === 'gate') handleDeleteGate();
                else if (deleteDialog.type === 'plaza') handleDeletePlaza();
                else if (deleteDialog.type === 'mataf') handleDeleteMataf();
              }}
              disabled={submitting}
            >
              {submitting && <Loader2 className="w-4 h-4 animate-spin ml-2" />}
              {language === 'ar' ? 'حذف' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
