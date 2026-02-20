import HaramInteractiveMap from "@/components/HaramInteractiveMap";
import { useAuth } from "@/context/AuthContext";

export default function HaramMapPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === "system_admin";

  return (
    <div className="space-y-6" data-testid="haram-map-page">
      <HaramInteractiveMap isAdmin={isAdmin} />
    </div>
  );
}
