import { useState, useEffect } from "react";
import axios from "axios";
import { useLanguage } from "@/context/LanguageContext";
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
    status: "open",
    direction: "both",
    current_flow: 0,
    max_flow: 5000,
    location: ""
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
        max_flow: parseInt(gateForm.max_flow)
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
        <h2 className="font-cairo font-bold text-xl">
          {language === 'ar' ? 'إدارة البيانات الأساسية' : 'Master Data Management'}
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          {language === 'ar' ? 'إدارة الأبواب، الساحات، وطوابق المطاف' : 'Manage gates, plazas, and mataf levels'}
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="gates" className="gap-2">
            <DoorOpen className="w-4 h-4" />
            {language === 'ar' ? 'الأبواب' : 'Gates'} ({gates.length})
          </TabsTrigger>
          <TabsTrigger value="plazas" className="gap-2">
            <LayoutGrid className="w-4 h-4" />
            {language === 'ar' ? 'الساحات' : 'Plazas'} ({plazas.length})
          </TabsTrigger>
          <TabsTrigger value="mataf" className="gap-2">
            <Circle className="w-4 h-4" />
            {language === 'ar' ? 'المطاف' : 'Mataf'} ({matafLevels.length})
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
                    <TableHead>{language === 'ar' ? 'رقم الباب' : 'Number'}</TableHead>
                    <TableHead>{language === 'ar' ? 'الاسم' : 'Name'}</TableHead>
                    <TableHead>{language === 'ar' ? 'الحالة' : 'Status'}</TableHead>
                    <TableHead>{language === 'ar' ? 'الاتجاه' : 'Direction'}</TableHead>
                    <TableHead>{language === 'ar' ? 'الموقع' : 'Location'}</TableHead>
                    <TableHead className="text-left">{language === 'ar' ? 'الإجراءات' : 'Actions'}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {gates.map((gate) => (
                    <TableRow key={gate.id}>
                      <TableCell className="font-bold">{gate.number}</TableCell>
                      <TableCell>{gate.name}</TableCell>
                      <TableCell>
                        <Badge variant={gate.status === 'open' ? 'default' : gate.status === 'closed' ? 'destructive' : 'secondary'}>
                          {language === 'ar' ? (gate.status === 'open' ? 'مفتوح' : gate.status === 'closed' ? 'مغلق' : 'صيانة') : gate.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">
                        {language === 'ar' ? (gate.direction === 'entry' ? 'دخول' : gate.direction === 'exit' ? 'خروج' : 'دخول/خروج') : gate.direction}
                      </TableCell>
                      <TableCell className="text-sm">{gate.location}</TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => {
                              setEditingGate(gate);
                              setGateForm({
                                name: gate.name,
                                number: gate.number,
                                status: gate.status,
                                direction: gate.direction,
                                current_flow: gate.current_flow,
                                max_flow: gate.max_flow,
                                location: gate.location
                              });
                              setGateDialogOpen(true);
                            }}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive"
                            onClick={() => setDeleteDialog({ open: true, type: 'gate', item: gate })}
                          >
                            <Trash2 className="w-4 h-4" />
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
                    <TableHead>{language === 'ar' ? 'الاسم' : 'Name'}</TableHead>
                    <TableHead>{language === 'ar' ? 'المنطقة' : 'Zone'}</TableHead>
                    <TableHead>{language === 'ar' ? 'الحشود الحالية' : 'Current Crowd'}</TableHead>
                    <TableHead>{language === 'ar' ? 'الطاقة القصوى' : 'Max Capacity'}</TableHead>
                    <TableHead className="text-left">{language === 'ar' ? 'الإجراءات' : 'Actions'}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {plazas.map((plaza) => (
                    <TableRow key={plaza.id}>
                      <TableCell className="font-medium">{plaza.name}</TableCell>
                      <TableCell className="text-sm">{plaza.zone}</TableCell>
                      <TableCell>{plaza.current_crowd?.toLocaleString('ar-SA')}</TableCell>
                      <TableCell>{plaza.max_capacity?.toLocaleString('ar-SA')}</TableCell>
                      <TableCell>
                        <div className="flex gap-2">
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
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive"
                            onClick={() => setDeleteDialog({ open: true, type: 'plaza', item: plaza })}
                          >
                            <Trash2 className="w-4 h-4" />
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
                    <TableHead>{language === 'ar' ? 'الطابق' : 'Level'}</TableHead>
                    <TableHead>{language === 'ar' ? 'الحشود الحالية' : 'Current Crowd'}</TableHead>
                    <TableHead>{language === 'ar' ? 'الطاقة القصوى' : 'Max Capacity'}</TableHead>
                    <TableHead>{language === 'ar' ? 'متوسط الطواف' : 'Avg. Tawaf Time'}</TableHead>
                    <TableHead className="text-left">{language === 'ar' ? 'الإجراءات' : 'Actions'}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {matafLevels.map((level) => (
                    <TableRow key={level.id}>
                      <TableCell className="font-medium">{level.level}</TableCell>
                      <TableCell>{level.current_crowd?.toLocaleString('ar-SA')}</TableCell>
                      <TableCell>{level.max_capacity?.toLocaleString('ar-SA')}</TableCell>
                      <TableCell>{level.average_tawaf_time} {language === 'ar' ? 'دقيقة' : 'min'}</TableCell>
                      <TableCell>
                        <div className="flex gap-2">
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
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive"
                            onClick={() => setDeleteDialog({ open: true, type: 'mataf', item: level })}
                          >
                            <Trash2 className="w-4 h-4" />
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
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>{language === 'ar' ? 'رقم الباب' : 'Gate Number'}</Label>
                  <Input
                    type="number"
                    value={gateForm.number}
                    onChange={(e) => setGateForm({...gateForm, number: e.target.value})}
                    required
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>{language === 'ar' ? 'الاسم' : 'Name'}</Label>
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
                  <Label>{language === 'ar' ? 'الحالة' : 'Status'}</Label>
                  <Select value={gateForm.status} onValueChange={(value) => setGateForm({...gateForm, status: value})}>
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent position="popper">
                      <SelectItem value="open">{language === 'ar' ? 'مفتوح' : 'Open'}</SelectItem>
                      <SelectItem value="closed">{language === 'ar' ? 'مغلق' : 'Closed'}</SelectItem>
                      <SelectItem value="maintenance">{language === 'ar' ? 'صيانة' : 'Maintenance'}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>{language === 'ar' ? 'الاتجاه' : 'Direction'}</Label>
                  <Select value={gateForm.direction} onValueChange={(value) => setGateForm({...gateForm, direction: value})}>
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent position="popper">
                      <SelectItem value="entry">{language === 'ar' ? 'دخول' : 'Entry'}</SelectItem>
                      <SelectItem value="exit">{language === 'ar' ? 'خروج' : 'Exit'}</SelectItem>
                      <SelectItem value="both">{language === 'ar' ? 'دخول/خروج' : 'Both'}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div>
                <Label>{language === 'ar' ? 'الموقع' : 'Location'}</Label>
                <Input
                  value={gateForm.location}
                  onChange={(e) => setGateForm({...gateForm, location: e.target.value})}
                  required
                  className="mt-1"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>{language === 'ar' ? 'التدفق الحالي' : 'Current Flow'}</Label>
                  <Input
                    type="number"
                    value={gateForm.current_flow}
                    onChange={(e) => setGateForm({...gateForm, current_flow: e.target.value})}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>{language === 'ar' ? 'الطاقة القصوى' : 'Max Flow'}</Label>
                  <Input
                    type="number"
                    value={gateForm.max_flow}
                    onChange={(e) => setGateForm({...gateForm, max_flow: e.target.value})}
                    className="mt-1"
                  />
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
                    type="number"
                    value={plazaForm.current_crowd}
                    onChange={(e) => setPlazaForm({...plazaForm, current_crowd: e.target.value})}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>{language === 'ar' ? 'الطاقة القصوى' : 'Max Capacity'}</Label>
                  <Input
                    type="number"
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
                    type="number"
                    value={matafForm.current_crowd}
                    onChange={(e) => setMatafForm({...matafForm, current_crowd: e.target.value})}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>{language === 'ar' ? 'الطاقة القصوى' : 'Max Capacity'}</Label>
                  <Input
                    type="number"
                    value={matafForm.max_capacity}
                    onChange={(e) => setMatafForm({...matafForm, max_capacity: e.target.value})}
                    className="mt-1"
                  />
                </div>
              </div>
              
              <div>
                <Label>{language === 'ar' ? 'متوسط وقت الطواف (بالدقائق)' : 'Average Tawaf Time (minutes)'}</Label>
                <Input
                  type="number"
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
