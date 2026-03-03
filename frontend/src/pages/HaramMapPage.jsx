import { useSearchParams } from "react-router-dom";
import PrayerAreasDashboard from "@/pages/PrayerAreasDashboard";
import DepartmentSettings from "@/pages/DepartmentSettings";
import { useAuth } from "@/context/AuthContext";

export default function HaramMapPage() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const activeTab = searchParams.get("tab") || "dashboard";

  return (
    <div data-testid="haram-map-page">
      {activeTab === "dashboard" && <PrayerAreasDashboard />}
      {activeTab === "settings" && <DepartmentSettings department="plazas" />}
    </div>
  );
}
