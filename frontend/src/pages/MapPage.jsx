import { useState, useEffect } from "react";
import axios from "axios";
import { useLanguage } from "@/context/LanguageContext";
import { MapPin, Users, DoorOpen, Navigation, Plus, Settings as SettingsIcon, Loader2 } from "lucide-react";
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

// Default map image (Makkah aerial view)
const DEFAULT_MAP = "https://images.unsplash.com/photo-1564769625905-50e93615e769?w=1920&h=1080&fit=crop";

export default function MapPage() {
  const { language } = useLanguage();
  const [maps, setMaps] = useState([]);
  const [selectedMap, setSelectedMap] = useState(null);
  const [markers, setMarkers] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [selectedMarker, setSelectedMarker] = useState(null);
  const [filterType, setFilterType] = useState("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMaps();
    fetchEmployees();
  }, []);

  const fetchEmployees = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(`${API}/employees?department=gates`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setEmployees(response.data.filter(e => e.is_active));
    } catch (error) {
      console.error("Error fetching employees:", error);
    }
  };

  const getStaffCountAtLocation = (location) => {
    return employees.filter(emp => emp.location === location).length;
  };

  useEffect(() => {
    if (selectedMap) {
      fetchMarkers(selectedMap.id);
    }
  }, [selectedMap, filterType]);

  const fetchMaps = async () => {
    try {
      const response = await axios.get(`${API}/maps?department=gates`);
      
      if (response.data.length === 0) {
        // Create default map if none exists
        const token = localStorage.getItem("token");
        const defaultMapData = {
          name_ar: "خريطة إدارة الأبواب",
          name_en: "Gates Department Map",
          department: "gates",
          image_url: DEFAULT_MAP,
          width: 1920,
          height: 1080
        };
        
        const createRes = await axios.post(`${API}/admin/maps`, defaultMapData, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        setMaps([createRes.data]);
        setSelectedMap(createRes.data);
      } else {
        setMaps(response.data);
        setSelectedMap(response.data[0]);
      }
    } catch (error) {
      console.error("Error fetching maps:", error);
      // Use fallback
      setSelectedMap({
        id: 'default',
        name_ar: 'خريطة افتراضية',
        image_url: DEFAULT_MAP
      });
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
      setMarkers([]);
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
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="map-page">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="text-right">
          <h1 className="font-cairo font-bold text-2xl">
            {language === 'ar' ? 'الخريطة التفاعلية' : 'Interactive Map'}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
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
              <div className="relative w-full bg-gray-100 rounded-lg overflow-hidden" style={{ paddingBottom: '56.25%' }}>
                <div className="absolute inset-0">
                  <img 
                    src={selectedMap?.image_url || DEFAULT_MAP}
                    alt="Map"
                    className="w-full h-full object-cover"
                  />
                  
                  {/* Markers Overlay */}
                  {filteredMarkers.map((marker) => {
                    const Icon = getMarkerIcon(marker.type);
                    return (
                      <button
                        key={marker.id}
                        onClick={() => handleMarkerClick(marker)}
                        className="absolute transform -translate-x-1/2 -translate-y-1/2 transition-all hover:scale-125 z-10"
                        style={{
                          left: `${marker.x}%`,
                          top: `${marker.y}%`,
                        }}
                      >
                        <div 
                          className={`w-10 h-10 rounded-full flex items-center justify-center shadow-lg border-2 border-white ${
                            selectedMarker?.id === marker.id ? 'ring-4 ring-primary scale-125' : ''
                          }`}
                          style={{ backgroundColor: marker.color }}
                        >
                          <Icon className="w-5 h-5 text-white" />
                        </div>
                        {marker.show_label && (
                          <div className="absolute top-full mt-2 left-1/2 transform -translate-x-1/2 bg-black/90 text-white text-xs px-3 py-1.5 rounded-md whitespace-nowrap shadow-lg">
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
          <div className="flex gap-6 mt-4 flex-wrap justify-center">
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                <DoorOpen className="w-3 h-3 text-white" />
              </div>
              <span className="text-sm font-medium">{language === 'ar' ? 'أبواب' : 'Gates'} ({markers.filter(m => m.type === 'gate').length})</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-full bg-secondary flex items-center justify-center">
                <Users className="w-3 h-3 text-white" />
              </div>
              <span className="text-sm font-medium">{language === 'ar' ? 'موظفين' : 'Employees'} ({markers.filter(m => m.type === 'employee').length})</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center">
                <Navigation className="w-3 h-3 text-white" />
              </div>
              <span className="text-sm font-medium">{language === 'ar' ? 'ساحات' : 'Plazas'} ({markers.filter(m => m.type === 'plaza').length})</span>
            </div>
          </div>
        </div>

        {/* Sidebar - Marker Details */}
        <div className="lg:col-span-1 space-y-4">
          <Card className="sticky top-20">
            <CardHeader className="pb-3">
              <CardTitle className="font-cairo text-base text-right">
                {selectedMarker 
                  ? (language === 'ar' ? 'تفاصيل النقطة' : 'Marker Details')
                  : (language === 'ar' ? 'اختر نقطة على الخريطة' : 'Select a marker')
                }
              </CardTitle>
            </CardHeader>
            <CardContent>
              {selectedMarker ? (
                <div className="space-y-4" dir="rtl">
                  <div className="text-right">
                    <p className="text-base font-semibold mb-2">
                      {language === 'ar' ? selectedMarker.label_ar : selectedMarker.label_en}
                    </p>
                    <Badge variant="outline">
                      {selectedMarker.type === 'gate' && (language === 'ar' ? 'باب' : 'Gate')}
                      {selectedMarker.type === 'employee' && (language === 'ar' ? 'موظف' : 'Employee')}
                      {selectedMarker.type === 'plaza' && (language === 'ar' ? 'ساحة' : 'Plaza')}
                    </Badge>
                  </div>

                  {selectedMarker.live_data && (
                    <div className="space-y-3 pt-4 border-t">
                      {selectedMarker.type === 'gate' && (
                        <>
                          <div className="flex justify-between items-center text-sm">
                            <span className="font-medium">{selectedMarker.live_data.status || 'N/A'}</span>
                            <span className="text-muted-foreground">{language === 'ar' ? 'الحالة' : 'Status'}</span>
                          </div>
                          <div className="flex justify-between items-center text-sm">
                            <span className="font-bold text-lg">{selectedMarker.live_data.current_flow || 0}</span>
                            <span className="text-muted-foreground">{language === 'ar' ? 'التدفق الحالي' : 'Current Flow'}</span>
                          </div>
                          <div className="flex justify-between items-center text-sm">
                            <span className="font-medium">{selectedMarker.live_data.max_flow || 0}</span>
                            <span className="text-muted-foreground">{language === 'ar' ? 'السعة القصوى' : 'Max Capacity'}</span>
                          </div>
                          <div className="flex justify-between items-center text-sm">
                            <Badge variant="secondary">{selectedMarker.live_data.current_indicator || '-'}</Badge>
                            <span className="text-muted-foreground">{language === 'ar' ? 'المؤشر' : 'Indicator'}</span>
                          </div>
                        </>
                      )}

                      {selectedMarker.type === 'employee' && (
                        <>
                          <div className="flex justify-between items-center text-sm">
                            <span className="font-medium">{selectedMarker.live_data.name}</span>
                            <span className="text-muted-foreground">{language === 'ar' ? 'الاسم' : 'Name'}</span>
                          </div>
                          <div className="flex justify-between items-center text-sm">
                            <span className="font-medium">{selectedMarker.live_data.job_title}</span>
                            <span className="text-muted-foreground">{language === 'ar' ? 'الوظيفة' : 'Job'}</span>
                          </div>
                          <div className="flex justify-between items-center text-sm">
                            <Badge>{selectedMarker.live_data.shift}</Badge>
                            <span className="text-muted-foreground">{language === 'ar' ? 'الوردية' : 'Shift'}</span>
                          </div>
                          <div className="flex justify-between items-center text-sm">
                            <Badge variant={selectedMarker.live_data.is_active ? "default" : "secondary"}>
                              {selectedMarker.live_data.is_active ? (language === 'ar' ? 'نشط' : 'Active') : (language === 'ar' ? 'غير نشط' : 'Inactive')}
                            </Badge>
                            <span className="text-muted-foreground">{language === 'ar' ? 'الحالة' : 'Status'}</span>
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-12">
                  <MapPin className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
                  <p className="text-sm text-muted-foreground">
                    {language === 'ar' ? 'اضغط على أي نقطة لعرض التفاصيل' : 'Click any marker to view details'}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Stats */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="font-cairo text-sm text-right">
                {language === 'ar' ? 'إحصائيات سريعة' : 'Quick Stats'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between items-center text-sm">
                <span className="font-bold text-lg">{markers.length}</span>
                <span className="text-muted-foreground">{language === 'ar' ? 'إجمالي النقاط' : 'Total Markers'}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="font-bold">{markers.filter(m => m.type === 'gate').length}</span>
                <span className="text-muted-foreground">{language === 'ar' ? 'الأبواب' : 'Gates'}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="font-bold">{markers.filter(m => m.type === 'employee').length}</span>
                <span className="text-muted-foreground">{language === 'ar' ? 'الموظفين' : 'Employees'}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="font-bold">{markers.filter(m => m.type === 'plaza').length}</span>
                <span className="text-muted-foreground">{language === 'ar' ? 'الساحات' : 'Plazas'}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
