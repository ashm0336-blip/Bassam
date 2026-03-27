import { useSearchParams } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import DepartmentSettings from "@/pages/DepartmentSettings";

export default function GeneralAdminDepartment() {
  const [searchParams] = useSearchParams();
  const rawTab = searchParams.get('tab') || 'settings';
  const activeTab = rawTab === 'overview' ? 'settings' : rawTab;
  const { canViewPage } = useAuth();

  const dept = "general_admin";
  const base = "/general-admin";

  return (
    <div className="space-y-6" data-testid="general-admin-page">
      {activeTab === 'settings' && canViewPage(`${base}?tab=settings`) && <DepartmentSettings department={dept} />}
    </div>
  );
}
