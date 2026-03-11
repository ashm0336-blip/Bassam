import { useSearchParams } from "react-router-dom";
import DepartmentOverview from "@/pages/DepartmentOverview";
import DepartmentSettings from "@/pages/DepartmentSettings";
import TasksPage from "@/pages/TasksPage";

export default function PlazasDepartment() {
  const [searchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'dashboard';

  return (
    <div className="space-y-6" data-testid="plazas-page">
      {activeTab === 'dashboard'     && <DepartmentOverview department="squares" />}
      {activeTab === 'employees'     && <DepartmentSettings department="squares" />}
      {activeTab === 'transactions'  && <TasksPage department="squares" />}
      {activeTab === 'settings'      && <DepartmentSettings department="squares" />}
    </div>
  );
}
