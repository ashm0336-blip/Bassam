import { useState, useEffect } from "react";
import axios from "axios";
import { useLanguage } from "@/context/LanguageContext";
import { ShieldAlert, AlertTriangle, Smartphone, Flame, Sword, UtensilsCrossed, Luggage, Bike, PawPrint } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const categoryIcons = {
  weapons: { icon: Sword, color: "bg-red-500" },
  electronics: { icon: Smartphone, color: "bg-blue-500" },
  dangerous: { icon: Flame, color: "bg-orange-500" },
  sharp: { icon: Sword, color: "bg-red-400" },
  food: { icon: UtensilsCrossed, color: "bg-yellow-500" },
  luggage: { icon: Luggage, color: "bg-gray-500" },
  vehicles: { icon: Bike, color: "bg-purple-500" },
  other: { icon: PawPrint, color: "bg-pink-500" }
};

export default function ProhibitedItems() {
  const { language } = useLanguage();
  const [items, setItems] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchItems();
  }, [selectedCategory]);

  const fetchItems = async () => {
    try {
      const url = selectedCategory === "all" 
        ? `${API}/prohibited-items`
        : `${API}/prohibited-items?category=${selectedCategory}`;
      
      const response = await axios.get(url);
      setItems(response.data);
    } catch (error) {
      console.error("Error fetching prohibited items:", error);
    } finally {
      setLoading(false);
    }
  };

  const categories = Object.keys(categoryIcons);
  const groupedItems = items.reduce((acc, item) => {
    if (!acc[item.category]) acc[item.category] = [];
    acc[item.category].push(item);
    return acc;
  }, {});

  const severityColors = {
    high: "bg-red-100 text-red-800 border-red-200",
    medium: "bg-yellow-100 text-yellow-800 border-yellow-200",
    low: "bg-green-100 text-green-800 border-green-200"
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="text-right flex-1">
          <CardTitle className="font-cairo text-xl flex items-center gap-2 justify-end">
            <ShieldAlert className="w-5 h-5" />
            {language === 'ar' ? 'الأشياء الممنوعة' : 'Prohibited Items'}
          </CardTitle>
          <CardDescription className="text-right mt-1">
            {language === 'ar' 
              ? 'قائمة الأشياء الممنوع إدخالها للمسجد الحرام'
              : 'List of prohibited items in the Grand Mosque'
            }
          </CardDescription>
        </div>
        <Badge variant="outline" className="text-lg px-4 py-2">
          {items.length} {language === 'ar' ? 'عنصر' : 'items'}
        </Badge>
      </div>

      {/* Filter */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-3">
            <label className="text-sm font-medium">{language === 'ar' ? 'التصنيف:' : 'Category:'}</label>
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{language === 'ar' ? 'الكل' : 'All'} ({items.length})</SelectItem>
                {categories.map(cat => (
                  <SelectItem key={cat} value={cat}>
                    {cat} ({groupedItems[cat]?.length || 0})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Items List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Object.entries(groupedItems).map(([category, categoryItems]) => {
          const { icon: Icon, color } = categoryIcons[category] || categoryIcons.other;
          
          return (
            <Card key={category}>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg ${color} flex items-center justify-center`}>
                    <Icon className="w-5 h-5 text-white" />
                  </div>
                  <CardTitle className="font-cairo text-base capitalize">{category}</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {categoryItems.map((item) => (
                    <div 
                      key={item.id}
                      className={`p-3 rounded-lg border ${severityColors[item.severity]}`}
                    >
                      <div className="text-right">
                        <p className="font-medium text-sm">
                          {language === 'ar' ? item.name_ar : item.name_en}
                        </p>
                        {item.exception_note_ar && (
                          <p className="text-xs mt-1 opacity-75">
                            ⚠️ {language === 'ar' ? item.exception_note_ar : item.exception_note_en}
                          </p>
                        )}
                        <Badge variant="outline" className="mt-2 text-xs">
                          {item.severity === 'high' && (language === 'ar' ? 'خطورة عالية' : 'High Risk')}
                          {item.severity === 'medium' && (language === 'ar' ? 'متوسطة' : 'Medium')}
                          {item.severity === 'low' && (language === 'ar' ? 'منخفضة' : 'Low')}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
