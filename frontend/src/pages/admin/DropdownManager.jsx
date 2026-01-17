import { useState, useEffect } from "react";
import axios from "axios";
import { useLanguage } from "@/context/LanguageContext";
import {
  List,
  Plus,
  Edit,
  Trash2,
  Save,
  X,
  Loader2,
  ChevronDown,
  ChevronUp,
  Settings2,
  AlertCircle
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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

const CATEGORY_NAMES = {
  gate_types: { ar: "أنواع الأبواب", en: "Gate Types" },
  gate_statuses: { ar: "حالات الأبواب", en: "Gate Statuses" },
  directions: { ar: "الاتجاهات", en: "Directions" },
  categories: { ar: "الفئات", en: "Categories" },
  classifications: { ar: "التصنيفات", en: "Classifications" },
  current_indicators: { ar: "مؤشرات الازدحام", en: "Crowd Indicators" },
  shifts: { ar: "الورديات", en: "Shifts" },
  plaza_zones: { ar: "مناطق الساحات", en: "Plaza Zones" }
};

export default function DropdownManager() {
  const { language } = useLanguage();
  const [options, setOptions] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [selectedOption, setSelectedOption] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [seeding, setSeeding] = useState(false);
  
  const [formData, setFormData] = useState({
    category: "",
    value: "",
    label: "",
    color: "",
    order: 0
  });

  useEffect(() => {
    fetchOptions();
  }, [selectedCategory]);

  const fetchOptions = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      const url = selectedCategory 
        ? `${API}/admin/dropdown-options?category=${selectedCategory}`
        : `${API}/admin/dropdown-options`;
      
      const response = await axios.get(url, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setOptions(response.data);
    } catch (error) {
      console.error("Error fetching options:", error);
      toast.error(language === 'ar' ? "فشل تحميل القوائم" : "Failed to load options");
    } finally {
      setLoading(false);
    }
  };

  const handleSeedData = async () => {
    try {
      setSeeding(true);
      const token = localStorage.getItem("token");
      const response = await axios.post(`${API}/admin/dropdown-options/seed`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      toast.success(language === 'ar' 
        ? `تم تهيئة ${response.data.count} خيار بنجاح`
        : `Seeded ${response.data.count} options successfully`
      );
      fetchOptions();
    } catch (error) {
      console.error("Error seeding data:", error);
      toast.error(error.response?.data?.message || (language === 'ar' ? "فشلت التهيئة" : "Seeding failed"));
    } finally {
      setSeeding(false);
    }
  };

  const handleOpenDialog = (option = null) => {
    if (option) {
      setEditMode(true);
      setSelectedOption(option);
      setFormData({
        category: option.category,
        value: option.value,
        label: option.label,
        color: option.color || "",
        order: option.order
      });
    } else {
      setEditMode(false);
      setSelectedOption(null);
      setFormData({
        category: selectedCategory || "",
        value: "",
        label: "",
        color: "",
        order: 0
      });
    }
    setDialogOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.value || !formData.label || !formData.category) {
      toast.error(language === 'ar' ? "يرجى ملء جميع الحقول المطلوبة" : "Please fill all required fields");
      return;
    }

    try {
      setSubmitting(true);
      const token = localStorage.getItem("token");
      
      if (editMode) {
        await axios.put(
          `${API}/admin/dropdown-options/${selectedOption.id}`,
          formData,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        toast.success(language === 'ar' ? "تم تحديث الخيار بنجاح" : "Option updated successfully");
      } else {
        await axios.post(
          `${API}/admin/dropdown-options`,
          formData,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        toast.success(language === 'ar' ? "تم إضافة الخيار بنجاح" : "Option added successfully");
      }
      
      setDialogOpen(false);
      fetchOptions();
    } catch (error) {
      console.error("Error saving option:", error);
      toast.error(language === 'ar' ? "فشل حفظ الخيار" : "Failed to save option");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    try {
      setSubmitting(true);
      const token = localStorage.getItem("token");
      
      await axios.delete(
        `${API}/admin/dropdown-options/${selectedOption.id}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      toast.success(language === 'ar' ? "تم حذف الخيار بنجاح" : "Option deleted successfully");
      setDeleteDialogOpen(false);
      fetchOptions();
    } catch (error) {
      console.error("Error deleting option:", error);
      toast.error(language === 'ar' ? "فشل حذف الخيار" : "Failed to delete option");
    } finally {
      setSubmitting(false);
    }
  };

  const filteredOptions = selectedCategory
    ? options.filter(opt => opt.category === selectedCategory)
    : options;

  const categoriesInUse = [...new Set(options.map(opt => opt.category))];

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="font-cairo text-xl flex items-center gap-2">
            <List className="w-5 h-5" />
            {language === 'ar' ? 'إدارة القوائم المنسدلة' : 'Dropdown Options Management'}
          </CardTitle>
          <CardDescription>
            {language === 'ar' 
              ? 'إدارة خيارات القوائم المستخدمة في النماذج (أنواع الأبواب، الحالات، الورديات، إلخ)'
              : 'Manage dropdown options used in forms (gate types, statuses, shifts, etc.)'
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex-1 min-w-[200px]">
              <Label>{language === 'ar' ? 'تصفية حسب الفئة' : 'Filter by Category'}</Label>
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger>
                  <SelectValue placeholder={language === 'ar' ? 'جميع الفئات' : 'All Categories'} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value=" ">
                    {language === 'ar' ? 'جميع الفئات' : 'All Categories'}
                  </SelectItem>
                  {Object.entries(CATEGORY_NAMES).map(([key, names]) => (
                    <SelectItem key={key} value={key}>
                      {names[language]} ({options.filter(o => o.category === key).length})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex gap-2 items-end">
              <Button onClick={() => handleOpenDialog()} className="bg-primary">
                <Plus className="w-4 h-4 ml-2" />
                {language === 'ar' ? 'إضافة خيار جديد' : 'Add New Option'}
              </Button>
              
              {options.length === 0 && (
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
                      <Settings2 className="w-4 h-4 ml-2" />
                      {language === 'ar' ? 'تهيئة البيانات الافتراضية' : 'Seed Default Data'}
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>

          {options.length === 0 && !loading && (
            <Alert className="mt-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {language === 'ar' 
                  ? 'لا توجد قوائم محفوظة. اضغط على "تهيئة البيانات الافتراضية" لإضافة القوائم الأساسية.'
                  : 'No options found. Click "Seed Default Data" to add default options.'}
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Options Table */}
      {loading ? (
        <Card>
          <CardContent className="p-8 text-center">
            <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
            <p className="mt-2 text-muted-foreground">
              {language === 'ar' ? 'جاري التحميل...' : 'Loading...'}
            </p>
          </CardContent>
        </Card>
      ) : filteredOptions.length > 0 ? (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{language === 'ar' ? 'الفئة' : 'Category'}</TableHead>
                  <TableHead>{language === 'ar' ? 'القيمة' : 'Value'}</TableHead>
                  <TableHead>{language === 'ar' ? 'التسمية' : 'Label'}</TableHead>
                  <TableHead>{language === 'ar' ? 'اللون' : 'Color'}</TableHead>
                  <TableHead>{language === 'ar' ? 'الترتيب' : 'Order'}</TableHead>
                  <TableHead>{language === 'ar' ? 'الحالة' : 'Status'}</TableHead>
                  <TableHead className="text-center">{language === 'ar' ? 'الإجراءات' : 'Actions'}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredOptions.map((option) => (
                  <TableRow key={option.id}>
                    <TableCell>
                      <Badge variant="outline">
                        {CATEGORY_NAMES[option.category]?.[language] || option.category}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-medium">{option.value}</TableCell>
                    <TableCell>{option.label}</TableCell>
                    <TableCell>
                      {option.color && (
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-6 h-6 rounded border"
                            style={{ backgroundColor: option.color }}
                          />
                          <span className="text-xs text-muted-foreground">{option.color}</span>
                        </div>
                      )}
                    </TableCell>
                    <TableCell>{option.order}</TableCell>
                    <TableCell>
                      <Badge variant={option.is_active ? "default" : "secondary"}>
                        {option.is_active 
                          ? (language === 'ar' ? 'نشط' : 'Active')
                          : (language === 'ar' ? 'غير نشط' : 'Inactive')
                        }
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-center gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleOpenDialog(option)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-destructive hover:text-destructive"
                          onClick={() => {
                            setSelectedOption(option);
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
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="font-cairo">
              {editMode 
                ? (language === 'ar' ? 'تعديل الخيار' : 'Edit Option')
                : (language === 'ar' ? 'إضافة خيار جديد' : 'Add New Option')
              }
            </DialogTitle>
            <DialogDescription>
              {language === 'ar' 
                ? 'املأ البيانات أدناه لإضافة أو تعديل خيار في القائمة'
                : 'Fill in the details below to add or edit a dropdown option'
              }
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="category">{language === 'ar' ? 'الفئة' : 'Category'} *</Label>
              <Select
                value={formData.category}
                onValueChange={(value) => setFormData({ ...formData, category: value })}
                disabled={editMode}
              >
                <SelectTrigger>
                  <SelectValue placeholder={language === 'ar' ? 'اختر الفئة' : 'Select Category'} />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(CATEGORY_NAMES).map(([key, names]) => (
                    <SelectItem key={key} value={key}>
                      {names[language]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="value">{language === 'ar' ? 'القيمة' : 'Value'} *</Label>
              <Input
                id="value"
                value={formData.value}
                onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                placeholder={language === 'ar' ? 'مثال: رئيسي' : 'Example: main'}
                required
              />
            </div>

            <div>
              <Label htmlFor="label">{language === 'ar' ? 'التسمية' : 'Label'} *</Label>
              <Input
                id="label"
                value={formData.label}
                onChange={(e) => setFormData({ ...formData, label: e.target.value })}
                placeholder={language === 'ar' ? 'مثال: رئيسي' : 'Example: Main'}
                required
              />
            </div>

            <div>
              <Label htmlFor="color">{language === 'ar' ? 'اللون (اختياري)' : 'Color (Optional)'}</Label>
              <div className="flex gap-2">
                <Input
                  id="color"
                  type="color"
                  value={formData.color || "#000000"}
                  onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                  className="w-16 h-10"
                />
                <Input
                  value={formData.color}
                  onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                  placeholder="#000000"
                  className="flex-1"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="order">{language === 'ar' ? 'الترتيب' : 'Order'}</Label>
              <Input
                id="order"
                type="number"
                value={formData.order}
                onChange={(e) => setFormData({ ...formData, order: parseInt(e.target.value) || 0 })}
                placeholder="0"
              />
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
                ? `هل أنت متأكد من حذف "${selectedOption?.label}"؟ لا يمكن التراجع عن هذا الإجراء.`
                : `Are you sure you want to delete "${selectedOption?.label}"? This action cannot be undone.`
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
