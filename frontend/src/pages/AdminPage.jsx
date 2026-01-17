import { useState } from "react";
import { useLanguage } from "@/context/LanguageContext";
import { 
  LayoutDashboard,
  Users,
  Activity,
  Settings,
  List,
  Menu,
  Map as MapIcon
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import AdminDashboard from "./admin/AdminDashboard";
import UserManagement from "./admin/UserManagement";
import ActivityLog from "./admin/ActivityLog";
import SystemSettings from "./admin/SystemSettings";
import DropdownManager from "./admin/DropdownManager";
import SidebarManager from "./admin/SidebarManager";
import MapManager from "./admin/MapManager";

export default function AdminPage() {
  const { language } = useLanguage();
  const [activeTab, setActiveTab] = useState("dashboard");

  return (
    <div className="space-y-6" data-testid="admin-page">
      {/* Header */}
      <div className="bg-gradient-to-r from-red-600 to-red-700 rounded-xl p-6 text-white">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center">
            <Settings className="w-6 h-6" />
          </div>
          <div>
            <h1 className="font-cairo font-bold text-2xl">
              {language === 'ar' ? 'لوحة تحكم مسؤول النظام' : 'System Admin Control Panel'}
            </h1>
            <p className="text-sm text-white/80">
              {language === 'ar' ? 'إدارة كاملة للمستخدمين والنظام' : 'Complete user and system management'}
            </p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full" dir="rtl">
        <TabsList className="grid w-full grid-cols-7 h-auto p-1">
          <TabsTrigger value="dashboard" className="flex flex-col gap-1 py-3 data-[state=active]:bg-primary data-[state=active]:text-white">
            <LayoutDashboard className="w-5 h-5" />
            <span className="text-xs">{language === 'ar' ? 'لوحة التحكم' : 'Dashboard'}</span>
          </TabsTrigger>
          <TabsTrigger value="users" className="flex flex-col gap-1 py-3 data-[state=active]:bg-primary data-[state=active]:text-white">
            <Users className="w-5 h-5" />
            <span className="text-xs">{language === 'ar' ? 'المستخدمون' : 'Users'}</span>
          </TabsTrigger>
          <TabsTrigger value="activity" className="flex flex-col gap-1 py-3 data-[state=active]:bg-primary data-[state=active]:text-white">
            <Activity className="w-5 h-5" />
            <span className="text-xs">{language === 'ar' ? 'سجل النشاط' : 'Activity Log'}</span>
          </TabsTrigger>
          <TabsTrigger value="maps" className="flex flex-col gap-1 py-3 data-[state=active]:bg-primary data-[state=active]:text-white">
            <MapIcon className="w-5 h-5" />
            <span className="text-xs">{language === 'ar' ? 'الخرائط' : 'Maps'}</span>
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex flex-col gap-1 py-3 data-[state=active]:bg-primary data-[state=active]:text-white">
            <Settings className="w-5 h-5" />
            <span className="text-xs">{language === 'ar' ? 'الإعدادات' : 'Settings'}</span>
          </TabsTrigger>
          <TabsTrigger value="dropdowns" className="flex flex-col gap-1 py-3 data-[state=active]:bg-primary data-[state=active]:text-white">
            <List className="w-5 h-5" />
            <span className="text-xs">{language === 'ar' ? 'القوائم' : 'Dropdowns'}</span>
          </TabsTrigger>
          <TabsTrigger value="sidebar" className="flex flex-col gap-1 py-3 data-[state=active]:bg-primary data-[state=active]:text-white">
            <Menu className="w-5 h-5" />
            <span className="text-xs">{language === 'ar' ? 'القائمة الجانبية' : 'Sidebar'}</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="mt-6">
          <AdminDashboard />
        </TabsContent>

        <TabsContent value="users" className="mt-6">
          <UserManagement />
        </TabsContent>

        <TabsContent value="activity" className="mt-6">
          <ActivityLog />
        </TabsContent>

        <TabsContent value="maps" className="mt-6">
          <MapManager />
        </TabsContent>

        <TabsContent value="settings" className="mt-6">
          <SystemSettings />
        </TabsContent>

        <TabsContent value="dropdowns" className="mt-6">
          <DropdownManager />
        </TabsContent>

        <TabsContent value="sidebar" className="mt-6">
          <SidebarManager />
        </TabsContent>
      </Tabs>
    </div>
  );
}
