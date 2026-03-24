import { useState, useEffect } from "react";
import axios from "axios";
import { useLanguage } from "@/context/LanguageContext";
import { useSidebar } from "@/context/SidebarContext";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
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
  AlertCircle,
  GripVertical,
  ChevronDown,
  Pencil,
  Lock,
  LayoutDashboard, Map, ClipboardList, LayoutGrid, DoorOpen,
  Users, Circle, FileText, Bell, Settings as SettingsIcon,
  Calendar, BarChart3, PieChart, TrendingUp, Activity,
  Home, User, UserCheck, Building, MapPin, Navigation,
  Layers, List, Grid, Database, Archive, Folder,
  CalendarDays, Clock, Tag, Zap, ExternalLink,
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

// Icon name → Component mapping
const ICON_MAP = {
  LayoutDashboard, Map, ClipboardList, LayoutGrid, DoorOpen,
  Users, Circle, FileText, Bell, Settings: SettingsIcon, Shield,
  Calendar, BarChart3, PieChart, TrendingUp, Activity,
  Home, User, UserCheck, Building, MapPin, Navigation,
  Layers, List, Grid, Database, Archive, Folder,
  CalendarDays, Clock, Tag, Zap,
};

const getIconComponent = (iconName) => ICON_MAP[iconName] || Circle;

// Popular Lucide icons for menu items
const AVAILABLE_ICONS = [
  "LayoutDashboard", "Map", "ClipboardList", "LayoutGrid", "DoorOpen", 
  "Users", "Circle", "FileText", "Bell", "Settings", "Shield",
  "Calendar", "BarChart3", "PieChart", "TrendingUp", "Activity",
  "Home", "User", "UserCheck", "Building", "MapPin", "Navigation",
  "Layers", "List", "Grid", "Database", "Archive", "Folder"
];

const DEPARTMENTS = [
  { value: "all", label_ar: "الكل", label_en: "Everyone" },
  { value: "planning", label_ar: "إدارة التخطيط", label_en: "Planning" },
  { value: "haram_map", label_ar: "إدارة المصليات", label_en: "Prayer Areas" },
  { value: "plazas", label_ar: "إدارة الساحات", label_en: "Plazas Management" },
  { value: "gates", label_ar: "إدارة الأبواب", label_en: "Gates Management" },
  { value: "crowd_services", label_ar: "خدمات الحشود", label_en: "Crowd Services" },
  { value: "mataf", label_ar: "صحن المطاف", label_en: "Mataf Management" },
  { value: "system_admin", label_ar: "مسؤول النظام", label_en: "System Admin" },
];

