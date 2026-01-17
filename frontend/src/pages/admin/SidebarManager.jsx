import { useState, useEffect } from "react";
import axios from "axios";
import { useLanguage } from "@/context/LanguageContext";
import { useSidebar } from "@/context/SidebarContext";
import {
  Menu,
  Plus,
  Edit,
  Trash2,
  Save,
  X,
  Loader2,
  ArrowUp,
  ArrowDown,
  Eye,
  EyeOff,
  Shield,
  AlertCircle
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
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
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

// Popular Lucide icons for menu items
const AVAILABLE_ICONS = [
  "LayoutDashboard", "Map", "ClipboardList", "LayoutGrid", "DoorOpen", 
  "Users", "Circle", "FileText", "Bell", "Settings", "Shield",
  "Calendar", "BarChart3", "PieChart", "TrendingUp", "Activity",
  "Home", "User", "UserCheck", "Building", "MapPin", "Navigation",
  "Layers", "List", "Grid", "Database", "Archive", "Folder"
];

const DEPARTMENTS = [
  { value: "none", label_ar: "لا يوجد (عام)", label_en: "None (Public)" },
  { value: "planning", label_ar: "تخطيط خدمات الحشود", label_en: "Crowd Planning" },
  { value: "plazas", label_ar: "إدارة الساحات", label_en: "Plazas Management" },
  { value: "gates", label_ar: "إدارة الأبواب", label_en: "Gates Management" },
  { value: "crowd_services", label_ar: "خدمات الحشود", label_en: "Crowd Services" },
  { value: "mataf", label_ar: "صحن المطاف", label_en: "Mataf Management" }
];

export default function SidebarManager() {
  const { language } = useLanguage();
  const { refreshMenu } = useSidebar();
  const [menuItems, setMenuItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [seeding, setSeeding] = useState(false);
  
  const [formData, setFormData] = useState({
    name_ar: "",
    name_en: "",
    href: "",
    icon: "LayoutDashboard",
    order: 0,
    is_public: false,
    is_secondary: false,
    admin_only: false,
    department: "none"
  });

  useEffect(() => {
    fetchMenuItems();
  }, []);

  const fetchMenuItems = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      const response = await axios.get(`${API}/admin/sidebar-menu`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMenuItems(response.data);
    } catch (error) {
      console.error("Error fetching menu items:", error);
      toast.error(language === 'ar' ? "فشل تحميل القائمة" : "Failed to load menu");
    } finally {
      setLoading(false);
    }
  };

  const handleSeedData = async () => {
    try {
      setSeeding(true);
      const token = localStorage.getItem("token");
      const response = await axios.post(`${API}/admin/sidebar-menu/seed`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      toast.success(language === 'ar' 
        ? `تم تهيئة ${response.data.count} قسم بنجاح`
        : `Seeded ${response.data.count} items successfully`
      );
      fetchMenuItems();
      refreshMenu(); // ✨ تحديث القائمة الجانبية فوراً
    } catch (error) {
      console.error("Error seeding data:", error);
      toast.error(error.response?.data?.message || (language === 'ar' ? "فشلت التهيئة" : "Seeding failed"));
    } finally {
      setSeeding(false);
    }
  };

  const handleOpenDialog = (item = null) => {
    if (item) {
      setEditMode(true);
      setSelectedItem(item);
      setFormData({
        name_ar: item.name_ar,
        name_en: item.name_en,
        href: item.href,
        icon: item.icon,
        order: item.order,
        is_public: item.is_public,
        is_secondary: item.is_secondary || false,
        admin_only: item.admin_only,
        department: item.department || "none"
      });
    } else {
      setEditMode(false);
      setSelectedItem(null);
      const maxOrder = Math.max(...menuItems.map(i => i.order), 0);
      setFormData({
        name_ar: "",
        name_en: "",
        href: "",
        icon: "LayoutDashboard",
        order: maxOrder + 1,
        is_public: false,
        is_secondary: false,
        admin_only: false,
        department: "none"
      });
    }
    setDialogOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.name_ar || !formData.name_en || !formData.href || !formData.icon) {
      toast.error(language === 'ar' ? "يرجى ملء جميع الحقول المطلوبة" : "Please fill all required fields");
      return;
    }

    try {
      setSubmitting(true);
      const token = localStorage.getItem("token");
      
      const submitData = {
        ...formData,
        department: formData.department === "none" ? null : formData.department
      };
      
      if (editMode) {
        await axios.put(
          `${API}/admin/sidebar-menu/${selectedItem.id}`,
          submitData,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        toast.success(language === 'ar' ? "تم تحديث القسم بنجاح" : "Menu item updated successfully");
      } else {
        await axios.post(
          `${API}/admin/sidebar-menu`,
          submitData,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        toast.success(language === 'ar' ? "تم إضافة القسم بنجاح" : "Menu item added successfully");
      }
      
      setDialogOpen(false);
      fetchMenuItems();
      refreshMenu(); // ✨ تحديث القائمة الجانبية فوراً
    } catch (error) {
      console.error("Error saving menu item:", error);
      toast.error(language === 'ar' ? "فشل حفظ القسم" : "Failed to save menu item");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    try {
      setSubmitting(true);
      const token = localStorage.getItem("token");
      
      await axios.delete(
        `${API}/admin/sidebar-menu/${selectedItem.id}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      toast.success(language === 'ar' ? "تم حذف القسم بنجاح" : "Menu item deleted successfully");
      setDeleteDialogOpen(false);
      fetchMenuItems();
    } catch (error) {
      console.error("Error deleting menu item:", error);
      toast.error(language === 'ar' ? "فشل حذف القسم" : "Failed to delete menu item");
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleActive = async (item) => {
    try {
      const token = localStorage.getItem("token");
      await axios.put(
        `${API}/admin/sidebar-menu/${item.id}`,
        { is_active: !item.is_active },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success(language === 'ar' ? "تم تحديث الحالة" : "Status updated");
      fetchMenuItems();
    } catch (error) {
      console.error("Error toggling status:", error);
      toast.error(language === 'ar' ? "فشل تحديث الحالة" : "Failed to update status");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="font-cairo text-xl flex items-center gap-2">
            <Menu className="w-5 h-5" />
            {language === 'ar' ? 'إدارة القائمة الجانبية' : 'Sidebar Menu Management'}
          </CardTitle>
          <CardDescription>
            {language === 'ar' 
              ? 'إضافة، تعديل، وحذف أقسام القائمة الجانبية للمنصة'
              : 'Add, edit, and delete sidebar menu items for the platform'
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3 flex-wrap">
            <Button onClick={() => handleOpenDialog()} className="bg-primary">
              <Plus className="w-4 h-4 ml-2" />
              {language === 'ar' ? 'إضافة قسم جديد' : 'Add New Item'}
            </Button>
            
            {menuItems.length === 0 && (
              <Button 
                onClick={handleSeedData} 
                variant="outline"
                disabled={seeding}
              >
                {seeding ? (
                  <>
                    <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                    {language === 'ar' ? 'جاري التهيئة...' : 'Seeding...'}
                  </>
                ) : (
                  <>
                    <Menu className="w-4 h-4 ml-2" />
                    {language === 'ar' ? 'تهيئة القائمة الافتراضية' : 'Seed Default Menu'}
                  </>
                )}
              </Button>
            )}
          </div>

          {menuItems.length === 0 && !loading && (
            <Alert className="mt-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {language === 'ar' 
                  ? 'لا توجد أقسام في القائمة. اضغط على "تهيئة القائمة الافتراضية" لإضافة الأقسام الأساسية.'
                  : 'No menu items found. Click "Seed Default Menu" to add default items.'}
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Menu Items Table */}
      {loading ? (
        <Card>
          <CardContent className="p-8 text-center">
            <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
            <p className="mt-2 text-muted-foreground">
              {language === 'ar' ? 'جاري التحميل...' : 'Loading...'}
            </p>
          </CardContent>
        </Card>
      ) : menuItems.length > 0 ? (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">{language === 'ar' ? 'الترتيب' : 'Order'}</TableHead>
                  <TableHead>{language === 'ar' ? 'الاسم' : 'Name'}</TableHead>
                  <TableHead>{language === 'ar' ? 'الرابط' : 'Link'}</TableHead>
                  <TableHead>{language === 'ar' ? 'الأيقونة' : 'Icon'}</TableHead>
                  <TableHead>{language === 'ar' ? 'النوع' : 'Type'}</TableHead>
                  <TableHead>{language === 'ar' ? 'الحالة' : 'Status'}</TableHead>
                  <TableHead className="text-center">{language === 'ar' ? 'الإجراءات' : 'Actions'}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {menuItems.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.order}</TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{language === 'ar' ? item.name_ar : item.name_en}</div>
                        <div className="text-xs text-muted-foreground">
                          {language === 'ar' ? item.name_en : item.name_ar}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs font-mono">{item.href}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{item.icon}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {item.is_public && (
                          <Badge variant="default" className="text-xs">
                            {language === 'ar' ? 'عام' : 'Public'}
                          </Badge>
                        )}
                        {item.admin_only && (
                          <Badge variant="destructive" className="text-xs">
                            <Shield className="w-3 h-3 ml-1" />
                            {language === 'ar' ? 'أدمن' : 'Admin'}
                          </Badge>
                        )}
                        {item.department && (
                          <Badge variant="secondary" className="text-xs">
                            {DEPARTMENTS.find(d => d.value === item.department)?.[`label_${language}`]}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleToggleActive(item)}
                        className="h-7 w-7 p-0"
                      >
                        {item.is_active ? (
                          <Eye className="w-4 h-4 text-green-600" />
                        ) : (
                          <EyeOff className="w-4 h-4 text-muted-foreground" />
                        )}
                      </Button>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-center gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleOpenDialog(item)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-destructive hover:text-destructive"
                          onClick={() => {
                            setSelectedItem(item);
                            setDeleteDialogOpen(true);
                          }}
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
      ) : null}

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-cairo">
              {editMode 
                ? (language === 'ar' ? 'تعديل القسم' : 'Edit Menu Item')
                : (language === 'ar' ? 'إضافة قسم جديد' : 'Add New Menu Item')
              }
            </DialogTitle>
            <DialogDescription>
              {language === 'ar' 
                ? 'املأ البيانات أدناه لإضافة أو تعديل قسم في القائمة الجانبية'
                : 'Fill in the details below to add or edit a sidebar menu item'
              }
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name_ar">{language === 'ar' ? 'الاسم بالعربي' : 'Name (Arabic)'} *</Label>
                <Input
                  id="name_ar"
                  value={formData.name_ar}
                  onChange={(e) => setFormData({ ...formData, name_ar: e.target.value })}
                  placeholder="مثال: لوحة التحكم"
                  required
                />
              </div>

              <div>
                <Label htmlFor="name_en">{language === 'ar' ? 'الاسم بالإنجليزي' : 'Name (English)'} *</Label>
                <Input
                  id="name_en"
                  value={formData.name_en}
                  onChange={(e) => setFormData({ ...formData, name_en: e.target.value })}
                  placeholder="Example: Dashboard"
                  required
                />
              </div>
            </div>

            <div>
              <Label htmlFor="href">{language === 'ar' ? 'الرابط' : 'URL Path'} *</Label>
              <Input
                id="href"
                value={formData.href}
                onChange={(e) => setFormData({ ...formData, href: e.target.value })}
                placeholder="/dashboard"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="icon">{language === 'ar' ? 'الأيقونة' : 'Icon'} *</Label>
                <Select
                  value={formData.icon}
                  onValueChange={(value) => setFormData({ ...formData, icon: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {AVAILABLE_ICONS.map((icon) => (
                      <SelectItem key={icon} value={icon}>
                        {icon}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="order">{language === 'ar' ? 'الترتيب' : 'Order'}</Label>
                <Input
                  id="order"
                  type="number"
                  value={formData.order}
                  onChange={(e) => setFormData({ ...formData, order: parseInt(e.target.value) || 0 })}
                  placeholder="1"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="department">{language === 'ar' ? 'الإدارة المسؤولة' : 'Department'}</Label>
              <Select
                value={formData.department}
                onValueChange={(value) => setFormData({ ...formData, department: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DEPARTMENTS.map((dept) => (
                    <SelectItem key={dept.value} value={dept.value}>
                      {dept[`label_${language}`]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label htmlFor="is_public">{language === 'ar' ? 'متاح للجميع' : 'Public Access'}</Label>
                <Switch
                  id="is_public"
                  checked={formData.is_public}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_public: checked })}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="is_secondary">{language === 'ar' ? 'قائمة ثانوية (تحت الخط)' : 'Secondary Menu (Below Line)'}</Label>
                <Switch
                  id="is_secondary"
                  checked={formData.is_secondary}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_secondary: checked })}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="admin_only">{language === 'ar' ? 'للمسؤولين فقط' : 'Admin Only'}</Label>
                <Switch
                  id="admin_only"
                  checked={formData.admin_only}
                  onCheckedChange={(checked) => setFormData({ ...formData, admin_only: checked })}
                />
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                <X className="w-4 h-4 ml-2" />
                {language === 'ar' ? 'إلغاء' : 'Cancel'}
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                    {language === 'ar' ? 'جاري الحفظ...' : 'Saving...'}
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 ml-2" />
                    {language === 'ar' ? 'حفظ' : 'Save'}
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-cairo">
              {language === 'ar' ? 'تأكيد الحذف' : 'Confirm Deletion'}
            </DialogTitle>
            <DialogDescription>
              {language === 'ar' 
                ? `هل أنت متأكد من حذف "${selectedItem?.name_ar}"؟ لا يمكن التراجع عن هذا الإجراء.`
                : `Are you sure you want to delete "${selectedItem?.name_en}"? This action cannot be undone.`
              }
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              {language === 'ar' ? 'إلغاء' : 'Cancel'}
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={submitting}>
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                  {language === 'ar' ? 'جاري الحذف...' : 'Deleting...'}
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4 ml-2" />
                  {language === 'ar' ? 'حذف' : 'Delete'}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
