import { useSearchParams } from "react-router-dom";
import HaramInteractiveMap from "@/components/HaramInteractiveMap";
import DepartmentSettings from "@/pages/DepartmentSettings";
import { useAuth } from "@/context/AuthContext";

export default function HaramMapPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === "system_admin";
  const [searchParams] = useSearchParams();
  const activeTab = searchParams.get("tab") || "dashboard";

  return (
    <div className="space-y-6" data-testid="haram-map-page">
      {activeTab === "dashboard" && <HaramInteractiveMap isAdmin={isAdmin} />}
      {activeTab === "settings" && <DepartmentSettings department="plazas" />}
    </div>
  );
}