// Sortable Row Component
function SortableRow({ item, language, onEdit, onDelete, onToggleActive, onToggleEditable, isExpanded, onToggleExpand, hasChildren, depth = 0 }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const isChild = !!item.parent_id;
  const indentClass = depth === 2 ? 'pr-16' : isChild ? 'pr-8' : '';

  return (
    <TableRow ref={setNodeRef} style={style} className={depth === 2 ? 'bg-muted/15' : isChild ? 'bg-muted/30' : ''}>
      <TableCell className="w-12 text-center">
        <div {...attributes} {...listeners} className="cursor-move hover:bg-muted p-1 rounded inline-block">
          <GripVertical className="w-4 h-4 text-muted-foreground" />
        </div>
      </TableCell>
      <TableCell className="font-medium text-center">{item.order}</TableCell>
      <TableCell className="text-right">
        <div className={`flex items-center gap-2 flex-row-reverse justify-end ${indentClass}`}>
          <div className="text-right">
            <div className="font-medium">{language === 'ar' ? item.name_ar : item.name_en}</div>
            <div className="text-xs text-muted-foreground">
              {language === 'ar' ? item.name_en : item.name_ar}
            </div>
            {isChild && (
              <Badge variant="outline" className="text-xs mt-1">
                {depth === 2 ? (language === 'ar' ? '↳↳ تبويب فرعي' : '↳↳ Sub-tab') : (language === 'ar' ? '↳ قائمة فرعية' : '↳ Submenu')}
              </Badge>
            )}
          </div>
          {hasChildren && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onToggleExpand(item.id)}
              className="h-6 w-6 p-0"
            >
              <ChevronDown className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
            </Button>
          )}
        </div>
      </TableCell>
      <TableCell className="text-center text-xs">
        <a href={item.href} target="_blank" rel="noopener noreferrer"
          className="text-blue-600 hover:text-blue-800 hover:underline inline-flex items-center gap-1 transition-colors" dir="ltr">
          {item.href}
          <ExternalLink className="w-3 h-3 opacity-40" />
        </a>
      </TableCell>
      <TableCell className="text-center">
        {(() => {
          const IconComp = getIconComponent(item.icon);
          return <IconComp className="w-5 h-5 text-slate-600 mx-auto" />;
        })()}
      </TableCell>
      <TableCell className="text-center">
        {(() => {
          const dept = item.department;
          if (!dept || dept === 'all') {
            return <Badge variant="default" className="text-xs bg-slate-600">الكل</Badge>;
          }
          if (dept === 'system_admin') {
            return <Badge variant="destructive" className="text-xs">مسؤول النظام</Badge>;
          }
          const deptInfo = DEPARTMENTS.find(d => d.value === dept);
          return (
            <Badge variant="secondary" className="text-xs">
              {deptInfo?.[`label_${language}`] || dept}
            </Badge>
          );
        })()}
      </TableCell>
      <TableCell className="text-center">
        <button
          onClick={() => onToggleActive(item)}
          title={item.is_active ? (language === 'ar' ? 'إخفاء' : 'Hide') : (language === 'ar' ? 'إظهار' : 'Show')}
          className={`w-8 h-8 rounded-full flex items-center justify-center mx-auto transition-all duration-300
            ${item.is_active
              ? 'bg-emerald-100 text-emerald-600 hover:bg-emerald-200 ring-1 ring-emerald-300'
              : 'bg-slate-100 text-slate-400 hover:bg-slate-200'}`}
        >
          {item.is_active ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
        </button>
      </TableCell>
      <TableCell className="text-center">
        {(() => {
          // صفحات عرض فقط — لا يظهر فيها زر التعديل
          const href = item.href || '';
          const isParentDept = !item.parent_id && item.department; // الإدارة نفسها = نظرة عامة
          const isViewOnly = href === '/' || item.is_public || isParentDept || (href.includes('tab=dashboard') && !href.includes('tab=dashboardX'));
          if (!item.is_active || isViewOnly) {
            return <span className="text-slate-300">—</span>;
          }
          return (
            <button
              onClick={() => onToggleEditable(item)}
              title={item.is_editable ? (language === 'ar' ? 'منع التعديل — عرض فقط' : 'Disable edit') : (language === 'ar' ? 'السماح بالتعديل' : 'Enable edit')}
              className={`w-8 h-8 rounded-full flex items-center justify-center mx-auto transition-all duration-300
                ${item.is_editable
                  ? 'bg-blue-100 text-blue-600 hover:bg-blue-200 ring-1 ring-blue-300'
                  : 'bg-slate-100 text-slate-400 hover:bg-slate-200'}`}
            >
              {item.is_editable ? <Pencil className="w-4 h-4" /> : <Lock className="w-3.5 h-3.5" />}
            </button>
          );
        })()}
      </TableCell>
      <TableCell className="text-center">
        <div className="flex items-center justify-center gap-2">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onEdit(item)}
          >
            <Edit className="w-4 h-4" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="text-destructive hover:text-destructive"
            onClick={() => onDelete(item)}
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
}

