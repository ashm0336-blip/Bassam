import { useState, useEffect, useMemo } from "react";
import axios from "axios";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export function useZoneEmployees(activeZones) {
  const [employees, setEmployees] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await axios.get(`${API}/employees?department=plazas`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setEmployees(res.data.filter(e => e.is_active));
      } catch {}
    };
    fetchData();
  }, []);

  // Returns { zone_code: { count, employees: [...] } }
  const zoneEmployeeMap = useMemo(() => {
    const map = {};
    activeZones.forEach(z => { map[z.zone_code] = { count: 0, employees: [] }; });
    employees.forEach(emp => {
      if (emp.location) {
        const zone = activeZones.find(z => z.zone_code === emp.location || z.name_ar === emp.location || z.name_en === emp.location);
        if (zone && map[zone.zone_code]) {
          map[zone.zone_code].count++;
          map[zone.zone_code].employees.push(emp);
        }
      }
    });
    return map;
  }, [activeZones, employees]);

  return zoneEmployeeMap;
}
