import { useState, useEffect } from "react";
import axios from "axios";
import { useLanguage } from "@/context/LanguageContext";
import { MapPin, Users, DoorOpen, Navigation, Plus, Settings as SettingsIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

// Default map image
const DEFAULT_MAP = "https://images.unsplash.com/photo-1564769625905-50e93615e769?w=1920&h=1080&fit=crop";

export default function InteractiveMapPage() {
  const { language } = useLanguage();
  const [maps, setMaps] = useState([]);
  const [selectedMap, setSelectedMap] = useState(null);
  const [markers, setMarkers] = useState([]);
  const [selectedMarker, setSelectedMarker] = useState(null);
  const [filterType, setFilterType] = useState("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMaps();
  }, []);

  useEffect(() => {
    if (selectedMap) {
      fetchMarkers(selectedMap.id);
    }
  }, [selectedMap, filterType]);

  const fetchMaps = async () => {
    try {
      const response = await axios.get(`${API}/maps?department=gates`);
      setMaps(response.data);
      if (response.data.length > 0) {
        setSelectedMap(response.data[0]);
      }
    } catch (error) {
      console.error("Error fetching maps:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMarkers = async (mapId) => {
    try {
      const url = filterType === "all" 
        ? `${API}/maps/${mapId}/markers`
        : `${API}/maps/${mapId}/markers?type=${filterType}`;
      
      const response = await axios.get(url);
      setMarkers(response.data);
    } catch (error) {
      console.error("Error fetching markers:", error);
    }
  };

  const handleMarkerClick = (marker) => {
    setSelectedMarker(marker);
  };

  const getMarkerIcon = (type) => {
    switch(type) {
      case 'gate': return DoorOpen;
      case 'employee': return Users;
      case 'plaza': return Navigation;
      default: return MapPin;
    }
  };

  const filteredMarkers = filterType === "all" 
    ? markers 
    : markers.filter(m => m.type === filterType);

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">جاري التحميل...</div>;
  }

  return (
    <div className="space-y-6" data-testid="map-page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="text-right flex-1">
          <h1 className="font-cairo font-bold text-2xl text-right">
            {language === 'ar' ? 'الخريطة التفاعلية' : 'Interactive Map'}
          </h1>
          <p className="text-sm text-muted-foreground mt-1 text-right">
            {language === 'ar' ? 'عرض مواقع الأبواب والموظفين في الوقت الفعلي' : 'Real-time view of gates and employees locations'}
          </p>
        </div>
        <div className="flex gap-2">
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{language === 'ar' ? 'الكل' : 'All'}</SelectItem>
              <SelectItem value="gate">{language === 'ar' ? 'الأبواب' : 'Gates'}</SelectItem>
              <SelectItem value="employee">{language === 'ar' ? 'الموظفين' : 'Employees'}</SelectItem>
              <SelectItem value="plaza">{language === 'ar' ? 'الساحات' : 'Plazas'}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Map View */}
        <div className="lg:col-span-3">
          <Card>
            <CardContent className="p-0">
              <div className="relative w-full" style={{ paddingBottom: '56.25%' }}>
                <div className="absolute inset-0">
                  <img 
                    src={selectedMap?.image_url || DEFAULT_MAP}
                    alt="Map"
                    className="w-full h-full object-cover rounded-lg"
                  />
                  
                  {/* Markers */}
                  {filteredMarkers.map((marker) => {
                    const Icon = getMarkerIcon(marker.type);
                    return (
                      <button
                        key={marker.id}
                        onClick={() => handleMarkerClick(marker)}
                        className="absolute transform -translate-x-1/2 -translate-y-1/2 transition-all hover:scale-125"
                        style={{
                          left: `${marker.x}%`,
                          top: `${marker.y}%`,
                        }}
                      >
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center shadow-lg ${
                          selectedMarker?.id === marker.id ? 'ring-4 ring-white' : ''
                        }`}
                        style={{ backgroundColor: marker.color }}
                        >
                          <Icon className="w-5 h-5 text-white" />
                        </div>
                        {marker.show_label && (
                          <div className="absolute top-full mt-1 bg-black/80 text-white text-xs px-2 py-1 rounded whitespace-nowrap">
                            {language === 'ar' ? marker.label_ar : marker.label_en}
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Legend */}
          <div className="flex gap-4 mt-4 flex-wrap">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-primary" />
              <span className="text-sm">{language === 'ar' ? 'أبواب' : 'Gates'} ({markers.filter(m => m.type === 'gate').length})</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-secondary" />
              <span className="text-sm">{language === 'ar' ? 'موظفين' : 'Employees'} ({markers.filter(m => m.type === 'employee').length})</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-blue-500" />
              <span className="text-sm">{language === 'ar' ? 'ساحات' : 'Plazas'} ({markers.filter(m => m.type === 'plaza').length})</span>
            </div>
          </div>
        </div>

        {/* Sidebar - Marker Details */}
        <div className="lg:col-span-1">
          <Card className="sticky top-20">
            <CardHeader>
              <CardTitle className="font-cairo text-base text-right">
                {selectedMarker 
                  ? (language === 'ar' ? 'تفاصيل النقطة' : 'Marker Details')
                  : (language === 'ar' ? 'اختر نقطة على الخريطة' : 'Select a marker on the map')
                }
              </CardTitle>
            </CardHeader>
            <CardContent>
              {selectedMarker ? (
                <div className="space-y-4" dir="rtl">
                  <div>
                    <p className="text-sm font-medium text-right">
                      {language === 'ar' ? selectedMarker.label_ar : selectedMarker.label_en}
                    </p>
                    <Badge variant="outline" className="mt-2">
                      {selectedMarker.type === 'gate' && (language === 'ar' ? 'باب' : 'Gate')}
                      {selectedMarker.type === 'employee' && (language === 'ar' ? 'موظف' : 'Employee')}
                      {selectedMarker.type === 'plaza' && (language === 'ar' ? 'ساحة' : 'Plaza')}
                    </Badge>
                  </div>

                  {selectedMarker.live_data && (
                    <>
                      {selectedMarker.type === 'gate' && (
                        <div className="space-y-3 pt-4 border-t">
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">{language === 'ar' ? 'الحالة' : 'Status'}:</span>
                            <Badge>{selectedMarker.live_data.status}</Badge>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">{language === 'ar' ? 'التدفق الحالي' : 'Current Flow'}:</span>
                            <span className="font-medium">{selectedMarker.live_data.current_flow}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">{language === 'ar' ? 'السعة القصوى' : 'Max Capacity'}:</span>
                            <span className="font-medium">{selectedMarker.live_data.max_flow}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">{language === 'ar' ? 'المؤشر' : 'Indicator'}:</span>
                            <Badge variant="secondary">{selectedMarker.live_data.current_indicator}</Badge>
                          </div>
                        </div>
                      )}

                      {selectedMarker.type === 'employee' && selectedMarker.live_data && (
                        <div className="space-y-3 pt-4 border-t">
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">{language === 'ar' ? 'الاسم' : 'Name'}:</span>
                            <span className="font-medium">{selectedMarker.live_data.name}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">{language === 'ar' ? 'الوظيفة' : 'Job'}:</span>
                            <span className="font-medium">{selectedMarker.live_data.job_title}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">{language === 'ar' ? 'الوردية' : 'Shift'}:</span>
                            <Badge>{selectedMarker.live_data.shift}</Badge>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">{language === 'ar' ? 'الحالة' : 'Status'}:</span>
                            <Badge variant={selectedMarker.live_data.is_active ? "default" : "secondary"}>
                              {selectedMarker.live_data.is_active ? (language === 'ar' ? 'نشط' : 'Active') : (language === 'ar' ? 'غير نشط' : 'Inactive')}
                            </Badge>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-8">
                  {language === 'ar' ? 'اضغط على أي نقطة لعرض التفاصيل' : 'Click any marker to view details'}
                </p>
              )}
            </CardContent>
          </Card>

          {/* Quick Stats */}
          <Card className="mt-4">
            <CardHeader>
              <CardTitle className="font-cairo text-sm text-right">
                {language === 'ar' ? 'إحصائيات سريعة' : 'Quick Stats'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">{language === 'ar' ? 'إجمالي النقاط' : 'Total Markers'}:</span>
                <span className="font-bold">{markers.length}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">{language === 'ar' ? 'الأبواب' : 'Gates'}:</span>
                <span className="font-bold">{markers.filter(m => m.type === 'gate').length}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">{language === 'ar' ? 'الموظفين' : 'Employees'}:</span>
                <span className="font-bold">{markers.filter(m => m.type === 'employee').length}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
