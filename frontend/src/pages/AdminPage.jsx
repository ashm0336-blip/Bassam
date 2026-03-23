import { useState } from "react";
import { useLanguage } from "@/context/LanguageContext";
import { 
  LayoutDashboard, Activity, Settings, Shield, UserCircle,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import AdminDashboard from "./admin/AdminDashboard";
import ActivityLog from "./admin/ActivityLog";
import SystemSettings from "./admin/SystemSettings";
import PermissionsManager from "./admin/PermissionsManager";
import MyAccountTab from "./admin/MyAccountTab";

export default function AdminPage() {
  const { language } = useLanguage();
  const isAr = language === 'ar';
  const [activeTab, setActiveTab] = useState("overview");

  const tabs = [
    { value: "overview", icon: LayoutDashboard, label: isAr ? 'نظرة عامة' : 'Overview' },
    { value: "account", icon: UserCircle, label: isAr ? 'حسابي' : 'My Account' },
    { value: "access", icon: Shield, label: isAr ? 'الصلاحيات' : 'Access' },
    { value: "activity", icon: Activity, label: isAr ? 'سجل النشاط' : 'Activity' },
    { value: "settings", icon: Settings, label: isAr ? 'الإعدادات' : 'Settings' },
  ];

  return (
    <div className="space-y-6" data-testid="admin-page">
      <div className="bg-gradient-to-l from-red-600 via-red-700 to-red-800 rounded-xl p-6 text-white shadow-lg">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-white/15 backdrop-blur-sm flex items-center justify-center border border-white/10">
            <Settings className="w-7 h-7" />
          </div>
          <div>
            <h1 className="font-cairo font-bold text-2xl">
              {isAr ? 'لوحة تحكم مسؤول النظام' : 'System Admin Control Panel'}
            </h1>
            <p className="text-sm text-white/70 mt-0.5">
              {isAr ? 'إدارة المستخدمين والصلاحيات والإعدادات' : 'Manage users, permissions, and settings'}
            </p>
          </div>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full" dir="rtl">
        <TabsList className="grid w-full grid-cols-5 h-auto p-1.5 bg-muted/50">
          {tabs.map(tab => {
            const Icon = tab.icon;
            return (
              <TabsTrigger key={tab.value} value={tab.value}
                className="flex flex-col gap-1.5 py-3 data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow-md transition-all"
                data-testid={`tab-${tab.value}`}>
                <Icon className="w-5 h-5" />
                <span className="text-[11px] font-semibold">{tab.label}</span>
              </TabsTrigger>
            );
          })}
        </TabsList>

        <TabsContent value="overview" className="mt-6"><AdminDashboard /></TabsContent>
        <TabsContent value="account" className="mt-6"><MyAccountTab /></TabsContent>
        <TabsContent value="access" className="mt-6"><PermissionsManager /></TabsContent>
        <TabsContent value="activity" className="mt-6"><ActivityLog /></TabsContent>
        <TabsContent value="settings" className="mt-6"><SystemSettings /></TabsContent>
      </Tabs>
    </div>
  );
}
