import { useSearchParams } from "react-router-dom";
import DepartmentOverview from "@/pages/DepartmentOverview";
import DepartmentSettings from "@/pages/DepartmentSettings";
import TasksPage from "@/pages/TasksPage";

export default function CrowdServicesDepartment() {
  const [searchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'dashboard';

  return (
    <div className="space-y-6" data-testid="crowd-services-page">
      {activeTab === 'dashboard'     && <DepartmentOverview department="crowd_services" />}
      {activeTab === 'employees'     && <DepartmentSettings department="crowd_services" />}
      {activeTab === 'transactions'  && <TasksPage department="crowd_services" />}
      {activeTab === 'settings'      && <DepartmentSettings department="crowd_services" />}
    </div>
  );
}
