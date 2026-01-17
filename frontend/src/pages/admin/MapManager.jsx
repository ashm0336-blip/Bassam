import { useState, useEffect } from "react";
import axios from "axios";
import { useLanguage } from "@/context/LanguageContext";
import {
  Map as MapIcon,
  Plus,
  Upload,
  MapPin,
  Trash2,
  Edit,
  Save,
  X,
  Loader2,
  DoorOpen,
  Users
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function MapManager() {
  const { language } = useLanguage();
  const [maps, setMaps] = useState([]);
  const [selectedMap, setSelectedMap] = useState(null);
  const [markers, setMarkers] = useState([]);
  const [gates, setGates] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [markerDialogOpen, setMarkerDialogOpen] = useState(false);
  const [clickPosition, setClickPosition] = useState(null);
  const [activeTab, setActiveTab] = useState("markers");

  const [markerForm, setMarkerForm] = useState({
    type: "gate",
    entity_id: "",
    label_ar: "",
    label_en: "",
    color: "#DC2626",
    show_label: true
  });

  useEffect(() => {
    fetchMaps();
    fetchGates();
    fetchEmployees();
  }, []);

  useEffect(() => {
    if (selectedMap) {
      fetchMarkers(selectedMap.id);
    }
  }, [selectedMap]);

  const fetchMaps = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(`${API}/maps`, {
        headers: { Authorization: `Bearer ${token}` }
      });
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
      const response = await axios.get(`${API}/maps/${mapId}/markers`);
      setMarkers(response.data);
    } catch (error) {
      console.error("Error fetching markers:", error);
    }
  };

  const fetchGates = async () => {
    try {
      const response = await axios.get(`${API}/gates`);
      setGates(response.data);
    } catch (error) {
      console.error("Error fetching gates:", error);
    }
  };

  const fetchEmployees = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(`${API}/employees?department=gates`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setEmployees(response.data);
    } catch (error) {
      console.error("Error fetching employees:", error);
    }
  };

  const handleMapClick = (e) => {
    if (!selectedMap) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    setClickPosition({ x, y });
    setMarkerDialogOpen(true);
  };

  const handleCreateMarker = async () => {
    if (!selectedMap || !clickPosition) return;

    try {
      const token = localStorage.getItem("token");
      
      const markerData = {
        map_id: selectedMap.id,
        type: markerForm.type,
        entity_id: markerForm.entity_id || null,
        x: clickPosition.x,
        y: clickPosition.y,
        label_ar: markerForm.label_ar,
        label_en: markerForm.label_en,
        color: markerForm.color,
        show_label: markerForm.show_label
      };

      await axios.post(`${API}/admin/maps/markers`, markerData, {
        headers: { Authorization: `Bearer ${token}` }
      });

      toast.success(language === 'ar' ? 'تم إضافة النقطة بنجاح' : 'Marker added successfully');
      setMarkerDialogOpen(false);
      fetchMarkers(selectedMap.id);
      
      // Reset form
      setMarkerForm({
        type: "gate",
        entity_id: "",
        label_ar: "",
        label_en: "",
        color: "#DC2626",
        show_label: true
      });
    } catch (error) {
      console.error("Error creating marker:", error);
      toast.error(language === 'ar' ? 'فشل إضافة النقطة' : 'Failed to add marker');
    }
  };

  const handleDeleteMarker = async (markerId) => {
    try {
      const token = localStorage.getItem("token");
      await axios.delete(`${API}/admin/maps/markers/${markerId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success(language === 'ar' ? 'تم حذف النقطة' : 'Marker deleted');
      fetchMarkers(selectedMap.id);
    } catch (error) {
      console.error("Error deleting marker:", error);
      toast.error(language === 'ar' ? 'فشل حذف النقطة' : 'Failed to delete marker');
    }
  };

  const getMarkerIcon = (type) => {
    switch(type) {
      case 'gate': return DoorOpen;
      case 'employee': return Users;
      default: return MapPin;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex gap-2">
          <Button variant="outline">
            <Upload className="w-4 h-4 ml-2" />
            {language === 'ar' ? 'رفع خريطة جديدة' : 'Upload New Map'}
          </Button>
        </div>
        <div className="text-right">
          <CardTitle className="font-cairo text-xl flex items-center gap-2 justify-end">
            <MapIcon className="w-5 h-5" />
            {language === 'ar' ? 'إدارة الخرائط' : 'Map Management'}
          </CardTitle>
          <CardDescription className="text-right mt-1">
            {language === 'ar' ? 'إضافة وتعديل الخرائط والنقاط التفاعلية' : 'Add and edit maps and interactive markers'}
          </CardDescription>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="markers">
            {language === 'ar' ? 'النقاط التفاعلية' : 'Markers'}
          </TabsTrigger>
          <TabsTrigger value="maps">
            {language === 'ar' ? 'الخرائط' : 'Maps'}
          </TabsTrigger>
        </TabsList>

        {/* Markers Tab */}
        <TabsContent value="markers" className="mt-6 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="font-cairo text-base text-right">
                {language === 'ar' ? 'اضغط على الخريطة لإضافة نقطة' : 'Click on map to add marker'}
              </CardTitle>
              <CardDescription className="text-right">
                {language === 'ar' ? `عدد النقاط الحالية: ${markers.length}` : `Current markers: ${markers.length}`}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div 
                className="relative w-full bg-gray-100 rounded-lg overflow-hidden cursor-crosshair"
                style={{ paddingBottom: '56.25%' }}
                onClick={handleMapClick}
              >
                <div className="absolute inset-0">
                  {selectedMap && (
                    <img 
                      src={selectedMap.image_url}
                      alt="Map"
                      className="w-full h-full object-cover pointer-events-none"
                    />
                  )}
                  
                  {/* Existing Markers */}
                  {markers.map((marker) => {
                    const Icon = getMarkerIcon(marker.type);
                    return (
                      <div
                        key={marker.id}
                        className="absolute transform -translate-x-1/2 -translate-y-1/2 group"
                        style={{
                          left: `${marker.x}%`,
                          top: `${marker.y}%`,
                        }}
                      >
                        <div 
                          className="w-10 h-10 rounded-full flex items-center justify-center shadow-lg border-2 border-white cursor-pointer hover:scale-110 transition-transform"
                          style={{ backgroundColor: marker.color }}
                        >
                          <Icon className="w-5 h-5 text-white" />
                        </div>
                        <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-black/80 text-white text-xs px-2 py-1 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                          {language === 'ar' ? marker.label_ar : marker.label_en}
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteMarker(marker.id);
                          }}
                          className="absolute -top-2 -right-2 w-5 h-5 bg-destructive rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="w-3 h-3 text-white" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Markers List */}
          <Card>
            <CardHeader>
              <CardTitle className="font-cairo text-base text-right">
                {language === 'ar' ? 'قائمة النقاط' : 'Markers List'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {markers.map((marker) => {
                  const Icon = getMarkerIcon(marker.type);
                  return (
                    <div key={marker.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50">
                      <div className="flex items-center gap-3">
                        <div 
                          className="w-8 h-8 rounded-full flex items-center justify-center"
                          style={{ backgroundColor: marker.color }}
                        >
                          <Icon className="w-4 h-4 text-white" />
                        </div>
                        <div className="text-right">
                          <p className="font-medium text-sm">{language === 'ar' ? marker.label_ar : marker.label_en}</p>
                          <p className="text-xs text-muted-foreground">
                            ({marker.x.toFixed(1)}%, {marker.y.toFixed(1)}%)
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Badge variant="outline">{marker.type}</Badge>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-destructive"
                          onClick={() => handleDeleteMarker(marker.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
                {markers.length === 0 && (
                  <p className="text-center text-muted-foreground py-8">
                    {language === 'ar' ? 'اضغط على الخريطة لإضافة نقاط' : 'Click on map to add markers'}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Maps Tab */}
        <TabsContent value="maps" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="font-cairo text-base text-right">
                {language === 'ar' ? 'الخرائط المتاحة' : 'Available Maps'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {maps.map((map) => (
                  <div 
                    key={map.id} 
                    className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                      selectedMap?.id === map.id ? 'border-primary bg-primary/5' : 'hover:border-primary/50'
                    }`}
                    onClick={() => setSelectedMap(map)}
                  >
                    <div className="flex items-center gap-4">
                      <img 
                        src={map.image_url} 
                        alt={map.name_ar}
                        className="w-24 h-16 object-cover rounded"
                      />
                      <div className="flex-1 text-right">
                        <p className="font-medium">{language === 'ar' ? map.name_ar : map.name_en}</p>
                        <p className="text-xs text-muted-foreground">{map.department}</p>
                      </div>
                      {selectedMap?.id === map.id && (
                        <Badge variant="default">{language === 'ar' ? 'محددة' : 'Selected'}</Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Add Marker Dialog */}
      <Dialog open={markerDialogOpen} onOpenChange={setMarkerDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="font-cairo text-right">
              {language === 'ar' ? 'إضافة نقطة جديدة' : 'Add New Marker'}
            </DialogTitle>
            <DialogDescription className="text-right">
              {language === 'ar' 
                ? `الموقع: (${clickPosition?.x.toFixed(1)}%, ${clickPosition?.y.toFixed(1)}%)`
                : `Position: (${clickPosition?.x.toFixed(1)}%, ${clickPosition?.y.toFixed(1)}%)`
              }
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4" dir="rtl">
            <div>
              <Label className="text-right block mb-2">{language === 'ar' ? 'النوع' : 'Type'}</Label>
              <Select value={markerForm.type} onValueChange={(v) => setMarkerForm({...markerForm, type: v, entity_id: ""})}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="gate">{language === 'ar' ? 'باب' : 'Gate'}</SelectItem>
                  <SelectItem value="employee">{language === 'ar' ? 'موظف' : 'Employee'}</SelectItem>
                  <SelectItem value="plaza">{language === 'ar' ? 'ساحة' : 'Plaza'}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {markerForm.type === 'gate' && (
              <div>
                <Label className="text-right block mb-2">{language === 'ar' ? 'ربط بباب (اختياري)' : 'Link to Gate (Optional)'}</Label>
                <Select value={markerForm.entity_id} onValueChange={(v) => setMarkerForm({...markerForm, entity_id: v})}>
                  <SelectTrigger>
                    <SelectValue placeholder={language === 'ar' ? 'اختر باب...' : 'Select gate...'} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">{language === 'ar' ? 'بدون ربط' : 'No link'}</SelectItem>
                    {gates.map((gate) => (
                      <SelectItem key={gate.id} value={gate.id}>
                        {gate.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-1 text-right">
                  {language === 'ar' ? 'إذا تم الربط، ستظهر بيانات الباب real-time' : 'If linked, gate data will show in real-time'}
                </p>
              </div>
            )}

            {markerForm.type === 'employee' && (
              <div>
                <Label className="text-right block mb-2">{language === 'ar' ? 'ربط بموظف (اختياري)' : 'Link to Employee (Optional)'}</Label>
                <Select value={markerForm.entity_id} onValueChange={(v) => setMarkerForm({...markerForm, entity_id: v})}>
                  <SelectTrigger>
                    <SelectValue placeholder={language === 'ar' ? 'اختر موظف...' : 'Select employee...'} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">{language === 'ar' ? 'بدون ربط' : 'No link'}</SelectItem>
                    {employees.map((emp) => (
                      <SelectItem key={emp.id} value={emp.id}>
                        {emp.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-right block mb-2">{language === 'ar' ? 'التسمية (عربي)' : 'Label (Arabic)'}</Label>
                <Input 
                  value={markerForm.label_ar}
                  onChange={(e) => setMarkerForm({...markerForm, label_ar: e.target.value})}
                  placeholder="مثال: الباب الرئيسي"
                  className="text-right"
                />
              </div>
              <div>
                <Label className="text-right block mb-2">{language === 'ar' ? 'التسمية (إنجليزي)' : 'Label (English)'}</Label>
                <Input 
                  value={markerForm.label_en}
                  onChange={(e) => setMarkerForm({...markerForm, label_en: e.target.value})}
                  placeholder="Example: Main Gate"
                  className="text-right"
                />
              </div>
            </div>

            <div>
              <Label className="text-right block mb-2">{language === 'ar' ? 'اللون' : 'Color'}</Label>
              <div className="flex gap-2 flex-row-reverse">
                <Input 
                  value={markerForm.color}
                  onChange={(e) => setMarkerForm({...markerForm, color: e.target.value})}
                  className="flex-1 text-right"
                />
                <Input 
                  type="color"
                  value={markerForm.color}
                  onChange={(e) => setMarkerForm({...markerForm, color: e.target.value})}
                  className="w-16"
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setMarkerDialogOpen(false)}>
              {language === 'ar' ? 'إلغاء' : 'Cancel'}
            </Button>
            <Button onClick={handleCreateMarker}>
              <Save className="w-4 h-4 ml-2" />
              {language === 'ar' ? 'إضافة' : 'Add'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
