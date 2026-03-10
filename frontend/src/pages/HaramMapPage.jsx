import { useSearchParams } from "react-router-dom";
import DepartmentOverview from "@/pages/DepartmentOverview";
import DepartmentSettings from "@/pages/DepartmentSettings";
import TransactionsPage from "@/pages/TransactionsPage";

export default function HaramMapPage() {
  const [searchParams] = useSearchParams();
  const activeTab = searchParams.get("tab") || "dashboard";

  return (
    <div data-testid="haram-map-page">
      {activeTab === "dashboard" && <DepartmentOverview department="haram_map" />}
      {activeTab === "transactions" && <TransactionsPage department="haram_map" />}
      {activeTab === "settings" && <DepartmentSettings department="haram_map" />}
    </div>
  );
}
