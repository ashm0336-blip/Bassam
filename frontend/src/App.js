import "@/App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import Layout from "@/components/Layout";
import Dashboard from "@/pages/Dashboard";
import PlanningDepartment from "@/pages/PlanningDepartment";
import PlazasDepartment from "@/pages/PlazasDepartment";
import GatesDepartment from "@/pages/GatesDepartment";
import CrowdServicesDepartment from "@/pages/CrowdServicesDepartment";
import MatafDepartment from "@/pages/MatafDepartment";
import ReportsPage from "@/pages/ReportsPage";
import NotificationsPage from "@/pages/NotificationsPage";
import SettingsPage from "@/pages/SettingsPage";

function App() {
  return (
    <div className="App" dir="rtl">
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<Dashboard />} />
            <Route path="planning" element={<PlanningDepartment />} />
            <Route path="plazas" element={<PlazasDepartment />} />
            <Route path="gates" element={<GatesDepartment />} />
            <Route path="crowd-services" element={<CrowdServicesDepartment />} />
            <Route path="mataf" element={<MatafDepartment />} />
            <Route path="reports" element={<ReportsPage />} />
            <Route path="notifications" element={<NotificationsPage />} />
            <Route path="settings" element={<SettingsPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
      <Toaster position="top-left" dir="rtl" />
    </div>
  );
}

export default App;
