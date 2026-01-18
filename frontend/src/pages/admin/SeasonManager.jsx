import { useState, useEffect } from "react";
import axios from "axios";
import { useLanguage } from "@/context/LanguageContext";
import { 
  Calendar, 
  Save, 
  Loader2,
  CheckCircle,
  XCircle,
  Settings as SettingsIcon
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function SeasonManager() {
  const { language } = useLanguage();
  const [currentSeason, setCurrentSeason] = useState("normal");
  const [gates, setGates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [changing, setChanging] = useState(false);
  const [editMode, setEditMode] = useState(false);

  useEffect(() => {
    fetchSeason();
    fetchGates();
  }, []);

  const fetchSeason = async () => {
    try {
      const response = await axios.get(`${API}/settings/season`);
      setCurrentSeason(response.data.current_season);
    } catch (error) {
      console.error("Error fetching season:", error);
    }
  };

  const fetchGates = async () => {
    try {
      const response = await axios.get(`${API}/gates`);
      setGates(response.data);
    } catch (error) {
      console.error("Error fetching gates:", error);
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
      toast.success(language === 'ar' ? response.data.message : `Season ${newSeason} activated`);
      
      // Refresh gates
      fetchGates();
    } catch (error) {
      console.error("Error changing season:", error);
      toast.error(language === 'ar' ? "فشل تغيير الموسم" : "Failed to change season");
    } finally {
      setChanging(false);
    }
  };

  const handleToggleSeason = async (gateId, season, currentValue) => {
    try {
      const token = localStorage.getItem("token");
      const gate = gates.find(g => g.id === gateId);
      let newSeasons = gate.operational_seasons || [];
      
      if (currentValue) {
        // Remove season
        newSeasons = newSeasons.filter(s => s !== season);
      } else {
        // Add season
        newSeasons = [...newSeasons, season];
      }
      
      await axios.put(
        `${API}/admin/gates/${gateId}`,
        { operational_seasons: newSeasons },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      toast.success(language === 'ar' ? 'تم التحديث' : 'Updated');
      fetchGates();
    } catch (error) {
      console.error("Error updating gate seasons:", error);
      toast.error(language === 'ar' ? 'فشل التحديث' : 'Failed to update');
    }
  };

  const seasons = [
    { value: "normal", label_ar: "عادي", label_en: "Normal", icon: "🏛️", color: "bg-gray-500" },
    { value: "umrah", label_ar: "عمرة", label_en: "Umrah", icon: "🕋", color: "bg-blue-500" },
    { value: "ramadan", label_ar: "رمضان", label_en: "Ramadan", icon: "🌙", color: "bg-purple-500" },
    { value: "hajj", label_ar: "حج", label_en: "Hajj", icon: "🕌", color: "bg-green-500" }
  ];

  const currentSeasonInfo = seasons.find(s => s.value === currentSeason);
  const activeGates = gates.filter(g => g.status === 'مفتوح').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <Button 
          variant={editMode ? "default" : "outline"}
          onClick={() => setEditMode(!editMode)}
        >
          <SettingsIcon className="w-4 h-4 ml-2" />
          {editMode 
            ? (language === 'ar' ? 'إنهاء التعديل' : 'Finish Editing')
            : (language === 'ar' ? 'تعديل المواسم' : 'Edit Seasons')
          }
        </Button>
        <div className="text-right flex-1">
          <CardTitle className="font-cairo text-xl flex items-center gap-2 justify-end">
            <Calendar className="w-5 h-5" />
            {language === 'ar' ? 'إدارة المواسم' : 'Season Management'}
          </CardTitle>
          <CardDescription className="text-right mt-1">
            {language === 'ar' 
              ? 'تفعيل المواسم وتحديد الأبواب التشغيلية'
              : 'Activate seasons and configure operational gates'
            }
          </CardDescription>
        </div>
      </div>

      {/* Current Season */}
      <Card className="bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20">
        <CardHeader>
          <CardTitle className="font-cairo text-base text-right">
            {language === 'ar' ? 'الموسم الحالي' : 'Current Season'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between" dir="rtl">
            <div className="text-right">
              <div className="flex items-center gap-3 mb-2">
                <span className="text-3xl">{currentSeasonInfo?.icon}</span>
                <h2 className="text-2xl font-cairo font-bold">
                  {language === 'ar' ? currentSeasonInfo?.label_ar : currentSeasonInfo?.label_en}
                </h2>
              </div>
              <p className="text-sm text-muted-foreground">
                {language === 'ar' 
                  ? `${activeGates} باب مفتوح من ${gates.length}`
                  : `${activeGates} gates open out of ${gates.length}`
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
                    : 'border-gray-200 hover:border-primary/50'
                } ${changing ? 'opacity-50' : ''}`}
              >
                <div className="text-center">
                  <div className="text-4xl mb-2">{season.icon}</div>
                  <p className="font-cairo font-bold">
                    {language === 'ar' ? season.label_ar : season.label_en}
                  </p>
                  {currentSeason === season.value && (
                    <Badge className="mt-2">{language === 'ar' ? 'نشط' : 'Active'}</Badge>
                  )}
                </div>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Gates Configuration */}
      {editMode && (
        <Card>
          <CardHeader>
            <CardTitle className="font-cairo text-base text-right">
              {language === 'ar' ? 'تكوين الأبواب للمواسم' : 'Gates Configuration for Seasons'}
            </CardTitle>
            <CardDescription className="text-right">
              {language === 'ar' 
                ? 'حدد المواسم التي يعمل فيها كل باب'
                : 'Select which seasons each gate operates in'
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-right">{language === 'ar' ? 'الباب' : 'Gate'}</TableHead>
                    <TableHead className="text-center">{language === 'ar' ? 'عمرة' : 'Umrah'}</TableHead>
                    <TableHead className="text-center">{language === 'ar' ? 'رمضان' : 'Ramadan'}</TableHead>
                    <TableHead className="text-center">{language === 'ar' ? 'حج' : 'Hajj'}</TableHead>
                    <TableHead className="text-center">{language === 'ar' ? 'الحالة' : 'Status'}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {gates.map((gate) => {
                    const operationalSeasons = gate.operational_seasons || [];
                    
                    return (
                      <TableRow key={gate.id}>
                        <TableCell className="text-right font-medium">
                          {gate.name}
                          <br />
                          <span className="text-xs text-muted-foreground">{gate.plaza}</span>
                        </TableCell>
                        <TableCell className="text-center">
                          <Switch
                            checked={operationalSeasons.includes('umrah')}
                            onCheckedChange={() => handleToggleSeason(gate.id, 'umrah', operationalSeasons.includes('umrah'))}
                          />
                        </TableCell>
                        <TableCell className="text-center">
                          <Switch
                            checked={operationalSeasons.includes('ramadan')}
                            onCheckedChange={() => handleToggleSeason(gate.id, 'ramadan', operationalSeasons.includes('ramadan'))}
                          />
                        </TableCell>
                        <TableCell className="text-center">
                          <Switch
                            checked={operationalSeasons.includes('hajj')}
                            onCheckedChange={() => handleToggleSeason(gate.id, 'hajj', operationalSeasons.includes('hajj'))}
                          />
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant={gate.status === 'مفتوح' ? 'default' : 'secondary'}>
                            {gate.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
