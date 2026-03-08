import { useSearchParams } from "react-router-dom";
import DepartmentOverview from "@/pages/DepartmentOverview";
import DepartmentSettings from "@/pages/DepartmentSettings";

export default function HaramMapPage() {
  const [searchParams] = useSearchParams();
  const activeTab = searchParams.get("tab") || "dashboard";

  return (
    <div data-testid="haram-map-page">
      {activeTab === "dashboard" && <DepartmentOverview department="plazas" />}
      {activeTab === "settings" && <DepartmentSettings department="plazas" />}
    </div>
  );
}
