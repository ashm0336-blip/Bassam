import { useState, useEffect } from "react";
import axios from "axios";
import { 
  MapPin, 
  DoorOpen, 
  Users, 
  AlertTriangle,
  ZoomIn,
  ZoomOut,
  Maximize2,
  RefreshCw,
  Circle
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

// Gate positions on the map (relative coordinates 0-100)
const gatePositions = [
  { id: 1, name: "باب الملك عبدالعزيز", x: 85, y: 50, direction: "east" },
  { id: 2, name: "باب الفتح", x: 50, y: 8, direction: "north" },
  { id: 3, name: "باب العمرة", x: 25, y: 15, direction: "north" },
  { id: 4, name: "باب الملك فهد", x: 15, y: 50, direction: "west" },
  { id: 5, name: "باب السلام", x: 20, y: 30, direction: "west" },
  { id: 6, name: "باب إبراهيم", x: 30, y: 85, direction: "south" },
  { id: 7, name: "باب الحجون", x: 75, y: 15, direction: "north" },
  { id: 8, name: "باب علي", x: 80, y: 75, direction: "east" },
  { id: 9, name: "باب العباس", x: 60, y: 90, direction: "south" },
  { id: 10, name: "باب النبي", x: 45, y: 92, direction: "south" },
  { id: 11, name: "باب جبريل", x: 70, y: 25, direction: "east" },
  { id: 12, name: "باب الصفا", x: 88, y: 35, direction: "east" },
];

// Plaza zones on the map
const plazaZones = [
  { id: "north", name: "الساحة الشمالية", x: 50, y: 18, width: 35, height: 15 },
  { id: "south", name: "الساحة الجنوبية", x: 50, y: 82, width: 35, height: 15 },
  { id: "east", name: "الساحة الشرقية", x: 82, y: 50, width: 15, height: 30 },
  { id: "west", name: "الساحة الغربية", x: 18, y: 50, width: 15, height: 30 },
  { id: "masa", name: "ساحة المسعى", x: 85, y: 65, width: 12, height: 25 },
];

const GateMarker = ({ gate, gateData, onClick, isSelected }) => {
  const data = gateData?.find(g => g.number === gate.id) || {};
  const statusColors = {
    open: "#004D38",
    closed: "#991B1B",
    maintenance: "#C5A059"
  };
  const color = statusColors[data.status] || statusColors.open;
  const flowPercentage = data.max_flow ? (data.current_flow / data.max_flow) * 100 : 0;
  
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <g 
            className="cursor-pointer transition-transform hover:scale-110"
            onClick={() => onClick(gate)}
            style={{ transform: `translate(${gate.x}%, ${gate.y}%)` }}
          >
            <circle
              cx={0}
              cy={0}
              r={isSelected ? 14 : 12}
              fill={color}
              stroke={isSelected ? "#C5A059" : "white"}
              strokeWidth={isSelected ? 3 : 2}
              className="drop-shadow-md"
            />
            <text
              x={0}
              y={1}
              textAnchor="middle"
              dominantBaseline="middle"
              fill="white"
              fontSize="8"
              fontWeight="bold"
              fontFamily="Cairo"
            >
              {gate.id}
            </text>
            {/* Flow indicator ring */}
            {data.status === "open" && (
              <circle
                cx={0}
                cy={0}
                r={16}
                fill="none"
                stroke={flowPercentage > 85 ? "#991B1B" : flowPercentage > 70 ? "#C5A059" : "#004D38"}
                strokeWidth={2}
                strokeDasharray={`${flowPercentage} ${100 - flowPercentage}`}
                strokeDashoffset={25}
                opacity={0.6}
              />
            )}
          </g>
        </TooltipTrigger>
        <TooltipContent side="top" className="text-right" dir="rtl">
          <div className="space-y-1">
            <p className="font-bold">{gate.name}</p>
            <p className="text-xs">
              الحالة: {data.status === "open" ? "مفتوح" : data.status === "closed" ? "مغلق" : "صيانة"}
            </p>
            {data.status === "open" && (
              <p className="text-xs">التدفق: {data.current_flow?.toLocaleString('ar-SA')} / {data.max_flow?.toLocaleString('ar-SA')}</p>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

const PlazaZone = ({ plaza, plazaData, onClick, isSelected }) => {
  const data = plazaData?.find(p => p.zone === plaza.id) || {};
  const percentage = data.percentage || 0;
  
  const getColor = (pct) => {
    if (pct < 70) return "rgba(0, 77, 56, 0.3)";
    if (pct < 85) return "rgba(197, 160, 89, 0.4)";
    return "rgba(153, 27, 27, 0.4)";
  };
  
  const getBorderColor = (pct) => {
    if (pct < 70) return "#004D38";
    if (pct < 85) return "#C5A059";
    return "#991B1B";
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <g 
            className="cursor-pointer"
            onClick={() => onClick(plaza)}
          >
            <rect
              x={`${plaza.x - plaza.width/2}%`}
              y={`${plaza.y - plaza.height/2}%`}
              width={`${plaza.width}%`}
              height={`${plaza.height}%`}
              fill={getColor(percentage)}
              stroke={isSelected ? "#C5A059" : getBorderColor(percentage)}
              strokeWidth={isSelected ? 3 : 1.5}
              rx="8"
              className="transition-all duration-300 hover:opacity-80"
            />
            <text
              x={`${plaza.x}%`}
              y={`${plaza.y}%`}
              textAnchor="middle"
              dominantBaseline="middle"
              fill={percentage >= 85 ? "#991B1B" : "#1A1A1A"}
              fontSize="9"
              fontWeight="600"
              fontFamily="Cairo"
            >
              {Math.round(percentage)}%
            </text>
          </g>
        </TooltipTrigger>
        <TooltipContent side="top" className="text-right" dir="rtl">
          <div className="space-y-1">
            <p className="font-bold">{data.name || plaza.name}</p>
            <p className="text-xs">الحشود: {data.current_crowd?.toLocaleString('ar-SA') || 0}</p>
            <p className="text-xs">الطاقة القصوى: {data.max_capacity?.toLocaleString('ar-SA') || 0}</p>
            <p className="text-xs">نسبة الإشغال: {percentage}%</p>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

const MatafCenter = ({ matafData, onClick }) => {
  const totalCrowd = matafData?.reduce((sum, m) => sum + m.current_crowd, 0) || 0;
  const totalMax = matafData?.reduce((sum, m) => sum + m.max_capacity, 0) || 0;
  const percentage = totalMax ? Math.round((totalCrowd / totalMax) * 100) : 0;
  
  const getColor = (pct) => {
    if (pct < 70) return "#004D38";
    if (pct < 85) return "#C5A059";
    return "#991B1B";
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <g className="cursor-pointer" onClick={onClick}>
            {/* Outer ring - Mataf area */}
            <circle
              cx="50%"
              cy="50%"
              r="18%"
              fill="none"
              stroke={getColor(percentage)}
              strokeWidth="12"
              opacity="0.3"
            />
            {/* Middle ring */}
            <circle
              cx="50%"
              cy="50%"
              r="14%"
              fill="rgba(0, 77, 56, 0.1)"
              stroke={getColor(percentage)}
              strokeWidth="2"
            />
            {/* Kaaba center */}
            <rect
              x="46%"
              y="46%"
              width="8%"
              height="8%"
              fill="#1A1A1A"
              stroke="#C5A059"
              strokeWidth="2"
              rx="2"
            />
            {/* Percentage indicator */}
            <circle
              cx="50%"
              cy="50%"
              r="18%"
              fill="none"
              stroke={getColor(percentage)}
              strokeWidth="4"
              strokeDasharray={`${percentage * 1.13} ${113 - percentage * 1.13}`}
              strokeDashoffset="28"
              strokeLinecap="round"
            />
            {/* Text */}
            <text
              x="50%"
              y="38%"
              textAnchor="middle"
              fill="#1A1A1A"
              fontSize="10"
              fontWeight="bold"
              fontFamily="Cairo"
            >
              صحن المطاف
            </text>
            <text
              x="50%"
              y="64%"
              textAnchor="middle"
              fill={getColor(percentage)}
              fontSize="12"
              fontWeight="bold"
              fontFamily="Cairo"
            >
              {percentage}%
            </text>
          </g>
        </TooltipTrigger>
        <TooltipContent side="top" className="text-right" dir="rtl">
          <div className="space-y-1">
            <p className="font-bold">صحن المطاف</p>
            <p className="text-xs">إجمالي الحشود: {totalCrowd.toLocaleString('ar-SA')}</p>
            <p className="text-xs">الطاقة القصوى: {totalMax.toLocaleString('ar-SA')}</p>
            {matafData?.map((level, i) => (
              <p key={i} className="text-xs">{level.level}: {level.percentage}%</p>
            ))}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export const InteractiveMap = () => {
  const [gates, setGates] = useState([]);
  const [plazas, setPlazas] = useState([]);
  const [mataf, setMataf] = useState([]);
  const [selectedGate, setSelectedGate] = useState(null);
  const [selectedPlaza, setSelectedPlaza] = useState(null);
  const [zoom, setZoom] = useState(1);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(new Date());

  const fetchData = async () => {
    try {
      const [gatesRes, plazasRes, matafRes] = await Promise.all([
        axios.get(`${API}/gates`),
        axios.get(`${API}/plazas`),
        axios.get(`${API}/mataf`)
      ]);
      setGates(gatesRes.data);
      setPlazas(plazasRes.data);
      setMataf(matafRes.data);
      setLastUpdate(new Date());
    } catch (error) {
      console.error("Error fetching map data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 15000); // Update every 15 seconds
    return () => clearInterval(interval);
  }, []);

  const handleZoomIn = () => setZoom(prev => Math.min(prev + 0.2, 2));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 0.2, 0.6));
  const handleReset = () => {
    setZoom(1);
    setSelectedGate(null);
    setSelectedPlaza(null);
  };

  return (
    <Card className="h-full" data-testid="interactive-map">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <MapPin className="w-5 h-5 text-primary" />
            </div>
            <div>
              <CardTitle className="font-cairo text-lg">خريطة الحرم التفاعلية</CardTitle>
              <p className="text-xs text-muted-foreground">
                آخر تحديث: {lastUpdate.toLocaleTimeString('ar-SA')}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={fetchData} data-testid="map-refresh">
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
            <Button variant="outline" size="icon" onClick={handleZoomOut} data-testid="map-zoom-out">
              <ZoomOut className="w-4 h-4" />
            </Button>
            <Button variant="outline" size="icon" onClick={handleZoomIn} data-testid="map-zoom-in">
              <ZoomIn className="w-4 h-4" />
            </Button>
            <Button variant="outline" size="icon" onClick={handleReset} data-testid="map-reset">
              <Maximize2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-4">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          {/* Map Area */}
          <div className="lg:col-span-3 bg-gradient-to-b from-muted/30 to-muted/10 rounded-xl p-4 border border-gray-200">
            <div 
              className="relative w-full overflow-hidden rounded-lg bg-white"
              style={{ 
                height: '500px',
                transform: `scale(${zoom})`,
                transformOrigin: 'center center',
                transition: 'transform 0.3s ease'
              }}
            >
              <svg 
                viewBox="0 0 100 100" 
                className="w-full h-full"
                style={{ direction: 'ltr' }}
              >
                {/* Background pattern */}
                <defs>
                  <pattern id="grid" width="10" height="10" patternUnits="userSpaceOnUse">
                    <path d="M 10 0 L 0 0 0 10" fill="none" stroke="#E5E5E0" strokeWidth="0.3"/>
                  </pattern>
                </defs>
                <rect width="100" height="100" fill="url(#grid)" />
                
                {/* Haram boundary */}
                <rect
                  x="10"
                  y="10"
                  width="80"
                  height="80"
                  fill="none"
                  stroke="#004D38"
                  strokeWidth="0.5"
                  strokeDasharray="2 2"
                  rx="4"
                />
                
                {/* Plaza zones */}
                {plazaZones.map(plaza => (
                  <PlazaZone
                    key={plaza.id}
                    plaza={plaza}
                    plazaData={plazas}
                    onClick={setSelectedPlaza}
                    isSelected={selectedPlaza?.id === plaza.id}
                  />
                ))}
                
                {/* Mataf center */}
                <MatafCenter 
                  matafData={mataf} 
                  onClick={() => setSelectedPlaza({ id: 'mataf', name: 'صحن المطاف' })}
                />
                
                {/* Gate markers */}
                {gatePositions.map(gate => (
                  <GateMarker
                    key={gate.id}
                    gate={gate}
                    gateData={gates}
                    onClick={setSelectedGate}
                    isSelected={selectedGate?.id === gate.id}
                  />
                ))}
                
                {/* Compass */}
                <g transform="translate(92, 8)">
                  <circle cx="0" cy="0" r="5" fill="white" stroke="#004D38" strokeWidth="0.5" />
                  <text x="0" y="1" textAnchor="middle" fontSize="4" fill="#004D38" fontWeight="bold">N</text>
                </g>
              </svg>
            </div>
          </div>

          {/* Legend & Info Panel */}
          <div className="space-y-4">
            {/* Legend */}
            <Card>
              <CardHeader className="pb-2 pt-3">
                <CardTitle className="text-sm font-cairo">دليل الخريطة</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 pb-3">
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-muted-foreground">حالة الأبواب</p>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded-full bg-primary" />
                    <span className="text-xs">مفتوح</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded-full bg-destructive" />
                    <span className="text-xs">مغلق</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded-full bg-secondary" />
                    <span className="text-xs">صيانة</span>
                  </div>
                </div>
                
                <div className="space-y-2 pt-2 border-t">
                  <p className="text-xs font-semibold text-muted-foreground">نسبة الإشغال</p>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded bg-primary/30" />
                    <span className="text-xs">أقل من 70%</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded bg-secondary/40" />
                    <span className="text-xs">70% - 85%</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded bg-destructive/40" />
                    <span className="text-xs">أكثر من 85%</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Selected Info */}
            {selectedGate && (
              <Card className="border-primary/30 animate-fade-in">
                <CardHeader className="pb-2 pt-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-cairo flex items-center gap-2">
                      <DoorOpen className="w-4 h-4 text-primary" />
                      {selectedGate.name}
                    </CardTitle>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-6 w-6 p-0"
                      onClick={() => setSelectedGate(null)}
                    >
                      ×
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="pb-3">
                  {(() => {
                    const data = gates.find(g => g.number === selectedGate.id);
                    if (!data) return <p className="text-xs text-muted-foreground">جاري التحميل...</p>;
                    return (
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">الحالة</span>
                          <Badge className={
                            data.status === "open" ? "bg-primary" :
                            data.status === "closed" ? "bg-destructive" : "bg-secondary"
                          }>
                            {data.status === "open" ? "مفتوح" : data.status === "closed" ? "مغلق" : "صيانة"}
                          </Badge>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">الاتجاه</span>
                          <span>{data.direction === "entry" ? "دخول" : data.direction === "exit" ? "خروج" : "دخول/خروج"}</span>
                        </div>
                        {data.status === "open" && (
                          <>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">التدفق الحالي</span>
                              <span className="font-bold">{data.current_flow?.toLocaleString('ar-SA')}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">الطاقة القصوى</span>
                              <span>{data.max_flow?.toLocaleString('ar-SA')}</span>
                            </div>
                          </>
                        )}
                      </div>
                    );
                  })()}
                </CardContent>
              </Card>
            )}

            {selectedPlaza && selectedPlaza.id !== 'mataf' && (
              <Card className="border-secondary/30 animate-fade-in">
                <CardHeader className="pb-2 pt-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-cairo flex items-center gap-2">
                      <Users className="w-4 h-4 text-secondary" />
                      {plazas.find(p => p.zone === selectedPlaza.id)?.name || selectedPlaza.name}
                    </CardTitle>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-6 w-6 p-0"
                      onClick={() => setSelectedPlaza(null)}
                    >
                      ×
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="pb-3">
                  {(() => {
                    const data = plazas.find(p => p.zone === selectedPlaza.id);
                    if (!data) return <p className="text-xs text-muted-foreground">جاري التحميل...</p>;
                    return (
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">الحشود الحالية</span>
                          <span className="font-bold">{data.current_crowd?.toLocaleString('ar-SA')}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">الطاقة القصوى</span>
                          <span>{data.max_capacity?.toLocaleString('ar-SA')}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">نسبة الإشغال</span>
                          <Badge className={
                            data.percentage < 70 ? "bg-primary" :
                            data.percentage < 85 ? "bg-secondary" : "bg-destructive"
                          }>
                            {data.percentage}%
                          </Badge>
                        </div>
                      </div>
                    );
                  })()}
                </CardContent>
              </Card>
            )}

            {/* Quick Stats */}
            <Card>
              <CardHeader className="pb-2 pt-3">
                <CardTitle className="text-sm font-cairo">إحصائيات سريعة</CardTitle>
              </CardHeader>
              <CardContent className="pb-3 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">أبواب مفتوحة</span>
                  <span className="font-bold text-primary">
                    {gates.filter(g => g.status === "open").length} / {gates.length}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">ساحات حرجة</span>
                  <span className="font-bold text-destructive">
                    {plazas.filter(p => p.percentage >= 85).length}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">متوسط الإشغال</span>
                  <span className="font-bold">
                    {plazas.length ? Math.round(plazas.reduce((s, p) => s + p.percentage, 0) / plazas.length) : 0}%
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default InteractiveMap;
