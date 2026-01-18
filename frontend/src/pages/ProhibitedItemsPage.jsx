import { useState, useEffect } from "react";
import axios from "axios";
import { useLanguage } from "@/context/LanguageContext";
import { 
  ShieldAlert, 
  Smartphone, 
  Flame, 
  Sword, 
  UtensilsCrossed, 
  Luggage, 
  Bike, 
  AlertTriangle,
  ChevronDown,
  Info
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function ProhibitedItemsPage() {
  const { language } = useLanguage();
  const [items, setItems] = useState([]);
  const [expandedCategories, setExpandedCategories] = useState({});
  const [loading, setLoading] = useState(true);

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

  const categories = [
    { 
      value: "weapons", 
      label_ar: "الأسلحة والمتفجرات", 
      label_en: "Weapons & Explosives", 
      icon: Sword, 
      color: "bg-red-500",
      gradient: "from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-800/20"
    },
    { 
      value: "electronics", 
      label_ar: "الأجهزة الإلكترونية", 
      label_en: "Electronic Devices", 
      icon: Smartphone, 
      color: "bg-blue-500",
      gradient: "from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20"
    },
    { 
      value: "dangerous", 
      label_ar: "المواد الخطرة", 
      label_en: "Dangerous Materials", 
      icon: Flame, 
      color: "bg-orange-500",
      gradient: "from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20"
    },
    { 
      value: "sharp", 
      label_ar: "الأدوات الحادة", 
      label_en: "Sharp Objects", 
      icon: Sword, 
      color: "bg-red-400",
      gradient: "from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-800/20"
    },
    { 
      value: "food", 
      label_ar: "المواد الغذائية", 
      label_en: "Food Items", 
      icon: UtensilsCrossed, 
      color: "bg-yellow-500",
      gradient: "from-yellow-50 to-yellow-100 dark:from-yellow-900/20 dark:to-yellow-800/20"
    },
    { 
      value: "luggage", 
      label_ar: "الأمتعة الكبيرة", 
      label_en: "Large Luggage", 
      icon: Luggage, 
      color: "bg-gray-500",
      gradient: "from-gray-50 to-gray-100 dark:from-gray-900/20 dark:to-gray-800/20"
    },
    { 
      value: "vehicles", 
      label_ar: "المركبات", 
      label_en: "Vehicles", 
      icon: Bike, 
      color: "bg-purple-500",
      gradient: "from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20"
    },
    { 
      value: "other", 
      label_ar: "أخرى", 
      label_en: "Other", 
      icon: AlertTriangle, 
      color: "bg-pink-500",
      gradient: "from-pink-50 to-pink-100 dark:from-pink-900/20 dark:to-pink-800/20"
    }
  ];

  const groupedItems = items.reduce((acc, item) => {
    if (!acc[item.category]) acc[item.category] = [];
    acc[item.category].push(item);
    return acc;
  }, {});

  return (
    <div className="space-y-6" data-testid="prohibited-items-page">
      {/* Header */}
      <div className="text-right">
        <h1 className="font-cairo font-bold text-2xl flex items-center gap-3 justify-end">
          <ShieldAlert className="w-7 h-7 text-destructive" />
          {language === 'ar' ? 'الأشياء الممنوعة في المسجد الحرام' : 'Prohibited Items in Grand Mosque'}
        </h1>
        <p className="text-sm text-muted-foreground mt-2">
          {language === 'ar' 
            ? 'قائمة شاملة بالأشياء الممنوع إدخالها للمسجد الحرام'
            : 'Comprehensive list of prohibited items in the Grand Mosque'
          }
        </p>
        <Badge variant="outline" className="mt-3">
          {items.length} {language === 'ar' ? 'عنصر ممنوع' : 'prohibited items'}
        </Badge>
      </div>

      {/* Info Card */}
      <Card className="bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 border-blue-200">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-blue-600 mt-0.5" />
            <div className="text-sm text-right flex-1">
              <p className="font-medium text-blue-900 dark:text-blue-100">
                {language === 'ar' ? 'تنبيه هام' : 'Important Notice'}
              </p>
              <p className="text-blue-800 dark:text-blue-200 mt-1">
                {language === 'ar' 
                  ? 'يُمنع إدخال هذه الأشياء للمسجد الحرام. بعض العناصر لها استثناءات بموافقة مسبقة من الجهات المختصة.'
                  : 'These items are prohibited from entering the Grand Mosque. Some items have exceptions with prior approval from relevant authorities.'
                }
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Accordion Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {categories.map((category) => {
          const categoryItems = groupedItems[category.value] || [];
          const isExpanded = expandedCategories[category.value];
          const Icon = category.icon;
          
          return (
            <Card 
              key={category.value}
              className="card-hover transition-all"
            >
              <CardHeader 
                className="cursor-pointer"
                onClick={() => toggleCategory(category.value)}
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className={`w-12 h-12 rounded-xl ${category.color} flex items-center justify-center shadow-lg`}>
                      <Icon className="w-6 h-6 text-white" />
                    </div>
                    <ChevronDown 
                      className={`w-5 h-5 text-muted-foreground transition-transform ${
                        isExpanded ? 'rotate-180' : ''
                      }`}
                    />
                  </div>
                  <div className="text-right">
                    <CardTitle className="font-cairo text-base">
                      {language === 'ar' ? category.label_ar : category.label_en}
                    </CardTitle>
                    <p className="text-xs text-muted-foreground mt-1">
                      {categoryItems.length} {language === 'ar' ? 'عنصر' : 'items'}
                    </p>
                  </div>
                </div>
              </CardHeader>
              
              {isExpanded && (
                <CardContent className="space-y-2 pt-0">
                  <div className="h-px bg-border mb-3" />
                  {categoryItems.map((item, idx) => (
                    <div 
                      key={item.id}
                      className={`p-3 rounded-lg bg-gradient-to-r ${category.gradient} border transition-all hover:shadow-md`}
                    >
                      <div className="text-right">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1">
                            <p className="font-medium text-sm">
                              {idx + 1}. {language === 'ar' ? item.name_ar : item.name_en}
                            </p>
                            {item.exception_note_ar && (
                              <div className="flex items-start gap-2 mt-2 p-2 bg-yellow-50 dark:bg-yellow-900/30 rounded border border-yellow-200">
                                <AlertTriangle className="w-3 h-3 text-yellow-600 mt-0.5 flex-shrink-0" />
                                <p className="text-xs text-yellow-800 dark:text-yellow-200">
                                  {language === 'ar' ? item.exception_note_ar : item.exception_note_en}
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="mt-2">
                          <Badge 
                            variant="outline" 
                            className={`text-xs ${
                              item.severity === 'high' ? 'border-red-300 text-red-700' :
                              item.severity === 'medium' ? 'border-yellow-300 text-yellow-700' :
                              'border-green-300 text-green-700'
                            }`}
                          >
                            {item.severity === 'high' && (language === 'ar' ? '🔴 خطورة عالية' : '🔴 High Risk')}
                            {item.severity === 'medium' && (language === 'ar' ? '🟡 متوسطة' : '🟡 Medium')}
                            {item.severity === 'low' && (language === 'ar' ? '🟢 منخفضة' : '🟢 Low')}
                          </Badge>
                        </div>
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
    </div>
  );
}