export default function SidebarManager() {
  const { language } = useLanguage();
  const { refreshMenu } = useSidebar();
  const [menuItems, setMenuItems] = useState([]);
  const [expandedItems, setExpandedItems] = useState({}); // Track which parent items are expanded
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [seeding, setSeeding] = useState(false);
  
  // Drag & Drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Toggle expand/collapse for parent items
  const toggleExpand = (itemId) => {
    setExpandedItems(prev => ({
      ...prev,
      [itemId]: !prev[itemId]
    }));
  };

  // Get flat list with nested items for display (supports 3 levels)
  const getDisplayItems = () => {
    const result = [];
    const parentItems = menuItems.filter(item => !item.parent_id);
    
    parentItems.forEach(parent => {
      result.push(parent);
      
      // If parent is expanded, add its children
      if (expandedItems[parent.id]) {
        const children = menuItems.filter(item => item.parent_id === parent.id);
        children.forEach(child => {
          result.push(child);
          // If child is expanded, add its grandchildren (level 3)
          const grandchildren = menuItems.filter(item => item.parent_id === child.id);
          if (grandchildren.length > 0) {
            child._hasChildren = true;
            if (expandedItems[child.id]) {
              grandchildren.forEach(gc => {
                gc._depth = 2;
                result.push(gc);
              });
            }
          }
        });
      }
    });
    
    return result;
  };

  const displayItems = getDisplayItems();
  
  const [formData, setFormData] = useState({
    name_ar: "",
    name_en: "",
    subtitle_ar: "",
    subtitle_en: "",
    href: "",
    icon: "LayoutDashboard",
    order: 0,
    is_public: false,
    is_secondary: false,
    admin_only: false,
    parent_id: "none",
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
        subtitle_ar: item.subtitle_ar || "",
        subtitle_en: item.subtitle_en || "",
        href: item.href,
        icon: item.icon,
        order: item.order,
        is_public: item.is_public,
        is_secondary: item.is_secondary || false,
        admin_only: item.admin_only,
        parent_id: item.parent_id || "none",
        department: item.department || "none"
      });
    } else {
      setEditMode(false);
      setSelectedItem(null);
      const maxOrder = Math.max(...menuItems.map(i => i.order), 0);
      setFormData({
        name_ar: "",
        name_en: "",
        subtitle_ar: "",
        subtitle_en: "",
        href: "",
        icon: "LayoutDashboard",
        order: maxOrder + 1,
        is_public: false,
        is_secondary: false,
        admin_only: false,
        parent_id: "none",
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
        parent_id: formData.parent_id === "none" ? null : formData.parent_id,
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
      refreshMenu(); // ✨ تحديث القائمة الجانبية فوراً
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
      refreshMenu();
    } catch (error) {
      console.error("Error toggling status:", error);
      toast.error(language === 'ar' ? "فشل تحديث الحالة" : "Failed to update status");
    }
  };

  const handleToggleEditable = async (item) => {
    try {
      const token = localStorage.getItem("token");
      const newVal = !item.is_editable;
      await axios.put(
        `${API}/admin/sidebar-menu/${item.id}`,
        { is_editable: newVal },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success(language === 'ar'
        ? (newVal ? "تم تفعيل صلاحية التعديل" : "تم تقييد التعديل — عرض فقط")
        : (newVal ? "Edit enabled" : "View only"));
      fetchMenuItems();
      refreshMenu();
    } catch (error) {
      toast.error(language === 'ar' ? "فشل تحديث الصلاحية" : "Failed to update");
    }
  };

  const handleDragEnd = async (event) => {
    const { active, over } = event;

    if (!over || active.id === over.id) return;

    const activeItem = menuItems.find(item => item.id === active.id);
    const overItem = menuItems.find(item => item.id === over.id);

    if (!activeItem || !overItem) return;

    // Check if both items have same parent (or both are parents)
    if (activeItem.parent_id !== overItem.parent_id) {
      toast.error(language === 'ar' 
        ? 'لا يمكن نقل القائمة الفرعية لمجموعة أخرى'
        : 'Cannot move submenu to different group'
      );
      return;
    }

    // Get items in the same group
    const groupItems = menuItems.filter(item => item.parent_id === activeItem.parent_id);
    const oldIndex = groupItems.findIndex(item => item.id === active.id);
    const newIndex = groupItems.findIndex(item => item.id === over.id);

    // Reorder within group
    const reorderedGroup = arrayMove(groupItems, oldIndex, newIndex);
    
    // Update order numbers for the group
    const updatedGroup = reorderedGroup.map((item, index) => ({
      ...item,
      order: index + 1
    }));

    // Merge with other items
    const otherItems = menuItems.filter(item => item.parent_id !== activeItem.parent_id);
    const allUpdatedItems = [...otherItems, ...updatedGroup].sort((a, b) => {
      // Sort by parent_id first, then by order
      if (a.parent_id === b.parent_id) {
        return a.order - b.order;
      }
      return (a.parent_id || '').localeCompare(b.parent_id || '');
    });

    setMenuItems(allUpdatedItems);

    // Update in database
    try {
      const token = localStorage.getItem("token");
      
      await Promise.all(
        updatedGroup.map((item) =>
          axios.put(
            `${API}/admin/sidebar-menu/${item.id}`,
            { order: item.order },
            { headers: { Authorization: `Bearer ${token}` } }
          )
        )
      );
      
      toast.success(language === 'ar' ? "تم تحديث الترتيب بنجاح" : "Order updated successfully");
      refreshMenu();
    } catch (error) {
      console.error("Error updating order:", error);
      toast.error(language === 'ar' ? "فشل تحديث الترتيب" : "Failed to update order");
      fetchMenuItems();
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
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
            
            <div className="text-right">
              <CardTitle className="font-cairo text-xl flex items-center gap-2 justify-end">
                <Menu className="w-5 h-5" />
                {language === 'ar' ? 'إدارة القائمة الجانبية' : 'Sidebar Menu Management'}
              </CardTitle>
              <CardDescription className="text-right mt-1">
                {language === 'ar' 
                  ? 'إضافة، تعديل، وحذف أقسام القائمة الجانبية للمنصة'
                  : 'Add, edit, and delete sidebar menu items for the platform'
                }
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {menuItems.length === 0 && !loading && (
            <Alert>
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
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <div dir="rtl">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12 text-center"></TableHead>
                      <TableHead className="w-16 text-center">{language === 'ar' ? 'الترتيب' : 'Order'}</TableHead>
                      <TableHead className="text-right">{language === 'ar' ? 'الاسم' : 'Name'}</TableHead>
                      <TableHead className="text-center">{language === 'ar' ? 'الرابط' : 'Link'}</TableHead>
                      <TableHead className="text-center">{language === 'ar' ? 'الأيقونة' : 'Icon'}</TableHead>
                      <TableHead className="text-center">{language === 'ar' ? 'النوع' : 'Type'}</TableHead>
                      <TableHead className="text-center">{language === 'ar' ? 'الحالة' : 'Status'}</TableHead>
                      <TableHead className="text-center">{language === 'ar' ? 'التعديل' : 'Edit'}</TableHead>
                      <TableHead className="text-center">{language === 'ar' ? 'الإجراءات' : 'Actions'}</TableHead>
                    </TableRow>
                  </TableHeader>
                <TableBody>
                  <SortableContext
                    items={displayItems.map(item => item.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    {displayItems.map((item) => {
                      const children = menuItems.filter(child => child.parent_id === item.id);
                      const isExpanded = expandedItems[item.id];
                      
                      return (
                        <SortableRow
                          key={item.id}
                          item={item}
                          language={language}
                          onEdit={handleOpenDialog}
                          onDelete={(item) => {
                            setSelectedItem(item);
                            setDeleteDialogOpen(true);
                          }}
                          onToggleActive={handleToggleActive}
                          onToggleEditable={handleToggleEditable}
                          isExpanded={isExpanded}
                          onToggleExpand={toggleExpand}
                          hasChildren={children.length > 0 || item._hasChildren}
                          depth={item._depth || 0}
                        />
                      );
                    })}
                  </SortableContext>
                </TableBody>
              </Table>
              </div>
            </DndContext>
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
                  type="number" inputMode="numeric"
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

            <div>
              <Label htmlFor="parent">{language === 'ar' ? 'تابع لـ (القائمة الأب)' : 'Parent Menu'}</Label>
              <Select
                value={formData.parent_id}
                onValueChange={(value) => setFormData({ ...formData, parent_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder={language === 'ar' ? 'بدون — عنصر رئيسي' : 'None (Root Item)'} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">
                    {language === 'ar' ? 'بدون — عنصر رئيسي' : 'None (Root Item)'}
                  </SelectItem>
                  {menuItems
                    .filter(item => item.id !== selectedItem?.id) // لا يكون أب لنفسه
                    .sort((a, b) => (a.order || 0) - (b.order || 0))
                    .map((item) => {
                      const parentName = item.parent_id
                        ? menuItems.find(p => p.id === item.parent_id)?.name_ar
                        : null;
                      const label = parentName
                        ? `${parentName} ← ${item.name_ar}`
                        : item.name_ar;
                      return (
                        <SelectItem key={item.id} value={item.id}>
                          {label}
                        </SelectItem>
                      );
                    })
                  }
                </SelectContent>
              </Select>
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
