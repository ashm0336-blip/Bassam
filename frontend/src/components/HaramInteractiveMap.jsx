import { useState, useEffect, useRef, useCallback } from "react";
import axios from "axios";
import {
  ZoomIn,
  ZoomOut,
  Maximize2,
  RefreshCw,
  Layers,
  Users,
  MapPin,
  Info,
  Settings,
  ChevronDown,
  AlertTriangle,
  CheckCircle,
  Clock,
  X
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useLanguage } from "@/context/LanguageContext";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const normalizeImageUrl = (url) => {
  if (!url) return url;
  let value = url;
  if (value.startsWith("/")) {
    value = `${process.env.REACT_APP_BACKEND_URL}${value}`;
  } else if (value.startsWith("uploads/")) {
    value = `${process.env.REACT_APP_BACKEND_URL}/${value}`;
  }
  if (value.includes("/uploads/") && !value.includes("/api/uploads/")) {
    value = value.replace("/uploads/", "/api/uploads/");
  }
  return value;
};

// Zone type colors and labels
const ZONE_TYPES = {
  men_prayer: { color: "#22c55e", label_ar: "مصليات الرجال", label_en: "Men Prayer Areas" },
  women_prayer: { color: "#93c5fd", label_ar: "مصليات النساء", label_en: "Women Prayer Areas" },
  men_rakatayn: { color: "#16a34a", label_ar: "مصلى الركعتين للرجال", label_en: "Two-Rak'ah Men" },
  women_rakatayn: { color: "#60a5fa", label_ar: "مصلى الركعتين للنساء", label_en: "Two-Rak'ah Women" },
  men_tasks: { color: "#9ca3af", label_ar: "مصلى مهمات رجال", label_en: "Men Tasks Prayer" },
  women_tasks: { color: "#fdba74", label_ar: "مصلى مهمات نساء", label_en: "Women Tasks Prayer" },
  emergency: { color: "#78350f", label_ar: "مجمعات خدمات الطوارئ", label_en: "Emergency Services" },
  vip: { color: "#1e3a5f", label_ar: "مصلى رؤساء الدول ومرافقيهم", label_en: "VIP / Heads of State" },
  funeral: { color: "#a8a29e", label_ar: "مصلى الجنائز", label_en: "Funeral Prayer" },
  disabled_men: { color: "#1d4ed8", label_ar: "مصلى ذوي الإعاقة والمسنين", label_en: "Disabled & Elderly Men" },
  disabled_women: { color: "#be123c", label_ar: "مصلى المسنات وذوي الإعاقة من النساء", label_en: "Disabled & Elderly Women" },
  reserve_fard: { color: "#ea580c", label_ar: "مصليات احتياطية (وقت الفروض)", label_en: "Reserve (Prayer Times)" },
  reserve_general: { color: "#4ade80", label_ar: "مصليات احتياطية", label_en: "Reserve Prayer Areas" },
  elevated: { color: "#b0b0b0", label_ar: "مصليات مرتفعة", label_en: "Elevated Prayer Areas" },
  service: { color: "#374151", label_ar: "خدمات", label_en: "Services" },
};

// Crowd status colors
const CROWD_STATUS_COLORS = {
  normal: "#22c55e",
  moderate: "#eab308",
  crowded: "#f97316",
  critical: "#ef4444",
};

const CROWD_STATUS_LABELS = {
  normal: { ar: "طبيعي", en: "Normal" },
  moderate: { ar: "متوسط", en: "Moderate" },
  crowded: { ar: "مزدحم", en: "Crowded" },
  critical: { ar: "حرج", en: "Critical" },
};

