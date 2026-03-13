import { useState } from "react";
import { useLanguage } from "@/context/LanguageContext";
import { 
  LayoutDashboard, Activity, Settings, Shield, UserCircle,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import AdminDashboard from "./admin/AdminDashboard";
import ActivityLog from "./admin/ActivityLog";
import SystemSettings from "./admin/SystemSettings";
import SidebarManager from "./admin/SidebarManager";
import PermissionsManager from "./admin/PermissionsManager";
import MyAccountTab from "./admin/MyAccountTab";

export default function AdminPage() {
  const { language } = useLanguage();
  const isAr = language === 'ar';
  const [activeTab, setActiveTab] = useState("overview");
  const [accessSubTab, setAccessSubTab] = useState("permissions");

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
              {isAr ? 'لوحة تحكم مسؤول النظام' : 'System Admin Control Panel'}
            </h1>
            <p className="text-sm text-white/80">
              {isAr ? 'إدارة كاملة للنظام والإعدادات' : 'Complete system and settings management'}
            </p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full" dir="rtl">
        <TabsList className="grid w-full grid-cols-5 h-auto p-1">
          <TabsTrigger value="overview" className="flex flex-col gap-1 py-3 data-[state=active]:bg-primary data-[state=active]:text-white" data-testid="tab-overview">
            <LayoutDashboard className="w-5 h-5" />
            <span className="text-xs">{isAr ? 'نظرة عامة' : 'Overview'}</span>
          </TabsTrigger>
          <TabsTrigger value="account" className="flex flex-col gap-1 py-3 data-[state=active]:bg-primary data-[state=active]:text-white" data-testid="tab-account">
            <UserCircle className="w-5 h-5" />
            <span className="text-xs">{isAr ? 'حسابي' : 'My Account'}</span>
          </TabsTrigger>
          <TabsTrigger value="access" className="flex flex-col gap-1 py-3 data-[state=active]:bg-primary data-[state=active]:text-white" data-testid="tab-access">
            <Shield className="w-5 h-5" />
            <span className="text-xs">{isAr ? 'الصلاحيات والتحكم' : 'Access Control'}</span>
          </TabsTrigger>
          <TabsTrigger value="activity" className="flex flex-col gap-1 py-3 data-[state=active]:bg-primary data-[state=active]:text-white" data-testid="tab-activity">
            <Activity className="w-5 h-5" />
            <span className="text-xs">{isAr ? 'سجل النشاط' : 'Activity'}</span>
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex flex-col gap-1 py-3 data-[state=active]:bg-primary data-[state=active]:text-white" data-testid="tab-settings">
            <Settings className="w-5 h-5" />
            <span className="text-xs">{isAr ? 'إعدادات النظام' : 'Settings'}</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6">
          <AdminDashboard />
        </TabsContent>

        <TabsContent value="account" className="mt-6">
          <MyAccountTab />
        </TabsContent>

        <TabsContent value="access" className="mt-6">
          <div className="space-y-4">
            {/* Sub-tabs */}
            <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-100 w-fit" data-testid="access-sub-tabs">
              {[
                { id: "permissions", label: isAr ? "الصلاحيات حسب الدور" : "Role Permissions", icon: Shield },
                { id: "sidebar", label: isAr ? "إدارة القائمة الجانبية" : "Sidebar Manager", icon: LayoutDashboard },
              ].map(tab => {
                const Icon = tab.icon;
                const isActive = accessSubTab === tab.id;
                return (
                  <button key={tab.id} onClick={() => setAccessSubTab(tab.id)} data-testid={`sub-tab-${tab.id}`}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-cairo font-semibold transition-all
                      ${isActive ? 'bg-white shadow-md text-primary' : 'text-slate-500 hover:text-slate-700 hover:bg-white/50'}`}>
                    <Icon className="w-4 h-4" />
                    {tab.label}
                  </button>
                );
              })}
            </div>

            {/* Sub-tab content */}
            {accessSubTab === "permissions" && <PermissionsManager />}
            {accessSubTab === "sidebar" && <SidebarManager />}
          </div>
        </TabsContent>

        <TabsContent value="activity" className="mt-6">
          <ActivityLog />
        </TabsContent>

        <TabsContent value="settings" className="mt-6">
          <SystemSettings />
        </TabsContent>
      </Tabs>
    </div>
  );
}
