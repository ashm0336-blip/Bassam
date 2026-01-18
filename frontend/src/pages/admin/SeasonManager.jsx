import { useState, useEffect } from "react";
import axios from "axios";
import { useLanguage } from "@/context/LanguageContext";
import { Calendar, Plus, Trash2, AlertTriangle, CheckCircle, XCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function SeasonManager() {
  const { language } = useLanguage();
  const [currentSeason, setCurrentSeason] = useState("normal");
  const [activeGates, setActiveGates] = useState(0);
  const [loading, setLoading] = useState(true);
  const [changing, setChanging] = useState(false);

  useEffect(() => {
    fetchSeason();
  }, []);

  const fetchSeason = async () => {
    try {
      const response = await axios.get(`${API}/settings/season`);
      setCurrentSeason(response.data.current_season);
      setActiveGates(response.data.active_gates_count);
    } catch (error) {
      console.error("Error fetching season:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSeasonChange = async (newSeason) => {
    try {
      setChanging(true);
      const token = localStorage.getItem("token");
      
      const response = await axios.put(
        `${API}/admin/settings/season?season_name=${newSeason}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      setCurrentSeason(newSeason);
      setActiveGates(response.data.active_gates);
      toast.success(language === 'ar' ? response.data.message : `Season ${newSeason} activated`);
      
      // Reload page to update gates
      setTimeout(() => window.location.reload(), 1500);
    } catch (error) {
      console.error("Error changing season:", error);
      toast.error(language === 'ar' ? "فشل تغيير الموسم" : "Failed to change season");
    } finally {
      setChanging(false);
    }
  };

  const seasons = [
    { value: "normal", label_ar: "عادي", label_en: "Normal", icon: "🏛️", color: "bg-gray-500" },
    { value: "umrah", label_ar: "عمرة", label_en: "Umrah", icon: "🕋", color: "bg-blue-500" },
    { value: "ramadan", label_ar: "رمضان", label_en: "Ramadan", icon: "🌙", color: "bg-purple-500" },
    { value: "hajj", label_ar: "حج", label_en: "Hajj", icon: "🕌", color: "bg-green-500" }
  ];

  const currentSeasonInfo = seasons.find(s => s.value === currentSeason);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-right">
        <CardTitle className="font-cairo text-xl flex items-center gap-2 justify-end">
          <Calendar className="w-5 h-5" />
          {language === 'ar' ? 'إدارة المواسم' : 'Season Management'}
        </CardTitle>
        <CardDescription className="text-right mt-1">
          {language === 'ar' 
            ? 'تفعيل وتعطيل الأبواب حسب الموسم الحالي'
            : 'Activate and deactivate gates based on current season'
          }
        </CardDescription>
      </div>

      {/* Current Season */}
      <Card className="bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20">
        <CardHeader>
          <CardTitle className="font-cairo text-base text-right">
            {language === 'ar' ? 'الموسم الحالي' : 'Current Season'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="text-right flex-1">
              <div className="flex items-center gap-3 justify-end mb-2">
                <span className="text-3xl">{currentSeasonInfo?.icon}</span>
                <h2 className="text-2xl font-cairo font-bold">
                  {language === 'ar' ? currentSeasonInfo?.label_ar : currentSeasonInfo?.label_en}
                </h2>
              </div>
              <p className="text-sm text-muted-foreground">
                {language === 'ar' 
                  ? `${activeGates} باب مفتوح حالياً`
                  : `${activeGates} gates currently open`
                }
              </p>
            </div>
            <Badge className={`${currentSeasonInfo?.color} text-white text-lg px-4 py-2`}>
              {language === 'ar' ? 'نشط' : 'Active'}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Season Selector */}
      <Card>
        <CardHeader>
          <CardTitle className="font-cairo text-base text-right">
            {language === 'ar' ? 'تغيير الموسم' : 'Change Season'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {seasons.map((season) => (
              <button
                key={season.value}
                onClick={() => handleSeasonChange(season.value)}
                disabled={changing || currentSeason === season.value}
                className={`p-6 rounded-lg border-2 transition-all ${
                  currentSeason === season.value
                    ? 'border-primary bg-primary/10'
                    : 'border-gray-200 hover:border-primary/50 hover:bg-primary/5'
                } ${changing ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
              >
                <div className="text-center">
                  <div className="text-4xl mb-2">{season.icon}</div>
                  <p className="font-cairo font-bold text-lg">
                    {language === 'ar' ? season.label_ar : season.label_en}
                  </p>
                  {currentSeason === season.value && (
                    <Badge variant="default" className="mt-2">
                      {language === 'ar' ? 'نشط' : 'Active'}
                    </Badge>
                  )}
                </div>
              </button>
            ))}
          </div>
          
          <div className="mt-6 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 rounded-lg">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-yellow-800 dark:text-yellow-200">
                  {language === 'ar' ? 'تنبيه' : 'Warning'}
                </p>
                <p className="text-yellow-700 dark:text-yellow-300 mt-1">
                  {language === 'ar' 
                    ? 'تغيير الموسم سيقوم بفتح/إغلاق الأبواب تلقائياً حسب التشغيل المخصص لكل موسم'
                    : 'Changing the season will automatically open/close gates based on their operational schedule'
                  }
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Season Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="font-cairo text-sm text-right">
              {language === 'ar' ? 'معلومات المواسم' : 'Season Information'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm" dir="rtl">
            <div className="flex justify-between items-center">
              <span className="font-bold">83 باب</span>
              <span className="text-muted-foreground">العمرة</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="font-bold">101 باب</span>
              <span className="text-muted-foreground">رمضان</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="font-bold">147 باب</span>
              <span className="text-muted-foreground">الحج</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="font-cairo text-sm text-right">
              {language === 'ar' ? 'الأبواب حسب الموسم الحالي' : 'Gates by Current Season'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3" dir="rtl">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-600" />
              <span className="text-sm">
                {language === 'ar' ? `${activeGates} باب مفتوح` : `${activeGates} gates open`}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <XCircle className="w-4 h-4 text-red-600" />
              <span className="text-sm">
                {language === 'ar' ? `${17 - activeGates} باب مغلق` : `${17 - activeGates} gates closed`}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
