import { useState, useEffect } from "react";
import axios from "axios";
import { useLanguage } from "@/context/LanguageContext";
import {
  ShieldAlert,
  Plus,
  Edit,
  Trash2,
  Save,
  X,
  Loader2,
  ChevronDown
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
import { toast } from "sonner";
import { Textarea } from "@/components/ui/textarea";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function ProhibitedItemsManager() {
  const { language } = useLanguage();
  const [items, setItems] = useState([]);
  const [expandedCategories, setExpandedCategories] = useState({});
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    name_ar: "",
    name_en: "",
    category: "other",
    severity: "medium",
    exception_note_ar: "",
    exception_note_en: ""
  });

  const categories = [
    { value: "weapons", label_ar: "أسلحة", label_en: "Weapons", color: "bg-red-500" },
    { value: "electronics", label_ar: "إلكترونيات", label_en: "Electronics", color: "bg-blue-500" },
    { value: "dangerous", label_ar: "مواد خطرة", label_en: "Dangerous Materials", color: "bg-orange-500" },
    { value: "sharp", label_ar: "أدوات حادة", label_en: "Sharp Objects", color: "bg-red-400" },
    { value: "food", label_ar: "مواد غذائية", label_en: "Food Items", color: "bg-yellow-500" },
    { value: "luggage", label_ar: "أمتعة", label_en: "Luggage", color: "bg-gray-500" },
    { value: "vehicles", label_ar: "مركبات", label_en: "Vehicles", color: "bg-purple-500" },
    { value: "other", label_ar: "أخرى", label_en: "Other", color: "bg-pink-500" }
  ];

  useEffect(() => {
    fetchItems();
  }, []);

  const fetchItems = async () => {
    try {
      const response = await axios.get(`${API}/prohibited-items`);
      setItems(response.data);
    } catch (error) {
      console.error("Error fetching items:", error);
    } finally {
      setLoading(false);
    }
  };

  const toggleCategory = (category) => {
    setExpandedCategories(prev => ({
      ...prev,
      [category]: !prev[category]
    }));
  };

  const handleOpenDialog = (item = null) => {
    if (item) {
      setSelectedItem(item);
      setFormData({
        name_ar: item.name_ar,
        name_en: item.name_en,
        category: item.category,
        severity: item.severity,
        exception_note_ar: item.exception_note_ar || "",
        exception_note_en: item.exception_note_en || ""
      });
    } else {
      setSelectedItem(null);
      setFormData({
        name_ar: "",
        name_en: "",
        category: "other",
        severity: "medium",
        exception_note_ar: "",
        exception_note_en: ""
      });
    }
    setDialogOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.name_ar || !formData.name_en) {
      toast.error(language === 'ar' ? 'يرجى ملء الحقول المطلوبة' : 'Please fill required fields');
      return;
    }

    try {
      setSubmitting(true);
      const token = localStorage.getItem("token");
      
      if (selectedItem) {
        // Update existing (not implemented in backend yet, need PUT endpoint)
        toast.info(language === 'ar' ? 'التعديل قيد التطوير' : 'Edit under development');
      } else {
        await axios.post(`${API}/admin/prohibited-items`, formData, {
          headers: { Authorization: `Bearer ${token}` }
        });
        toast.success(language === 'ar' ? 'تمت الإضافة بنجاح' : 'Added successfully');
      }
      
      setDialogOpen(false);
      fetchItems();
    } catch (error) {
      console.error("Error saving item:", error);
      toast.error(language === 'ar' ? 'فشل الحفظ' : 'Failed to save');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    try {
      setSubmitting(true);
      const token = localStorage.getItem("token");
      
      await axios.delete(`${API}/admin/prohibited-items/${selectedItem.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      toast.success(language === 'ar' ? 'تم الحذف بنجاح' : 'Deleted successfully');
      setDeleteDialogOpen(false);
      fetchItems();
    } catch (error) {
      console.error("Error deleting item:", error);
      toast.error(language === 'ar' ? 'فشل الحذف' : 'Failed to delete');
    } finally {
      setSubmitting(false);
    }
  };

  const groupedItems = items.reduce((acc, item) => {
    if (!acc[item.category]) acc[item.category] = [];
    acc[item.category].push(item);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <Button onClick={() => handleOpenDialog()} className="bg-primary">
          <Plus className="w-4 h-4 ml-2" />
          {language === 'ar' ? 'إضافة ممنوع جديد' : 'Add Prohibited Item'}
        </Button>
        <div className="text-right flex-1">
          <CardTitle className="font-cairo text-xl flex items-center gap-2 justify-end">
            <ShieldAlert className="w-5 h-5" />
            {language === 'ar' ? 'إدارة الممنوعات' : 'Prohibited Items Management'}
          </CardTitle>
          <CardDescription className="text-right mt-1">
            {language === 'ar' 
              ? 'إضافة وتعديل وحذف الأشياء الممنوعة'
              : 'Add, edit and delete prohibited items'
            }
          </CardDescription>
        </div>
      </div>

      {/* Accordion List */}
      <div className="space-y-3">
        {categories.map((category) => {
          const categoryItems = groupedItems[category.value] || [];
          const isExpanded = expandedCategories[category.value];
          
          return (
            <Card key={category.value}>
              <CardHeader 
                className="cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => toggleCategory(category.value)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-lg ${category.color} flex items-center justify-center`}>
                      <ShieldAlert className="w-5 h-5 text-white" />
                    </div>
                    <div className="text-right">
                      <CardTitle className="font-cairo text-base">
                        {language === 'ar' ? category.label_ar : category.label_en}
                      </CardTitle>
                      <p className="text-xs text-muted-foreground">
                        {categoryItems.length} {language === 'ar' ? 'عنصر' : 'items'}
                      </p>
                    </div>
                  </div>
                  <ChevronDown 
                    className={`w-5 h-5 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                  />
                </div>
              </CardHeader>
              
              {isExpanded && (
                <CardContent className="space-y-2">
                  {categoryItems.map((item) => (
                    <div 
                      key={item.id}
                      className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50"
                    >
                      <div className="text-right flex-1">
                        <p className="font-medium text-sm">
                          {language === 'ar' ? item.name_ar : item.name_en}
                        </p>
                        {item.exception_note_ar && (
                          <p className="text-xs text-muted-foreground mt-1">
                            ⚠️ {language === 'ar' ? item.exception_note_ar : item.exception_note_en}
                          </p>
                        )}
                        <div className="mt-2">
                          <Badge variant="outline" className="text-xs">
                            {item.severity === 'high' && (language === 'ar' ? 'خطورة عالية' : 'High')}
                            {item.severity === 'medium' && (language === 'ar' ? 'متوسطة' : 'Medium')}
                            {item.severity === 'low' && (language === 'ar' ? 'منخفضة' : 'Low')}
                          </Badge>
                        </div>
                      </div>
                      <div className="flex gap-2">
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
                          className="text-destructive"
                          onClick={() => {
                            setSelectedItem(item);
                            setDeleteDialogOpen(true);
                          }}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                  
                  {categoryItems.length === 0 && (
                    <p className="text-center text-muted-foreground py-4 text-sm">
                      {language === 'ar' ? 'لا توجد عناصر' : 'No items'}
                    </p>
                  )}
                </CardContent>
              )}
            </Card>
          );
        })}
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="font-cairo text-right">
              {selectedItem 
                ? (language === 'ar' ? 'تعديل ممنوع' : 'Edit Item')
                : (language === 'ar' ? 'إضافة ممنوع جديد' : 'Add New Item')
              }
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4" dir="rtl">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-right block mb-2">{language === 'ar' ? 'الاسم (عربي)' : 'Name (Arabic)'}</Label>
                <Input
                  value={formData.name_ar}
                  onChange={(e) => setFormData({...formData, name_ar: e.target.value})}
                  placeholder="مثال: الأسلحة النارية"
                  className="text-right"
                  required
                />
              </div>
              <div>
                <Label className="text-right block mb-2">{language === 'ar' ? 'الاسم (إنجليزي)' : 'Name (English)'}</Label>
                <Input
                  value={formData.name_en}
                  onChange={(e) => setFormData({...formData, name_en: e.target.value})}
                  placeholder="Example: Firearms"
                  className="text-right"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-right block mb-2">{language === 'ar' ? 'التصنيف' : 'Category'}</Label>
                <Select value={formData.category} onValueChange={(v) => setFormData({...formData, category: v})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map(cat => (
                      <SelectItem key={cat.value} value={cat.value}>
                        {language === 'ar' ? cat.label_ar : cat.label_en}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-right block mb-2">{language === 'ar' ? 'مستوى الخطورة' : 'Severity'}</Label>
                <Select value={formData.severity} onValueChange={(v) => setFormData({...formData, severity: v})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="high">{language === 'ar' ? 'عالية' : 'High'}</SelectItem>
                    <SelectItem value="medium">{language === 'ar' ? 'متوسطة' : 'Medium'}</SelectItem>
                    <SelectItem value="low">{language === 'ar' ? 'منخفضة' : 'Low'}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label className="text-right block mb-2">{language === 'ar' ? 'ملاحظة الاستثناء (عربي)' : 'Exception Note (Arabic)'}</Label>
              <Textarea
                value={formData.exception_note_ar}
                onChange={(e) => setFormData({...formData, exception_note_ar: e.target.value})}
                placeholder="مثال: إلا بإذن مسبق من الإدارة"
                className="text-right"
                rows={2}
              />
            </div>

            <div>
              <Label className="text-right block mb-2">{language === 'ar' ? 'ملاحظة الاستثناء (إنجليزي)' : 'Exception Note (English)'}</Label>
              <Textarea
                value={formData.exception_note_en}
                onChange={(e) => setFormData({...formData, exception_note_en: e.target.value})}
                placeholder="Example: Except with prior permission"
                className="text-right"
                rows={2}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
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
            <DialogTitle className="font-cairo text-right">
              {language === 'ar' ? 'تأكيد الحذف' : 'Confirm Deletion'}
            </DialogTitle>
            <DialogDescription className="text-right">
              {language === 'ar' 
                ? `هل أنت متأكد من حذف "${selectedItem?.name_ar}"؟`
                : `Are you sure you want to delete "${selectedItem?.name_en}"?`
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
