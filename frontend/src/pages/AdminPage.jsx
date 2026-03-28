import { useState } from "react";
import { useLanguage } from "@/context/LanguageContext";
import { 
  LayoutDashboard, Settings, Shield, UserCircle,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import AdminDashboard from "./admin/AdminDashboard";
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
    { value: "settings", icon: Settings, label: isAr ? 'الإعدادات' : 'Settings' },
  ];

  return (
    <div className="space-y-4 sm:space-y-6" data-testid="admin-page">
      <div className="bg-gradient-to-l from-red-600 via-red-700 to-red-800 rounded-xl p-3 sm:p-6 text-white shadow-lg">
        <div className="flex items-center gap-2.5 sm:gap-4">
          <div className="w-10 h-10 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl bg-white/15 backdrop-blur-sm flex items-center justify-center border border-white/10 flex-shrink-0">
            <Settings className="w-5 h-5 sm:w-7 sm:h-7" />
          </div>
          <div className="min-w-0">
            <h1 className="font-cairo font-bold text-base sm:text-2xl leading-tight truncate">
              {isAr ? 'لوحة تحكم مسؤول النظام' : 'System Admin Control Panel'}
            </h1>
            <p className="text-[10px] sm:text-sm text-white/70 mt-0.5 truncate">
              {isAr ? 'إدارة المستخدمين والصلاحيات والإعدادات' : 'Manage users, permissions, and settings'}
            </p>
          </div>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full" dir="rtl">
        <TabsList className="flex w-full h-auto p-1 sm:p-1.5 bg-muted/50 overflow-x-auto no-scrollbar gap-0.5 sm:gap-1">
          {tabs.map(tab => {
            const Icon = tab.icon;
            return (
              <TabsTrigger key={tab.value} value={tab.value}
                className="flex-1 min-w-0 flex flex-col items-center gap-0.5 sm:gap-1.5 py-2 sm:py-3 data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow-md transition-all"
                data-testid={`tab-${tab.value}`}>
                <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
                <span className="text-[9px] sm:text-[11px] font-semibold truncate max-w-full">{tab.label}</span>
              </TabsTrigger>
            );
          })}
        </TabsList>

        <TabsContent value="overview" className="mt-3 sm:mt-6"><AdminDashboard /></TabsContent>
        <TabsContent value="account" className="mt-3 sm:mt-6"><MyAccountTab /></TabsContent>
        <TabsContent value="access" className="mt-3 sm:mt-6"><PermissionsManager /></TabsContent>
        <TabsContent value="settings" className="mt-3 sm:mt-6"><SystemSettings /></TabsContent>
      </Tabs>
    </div>
  );
}
