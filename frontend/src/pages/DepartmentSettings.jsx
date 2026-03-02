import { useState, useEffect } from "react";
import axios from "axios";
import { useLanguage } from "@/context/LanguageContext";
import { useAuth } from "@/context/AuthContext";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Settings,
  Clock,
  Coffee,
  MapPin,
  Plus,
  Edit,
  Trash2,
  Loader2,
  DoorOpen,
  Users,
  Layers
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import GatesDataManagement from "@/components/GatesDataManagement";
import EmployeeManagement from "@/components/EmployeeManagement";
import GateMapPage from "@/pages/GateMapPage";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function DepartmentSettings({ department }) {
  const { language } = useLanguage();
  const { user, isReadOnly } = useAuth();
  const [activeTab, setActiveTab] = useState(department === 'gates' ? 'gates_data' : 'shifts');
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // States for each setting type
  const [shifts, setShifts] = useState([]);
  const [restPatterns, setRestPatterns] = useState([]);
  const [locations, setLocations] = useState([]);

  const [formData, setFormData] = useState({
    value: "",
    label: "",
    description: "",
    color: "#3b82f6",
    start_time: "",
    end_time: "",
    order: 0
  });

  useEffect(() => {
    fetchAllSettings();
  }, [department]);

  const fetchAllSettings = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const [shiftsRes, restRes, locationsRes] = await Promise.all([
        axios.get(`${API}/${department}/settings/shifts`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get(`${API}/${department}/settings/rest_patterns`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get(`${API}/${department}/settings/coverage_locations`, {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);
      
      setShifts(shiftsRes.data);
      setRestPatterns(restRes.data);
      setLocations(locationsRes.data);
    } catch (error) {
      console.error("Error fetching settings:", error);
      toast.error(language === 'ar' ? "فشل في جلب الإعدادات" : "Failed to fetch settings");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (settingType, item = null) => {
    if (item) {
      setEditMode(true);
      setSelectedItem(item);
      setFormData({
        value: item.value,
        label: item.label,
        description: item.description || "",
        color: item.color || "#3b82f6",
        start_time: item.start_time || "",
        end_time: item.end_time || "",
        order: item.order || 0
      });
    } else {
      setEditMode(false);
      setSelectedItem(null);
      setFormData({
        value: "",
        label: "",
        description: "",
        color: "#3b82f6",
        start_time: "",
        end_time: "",
        order: 0
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
        department,
        setting_type: activeTab,
        ...formData
      };

      if (editMode) {
        await axios.put(
          `${API}/${department}/settings/${selectedItem.id}`,
          formData,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        toast.success(language === 'ar' ? "تم التحديث بنجاح" : "Updated successfully");
      } else {
        await axios.post(
          `${API}/${department}/settings`,
          payload,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        toast.success(language === 'ar' ? "تم الإضافة بنجاح" : "Added successfully");
      }

      setDialogOpen(false);
      fetchAllSettings();
    } catch (error) {
      console.error("Error saving setting:", error);
      toast.error(error.response?.data?.detail || (language === 'ar' ? "حدث خطأ" : "An error occurred"));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (settingId) => {
    if (!confirm(language === 'ar' ? "هل أنت متأكد من الحذف؟" : "Are you sure you want to delete?")) {
      return;
    }

    try {
      const token = localStorage.getItem("token");
      await axios.delete(`${API}/${department}/settings/${settingId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success(language === 'ar' ? "تم الحذف بنجاح" : "Deleted successfully");
      fetchAllSettings();
    } catch (error) {
      console.error("Error deleting setting:", error);
      toast.error(language === 'ar' ? "فشل الحذف" : "Failed to delete");
    }
  };

  const renderShiftsTable = () => (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="font-cairo font-semibold text-lg">
            {language === 'ar' ? 'الورديات' : 'Shifts'}
          </h3>
          <p className="text-sm text-muted-foreground">
            {language === 'ar' ? 'إدارة الورديات الخاصة بالقسم' : 'Manage department shifts'}
          </p>
        </div>
        {!isReadOnly() && (
          <Button onClick={() => handleOpenDialog('shifts')} className="bg-primary">
            <Plus className="w-4 h-4 ml-2" />
            {language === 'ar' ? 'إضافة وردية' : 'Add Shift'}
          </Button>
        )}
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="text-right">{language === 'ar' ? 'الاسم' : 'Name'}</TableHead>
            <TableHead className="text-right">{language === 'ar' ? 'الوقت' : 'Time'}</TableHead>
            <TableHead className="text-right">{language === 'ar' ? 'الوصف' : 'Description'}</TableHead>
            <TableHead className="text-center">{language === 'ar' ? 'اللون' : 'Color'}</TableHead>
            <TableHead className="text-center">{language === 'ar' ? 'الإجراءات' : 'Actions'}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {shifts.map((shift) => (
            <TableRow key={shift.id}>
              <TableCell className="text-right font-medium">{shift.label}</TableCell>
              <TableCell className="text-right">
                {shift.start_time && shift.end_time
                  ? `${shift.start_time} - ${shift.end_time}`
                  : '-'}
              </TableCell>
              <TableCell className="text-right">{shift.description || '-'}</TableCell>
              <TableCell className="text-center">
                <Badge style={{ backgroundColor: shift.color }}>{shift.label}</Badge>
              </TableCell>
              <TableCell className="text-center">
                <div className="flex items-center gap-2 justify-center">
                  {!isReadOnly() && (
                    <>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleOpenDialog('shifts', shift)}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDelete(shift.id)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </>
                  )}
                </div>
              </TableCell>
            </TableRow>
          ))}
          {shifts.length === 0 && (
            <TableRow>
              <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                {language === 'ar' ? 'لا توجد ورديات' : 'No shifts found'}
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );

  const renderRestPatternsTable = () => (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="font-cairo font-semibold text-lg">
            {language === 'ar' ? 'أنماط الراحة' : 'Rest Patterns'}
          </h3>
          <p className="text-sm text-muted-foreground">
            {language === 'ar' ? 'إدارة أنماط الراحة الأسبوعية' : 'Manage weekly rest patterns'}
          </p>
        </div>
        {!isReadOnly() && (
          <Button onClick={() => handleOpenDialog('rest_patterns')} className="bg-primary">
            <Plus className="w-4 h-4 ml-2" />
            {language === 'ar' ? 'إضافة نمط راحة' : 'Add Rest Pattern'}
          </Button>
        )}
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="text-right">{language === 'ar' ? 'الاسم' : 'Name'}</TableHead>
            <TableHead className="text-right">{language === 'ar' ? 'الوصف' : 'Description'}</TableHead>
            <TableHead className="text-center">{language === 'ar' ? 'الإجراءات' : 'Actions'}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {restPatterns.map((pattern) => (
            <TableRow key={pattern.id}>
              <TableCell className="text-right font-medium">{pattern.label}</TableCell>
              <TableCell className="text-right">{pattern.description || '-'}</TableCell>
              <TableCell className="text-center">
                <div className="flex items-center gap-2 justify-center">
                  {!isReadOnly() && (
                    <>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleOpenDialog('rest_patterns', pattern)}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDelete(pattern.id)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </>
                  )}
                </div>
              </TableCell>
            </TableRow>
          ))}
          {restPatterns.length === 0 && (
            <TableRow>
              <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">
                {language === 'ar' ? 'لا توجد أنماط راحة' : 'No rest patterns found'}
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );

  const renderLocationsTable = () => (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="font-cairo font-semibold text-lg">
            {language === 'ar' ? 'مواقع التغطية' : 'Coverage Locations'}
          </h3>
          <p className="text-sm text-muted-foreground">
            {language === 'ar' ? 'إدارة مواقع العمل' : 'Manage work locations'}
          </p>
        </div>
        {!isReadOnly() && (
          <Button onClick={() => handleOpenDialog('coverage_locations')} className="bg-primary">
            <Plus className="w-4 h-4 ml-2" />
            {language === 'ar' ? 'إضافة موقع' : 'Add Location'}
          </Button>
        )}
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="text-right">{language === 'ar' ? 'الاسم' : 'Name'}</TableHead>
            <TableHead className="text-right">{language === 'ar' ? 'الوصف' : 'Description'}</TableHead>
            <TableHead className="text-center">{language === 'ar' ? 'الإجراءات' : 'Actions'}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {locations.map((location) => (
            <TableRow key={location.id}>
              <TableCell className="text-right font-medium">{location.label}</TableCell>
              <TableCell className="text-right">{location.description || '-'}</TableCell>
              <TableCell className="text-center">
                <div className="flex items-center gap-2 justify-center">
                  {!isReadOnly() && (
                    <>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleOpenDialog('coverage_locations', location)}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDelete(location.id)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </>
                  )}
                </div>
              </TableCell>
            </TableRow>
          ))}
          {locations.length === 0 && (
            <TableRow>
              <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">
                {language === 'ar' ? 'لا توجد مواقع' : 'No locations found'}
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="font-cairo font-bold text-xl text-right">
          {language === 'ar' ? 'إعدادات القسم' : 'Department Settings'}
        </h2>
        <p className="text-sm text-muted-foreground mt-1 text-right">
          {department === 'gates'
            ? (language === 'ar' ? 'إدارة البيانات الأساسية - الأبواب والموظفين والخرائط والورديات' : 'Manage base data - gates, staff, maps, shifts')
            : (language === 'ar' ? 'إدارة الورديات وأنماط الراحة ومواقع التغطية' : 'Manage shifts, rest patterns, and coverage locations')}
        </p>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} dir="rtl">
        <TabsList className={`grid w-full ${department === 'gates' ? 'grid-cols-6' : 'grid-cols-3'}`}>
          {department === 'gates' && (
            <>
              <TabsTrigger value="gates_data" className="flex items-center gap-1.5 text-xs">
                <DoorOpen className="w-3.5 h-3.5" />
                {language === 'ar' ? 'الأبواب' : 'Gates'}
              </TabsTrigger>
              <TabsTrigger value="employees" className="flex items-center gap-1.5 text-xs">
                <Users className="w-3.5 h-3.5" />
                {language === 'ar' ? 'الموظفين' : 'Staff'}
              </TabsTrigger>
              <TabsTrigger value="maps" className="flex items-center gap-1.5 text-xs">
                <Layers className="w-3.5 h-3.5" />
                {language === 'ar' ? 'الخرائط' : 'Maps'}
              </TabsTrigger>
            </>
          )}
          <TabsTrigger value="shifts" className="flex items-center gap-1.5 text-xs">
            <Clock className="w-3.5 h-3.5" />
            {language === 'ar' ? 'الورديات' : 'Shifts'}
          </TabsTrigger>
          <TabsTrigger value="rest_patterns" className="flex items-center gap-1.5 text-xs">
            <Coffee className="w-3.5 h-3.5" />
            {language === 'ar' ? 'أنماط الراحة' : 'Rest'}
          </TabsTrigger>
          <TabsTrigger value="coverage_locations" className="flex items-center gap-1.5 text-xs">
            <MapPin className="w-3.5 h-3.5" />
            {language === 'ar' ? 'المواقع' : 'Locations'}
          </TabsTrigger>
        </TabsList>

        {/* Gates-specific tabs */}
        {department === 'gates' && (
          <>
            <TabsContent value="gates_data" className="mt-4">
              <GatesDataManagement />
            </TabsContent>
            <TabsContent value="employees" className="mt-4">
              <EmployeeManagement department="gates" />
            </TabsContent>
            <TabsContent value="maps" className="mt-4">
              <GateMapPage />
            </TabsContent>
          </>
        )}

        <TabsContent value="shifts" className="mt-6">
          <Card>{renderShiftsTable()}</Card>
        </TabsContent>

        <TabsContent value="rest_patterns" className="mt-6">
          <Card>{renderRestPatternsTable()}</Card>
        </TabsContent>

        <TabsContent value="coverage_locations" className="mt-6">
          <Card>{renderLocationsTable()}</Card>
        </TabsContent>
      </Tabs>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="font-cairo">
              {editMode
                ? (language === 'ar' ? 'تعديل' : 'Edit')
                : (language === 'ar' ? 'إضافة جديد' : 'Add New')}
            </DialogTitle>
            <DialogDescription>
              {language === 'ar'
                ? 'املأ المعلومات أدناه'
                : 'Fill in the information below'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="space-y-4 py-4">
              <div>
                <Label htmlFor="label">{language === 'ar' ? 'الاسم' : 'Name'}</Label>
                <Input
                  id="label"
                  value={formData.label}
                  onChange={(e) => setFormData({ ...formData, label: e.target.value })}
                  required
                  className="mt-1"
                  placeholder={language === 'ar' ? 'مثال: الوردية الأولى' : 'e.g., First Shift'}
                />
              </div>

              <div>
                <Label htmlFor="value">{language === 'ar' ? 'القيمة' : 'Value'}</Label>
                <Input
                  id="value"
                  value={formData.value}
                  onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                  required
                  className="mt-1"
                  placeholder={language === 'ar' ? 'مثال: shift_1' : 'e.g., shift_1'}
                />
              </div>

              <div>
                <Label htmlFor="description">{language === 'ar' ? 'الوصف (اختياري)' : 'Description (Optional)'}</Label>
                <Input
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="mt-1"
                />
              </div>

              {activeTab === 'shifts' && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="start_time">{language === 'ar' ? 'وقت البداية' : 'Start Time'}</Label>
                      <Input
                        id="start_time"
                        type="time"
                        value={formData.start_time}
                        onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="end_time">{language === 'ar' ? 'وقت النهاية' : 'End Time'}</Label>
                      <Input
                        id="end_time"
                        type="time"
                        value={formData.end_time}
                        onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                        className="mt-1"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="color">{language === 'ar' ? 'اللون' : 'Color'}</Label>
                    <Input
                      id="color"
                      type="color"
                      value={formData.color}
                      onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                      className="mt-1 h-10"
                    />
                  </div>
                </>
              )}

              <div>
                <Label htmlFor="order">{language === 'ar' ? 'الترتيب' : 'Order'}</Label>
                <Input
                  id="order"
                  type="number"
                  value={formData.order}
                  onChange={(e) => setFormData({ ...formData, order: parseInt(e.target.value) })}
                  className="mt-1"
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                {language === 'ar' ? 'إلغاء' : 'Cancel'}
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? <Loader2 className="w-4 h-4 animate-spin ml-2" /> : null}
                {editMode
                  ? (language === 'ar' ? 'تحديث' : 'Update')
                  : (language === 'ar' ? 'إضافة' : 'Add')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