export default function HaramInteractiveMap({ isAdmin = false }) {
  const { language } = useLanguage();
  const containerRef = useRef(null);
  const [floors, setFloors] = useState([]);
  const [selectedFloor, setSelectedFloor] = useState(null);
  const [zones, setZones] = useState([]);
  const [selectedZone, setSelectedZone] = useState(null);
  const [hoveredZone, setHoveredZone] = useState(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [lastPanPoint, setLastPanPoint] = useState({ x: 0, y: 0 });
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(new Date());
  const [showLegend, setShowLegend] = useState(true);
  const [filterType, setFilterType] = useState("all");
  const [stats, setStats] = useState(null);

  // Fetch floors
  const fetchFloors = useCallback(async () => {
    try {
      const response = await axios.get(`${API}/floors`);
      const normalized = response.data.map((floor) => ({
        ...floor,
        image_url: normalizeImageUrl(floor.image_url)
      }));
      setFloors(normalized);
      if (normalized.length > 0 && !selectedFloor) {
        setSelectedFloor(normalized[0]);
      }
    } catch (error) {
      console.error("Error fetching floors:", error);
    }
  }, [selectedFloor]);

  // Fetch zones for selected floor
  const fetchZones = useCallback(async () => {
    if (!selectedFloor) return;
    try {
      const response = await axios.get(`${API}/floors/${selectedFloor.id}/zones`);
      setZones(response.data);
      setLastUpdate(new Date());
    } catch (error) {
      console.error("Error fetching zones:", error);
    } finally {
      setLoading(false);
    }
  }, [selectedFloor]);

  // Fetch zone stats
  const fetchStats = useCallback(async () => {
    try {
      const response = await axios.get(`${API}/zones/stats/summary`);
      setStats(response.data);
    } catch (error) {
      console.error("Error fetching stats:", error);
    }
  }, []);

  useEffect(() => {
    fetchFloors();
    fetchStats();
  }, [fetchFloors, fetchStats]);

  useEffect(() => {
    if (selectedFloor) {
      setLoading(true);
      fetchZones();
    }
  }, [selectedFloor, fetchZones]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      fetchZones();
      fetchStats();
    }, 30000);
    return () => clearInterval(interval);
  }, [fetchZones, fetchStats]);

  // Zoom handlers
  const handleZoomIn = () => setZoom((prev) => Math.min(prev + 0.25, 3));
  const handleZoomOut = () => setZoom((prev) => Math.max(prev - 0.25, 0.5));
  const handleReset = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
    setSelectedZone(null);
  };

  // Pan handlers
  const handleMouseDown = (e) => {
    if (e.button === 0) {
      setIsPanning(true);
      setLastPanPoint({ x: e.clientX, y: e.clientY });
    }
  };

  const handleMouseMove = (e) => {
    if (isPanning) {
      const dx = e.clientX - lastPanPoint.x;
      const dy = e.clientY - lastPanPoint.y;
      setPan((prev) => ({ x: prev.x + dx, y: prev.y + dy }));
      setLastPanPoint({ x: e.clientX, y: e.clientY });
    }
  };

  const handleMouseUp = () => setIsPanning(false);

  // Filter zones by type
  const filteredZones = filterType === "all" 
    ? zones 
    : zones.filter((z) => z.zone_type === filterType);

  // Get zone color based on crowd status or type
  const getZoneColor = (zone) => {
    // For Kaaba, always use black
    if (zone.zone_type === "kaaba") {
      return "#1a1a1a";
    }
    
    // Calculate crowd percentage
    const maxCap = zone.max_capacity || 1;
    const current = zone.current_crowd || 0;
    const percentage = (current / maxCap) * 100;
    
    // Return color based on percentage thresholds
    if (percentage < 50) return CROWD_STATUS_COLORS.normal;
    if (percentage < 70) return CROWD_STATUS_COLORS.moderate;
    if (percentage < 85) return CROWD_STATUS_COLORS.crowded;
    return CROWD_STATUS_COLORS.critical;
  };

  // Convert polygon points to SVG path
  const getPolygonPath = (points) => {
    if (!points || points.length < 3) return "";
    const path = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
    return path + " Z";
  };

  return (
    <div className="space-y-4" data-testid="haram-interactive-map">
      {/* Header Controls */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <MapPin className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="font-cairo font-bold text-lg">
              {language === "ar" ? "إدارة المصليات" : "Prayer Areas Management"}
            </h2>
            <p className="text-xs text-muted-foreground">
              {language === "ar" ? "آخر تحديث:" : "Last update:"}{" "}
              {lastUpdate.toLocaleTimeString(language === "ar" ? "ar-SA" : "en-US")}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Floor selector */}
          <Select
            value={selectedFloor?.id || ""}
            onValueChange={(val) => {
              const floor = floors.find((f) => f.id === val);
              setSelectedFloor(floor);
            }}
          >
            <SelectTrigger className="w-40" data-testid="floor-selector">
              <Layers className="w-4 h-4 ml-2" />
              <SelectValue placeholder={language === "ar" ? "اختر الطابق" : "Select Floor"} />
            </SelectTrigger>
            <SelectContent>
              {floors.map((floor) => (
                <SelectItem key={floor.id} value={floor.id}>
                  {language === "ar" ? floor.name_ar : floor.name_en}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Type filter */}
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-36" data-testid="type-filter">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{language === "ar" ? "الكل" : "All"}</SelectItem>
              {Object.entries(ZONE_TYPES).map(([key, value]) => (
                <SelectItem key={key} value={key}>
                  {language === "ar" ? value.label_ar : value.label_en}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Zoom controls */}
          <div className="flex items-center gap-1 border rounded-lg p-1">
            <Button variant="ghost" size="icon" onClick={handleZoomOut} data-testid="zoom-out">
              <ZoomOut className="w-4 h-4" />
            </Button>
            <span className="text-xs w-12 text-center">{Math.round(zoom * 100)}%</span>
            <Button variant="ghost" size="icon" onClick={handleZoomIn} data-testid="zoom-in">
              <ZoomIn className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={handleReset} data-testid="reset-view">
              <Maximize2 className="w-4 h-4" />
            </Button>
          </div>

          <Button
            variant="outline"
            size="icon"
            onClick={() => {
              fetchZones();
              fetchStats();
            }}
            data-testid="refresh-map"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Map Area */}
        <div className="lg:col-span-3">
          <Card className="overflow-hidden">
            <CardContent className="p-0">
              <div
                ref={containerRef}
                className="relative w-full bg-gray-100 overflow-hidden cursor-grab active:cursor-grabbing"
                style={{ height: "600px" }}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
              >
                {loading ? (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <RefreshCw className="w-8 h-8 animate-spin text-primary" />
                  </div>
                ) : selectedFloor ? (
                  <div
                    className="absolute inset-0 transition-transform duration-200"
                    style={{
                      transform: `scale(${zoom}) translate(${pan.x / zoom}px, ${pan.y / zoom}px)`,
                      transformOrigin: "center center",
                    }}
                  >
                    {/* Background Image */}
                    <img
                      src={normalizeImageUrl(selectedFloor.image_url)}
                      alt={language === "ar" ? selectedFloor.name_ar : selectedFloor.name_en}
                      className="w-full h-full object-contain pointer-events-none"
                      draggable={false}
                    />

                    {/* SVG Overlay for Zones */}
                    <svg
                      className="absolute inset-0 w-full h-full"
                      viewBox="0 0 100 100"
                      preserveAspectRatio="none"
                    >
                      {filteredZones.map((zone) => (
                        <TooltipProvider key={zone.id}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <path
                                d={getPolygonPath(zone.polygon_points)}
                                fill={getZoneColor(zone)}
                                fillOpacity={hoveredZone?.id === zone.id ? 0.7 : zone.opacity || 0.4}
                                stroke={
                                  selectedZone?.id === zone.id
                                    ? "#fbbf24"
                                    : zone.stroke_color || "#000"
                                }
                                strokeWidth={selectedZone?.id === zone.id ? 0.5 : 0.2}
                                className="cursor-pointer transition-all duration-200"
                                style={{ pointerEvents: "auto" }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedZone(zone);
                                }}
                                onMouseEnter={() => setHoveredZone(zone)}
                                onMouseLeave={() => setHoveredZone(null)}
                                data-testid={`zone-${zone.zone_code}`}
                              />
                            </TooltipTrigger>
                            <TooltipContent side="top" className="text-right" dir="rtl">
                              <div className="space-y-1">
                                <p className="font-bold">
                                  {language === "ar" ? zone.name_ar : zone.name_en}
                                </p>
                                <p className="text-xs">
                                  {language === "ar" ? "الكود:" : "Code:"} {zone.zone_code}
                                </p>
                                <p className="text-xs">
                                  {language === "ar" ? "الحالة:" : "Status:"}{" "}
                                  {CROWD_STATUS_LABELS[zone.crowd_status]?.[language === "ar" ? "ar" : "en"]}
                                </p>
                                {zone.percentage !== undefined && (
                                  <p className="text-xs">
                                    {language === "ar" ? "الإشغال:" : "Occupancy:"} {zone.percentage}%
                                  </p>
                                )}
                              </div>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      ))}
                    </svg>

                    {/* Zone Labels */}
                    {filteredZones.map((zone) => {
                      // Calculate center of polygon for label placement
                      if (!zone.polygon_points || zone.polygon_points.length === 0) return null;
                      const centerX =
                        zone.polygon_points.reduce((sum, p) => sum + p.x, 0) /
                        zone.polygon_points.length;
                      const centerY =
                        zone.polygon_points.reduce((sum, p) => sum + p.y, 0) /
                        zone.polygon_points.length;

                      return (
                        <div
                          key={`label-${zone.id}`}
                          className="absolute pointer-events-none text-center"
                          style={{
                            left: `${centerX}%`,
                            top: `${centerY}%`,
                            transform: "translate(-50%, -50%)",
                          }}
                        >
                          <span
                            className="text-[8px] font-bold bg-white/80 px-1 rounded shadow-sm"
                            style={{ color: getZoneColor(zone) }}
                          >
                            {zone.zone_code}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
                    {language === "ar" ? "لم يتم تحميل أي طابق" : "No floor loaded"}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Legend */}
          {showLegend && (
            <Card className="mt-4">
              <CardHeader className="py-2 px-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-cairo">
                    {language === "ar" ? "دليل الألوان" : "Color Legend"}
                  </CardTitle>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowLegend(false)}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="py-2 px-4">
                <div className="flex flex-wrap gap-4">
                  {/* Zone Types */}
                  <div className="space-y-1">
                    <p className="text-xs font-semibold text-muted-foreground">
                      {language === "ar" ? "أنواع المناطق" : "Zone Types"}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(ZONE_TYPES).map(([key, value]) => (
                        <div key={key} className="flex items-center gap-1">
                          <div
                            className="w-3 h-3 rounded"
                            style={{ backgroundColor: value.color }}
                          />
                          <span className="text-xs">
                            {language === "ar" ? value.label_ar : value.label_en}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Crowd Status */}
                  <div className="space-y-1">
                    <p className="text-xs font-semibold text-muted-foreground">
                      {language === "ar" ? "حالة الازدحام" : "Crowd Status"}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(CROWD_STATUS_COLORS).map(([key, color]) => (
                        <div key={key} className="flex items-center gap-1">
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: color }}
                          />
                          <span className="text-xs">
                            {CROWD_STATUS_LABELS[key]?.[language === "ar" ? "ar" : "en"]}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar - Zone Details & Stats */}
        <div className="space-y-4">
          {/* Selected Zone Details */}
          {selectedZone ? (
            <Card className="border-primary/30" data-testid="zone-details">
              <CardHeader className="pb-2 pt-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-cairo flex items-center gap-2">
                    <Info className="w-4 h-4 text-primary" />
                    {language === "ar" ? selectedZone.name_ar : selectedZone.name_en}
                  </CardTitle>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0"
                    onClick={() => setSelectedZone(null)}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="pb-3 space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">
                    {language === "ar" ? "الكود" : "Code"}
                  </span>
                  <Badge variant="outline">{selectedZone.zone_code}</Badge>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">
                    {language === "ar" ? "النوع" : "Type"}
                  </span>
                  <span>
                    {ZONE_TYPES[selectedZone.zone_type]?.[
                      language === "ar" ? "label_ar" : "label_en"
                    ] || selectedZone.zone_type}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">
                    {language === "ar" ? "الحالة" : "Status"}
                  </span>
                  <Badge
                    style={{
                      backgroundColor: CROWD_STATUS_COLORS[selectedZone.crowd_status],
                      color: "white",
                    }}
                  >
                    {CROWD_STATUS_LABELS[selectedZone.crowd_status]?.[
                      language === "ar" ? "ar" : "en"
                    ]}
                  </Badge>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">
                    {language === "ar" ? "السعة الحالية" : "Current Crowd"}
                  </span>
                  <span className="font-bold">
                    {selectedZone.current_crowd?.toLocaleString(
                      language === "ar" ? "ar-SA" : "en-US"
                    )}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">
                    {language === "ar" ? "الطاقة القصوى" : "Max Capacity"}
                  </span>
                  <span>
                    {selectedZone.max_capacity?.toLocaleString(
                      language === "ar" ? "ar-SA" : "en-US"
                    )}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">
                    {language === "ar" ? "نسبة الإشغال" : "Occupancy"}
                  </span>
                  <span className="font-bold">{selectedZone.percentage}%</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">
                    {language === "ar" ? "الموظفين المكلفين" : "Assigned Staff"}
                  </span>
                  <span>{selectedZone.assigned_employees || 0}</span>
                </div>

                {/* Progress bar */}
                <div className="space-y-1">
                  <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${Math.min(selectedZone.percentage || 0, 100)}%`,
                        backgroundColor: CROWD_STATUS_COLORS[selectedZone.crowd_status],
                      }}
                    />
                  </div>
                </div>

                {selectedZone.description_ar && (
                  <div className="pt-2 border-t">
                    <p className="text-xs text-muted-foreground">
                      {language === "ar"
                        ? selectedZone.description_ar
                        : selectedZone.description_en}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="py-8 text-center">
                <MapPin className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">
                  {language === "ar"
                    ? "اضغط على أي منطقة لعرض التفاصيل"
                    : "Click any zone to view details"}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Quick Stats */}
          {stats && (
            <Card data-testid="zone-stats">
              <CardHeader className="pb-2 pt-3">
                <CardTitle className="text-sm font-cairo">
                  {language === "ar" ? "إحصائيات عامة" : "Overall Stats"}
                </CardTitle>
              </CardHeader>
              <CardContent className="pb-3 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">
                    {language === "ar" ? "إجمالي المناطق" : "Total Zones"}
                  </span>
                  <span className="font-bold">{stats.total_zones}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">
                    {language === "ar" ? "الحشود الحالية" : "Current Crowd"}
                  </span>
                  <span className="font-bold">
                    {stats.total_current_crowd?.toLocaleString(
                      language === "ar" ? "ar-SA" : "en-US"
                    )}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">
                    {language === "ar" ? "الطاقة القصوى" : "Max Capacity"}
                  </span>
                  <span>
                    {stats.total_max_capacity?.toLocaleString(
                      language === "ar" ? "ar-SA" : "en-US"
                    )}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">
                    {language === "ar" ? "نسبة الإشغال" : "Occupancy"}
                  </span>
                  <Badge
                    style={{
                      backgroundColor:
                        stats.overall_percentage < 50
                          ? CROWD_STATUS_COLORS.normal
                          : stats.overall_percentage < 70
                          ? CROWD_STATUS_COLORS.moderate
                          : stats.overall_percentage < 85
                          ? CROWD_STATUS_COLORS.crowded
                          : CROWD_STATUS_COLORS.critical,
                      color: "white",
                    }}
                  >
                    {stats.overall_percentage}%
                  </Badge>
                </div>

                {/* Status Distribution */}
                <div className="pt-2 border-t space-y-2">
                  <p className="text-xs font-semibold text-muted-foreground">
                    {language === "ar" ? "توزيع الحالات" : "Status Distribution"}
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="flex items-center gap-1">
                      <CheckCircle className="w-3 h-3 text-green-500" />
                      <span className="text-xs">
                        {stats.by_status?.normal || 0}{" "}
                        {language === "ar" ? "طبيعي" : "Normal"}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-yellow-500" />
                      <span className="text-xs">
                        {stats.by_status?.moderate || 0}{" "}
                        {language === "ar" ? "متوسط" : "Moderate"}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3 text-orange-500" />
                      <span className="text-xs">
                        {stats.by_status?.crowded || 0}{" "}
                        {language === "ar" ? "مزدحم" : "Crowded"}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3 text-red-500" />
                      <span className="text-xs">
                        {stats.by_status?.critical || 0}{" "}
                        {language === "ar" ? "حرج" : "Critical"}
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Floor Info */}
          {selectedFloor && (
            <Card>
              <CardHeader className="pb-2 pt-3">
                <CardTitle className="text-sm font-cairo flex items-center gap-2">
                  <Layers className="w-4 h-4 text-primary" />
                  {language === "ar" ? selectedFloor.name_ar : selectedFloor.name_en}
                </CardTitle>
              </CardHeader>
              <CardContent className="pb-3">
                <p className="text-xs text-muted-foreground">
                  {language === "ar" ? "عدد المناطق:" : "Number of zones:"}{" "}
                  <span className="font-bold">{zones.length}</span>
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
