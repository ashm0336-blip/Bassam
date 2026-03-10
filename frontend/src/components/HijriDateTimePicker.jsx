import { useState } from "react";
import DatePicker from "react-datepicker";
import momentHijri from "moment-hijri";
import "react-datepicker/dist/react-datepicker.css";
import { Calendar, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function HijriDateTimePicker({ 
  value, 
  onChange, 
  label, 
  maxDate = null,
  minDate = null,
  required = false,
  disabled = false 
}) {
  const [calendarType, setCalendarType] = useState("gregorian"); // gregorian or hijri
  
  const selectedDate = value ? new Date(value) : null;
  
  const handleDateChange = (date) => {
    if (date) {
      onChange(date.toISOString());
    } else {
      onChange(null);
    }
  };
  
  // Format Hijri date
  const getHijriDate = (date) => {
    if (!date) return "";
    const m = momentHijri(date);
    return m.format('iYYYY/iMM/iDD');
  };
  
  // Format Gregorian date
  const getGregorianDate = (date) => {
    if (!date) return "";
    return new Date(date).toLocaleDateString('ar-SA');
  };
  
  return (
    <div className="space-y-2">
      {label && (
        <Label className="text-right block">
          {label}
          {required && <span className="text-red-500 mr-1">*</span>}
        </Label>
      )}
      
      <div className="flex gap-2 items-center">
        <div className="flex-1">
          <DatePicker
            selected={selectedDate}
            onChange={handleDateChange}
            showTimeSelect
            timeFormat="HH:mm"
            timeIntervals={15}
            dateFormat="yyyy/MM/dd HH:mm"
            maxDate={maxDate}
            minDate={minDate}
            disabled={disabled}
            placeholderText="اختر التاريخ والوقت"
            className="w-full px-3 py-2 border border-input rounded-md bg-background text-right"
            calendarClassName="custom-datepicker"
            wrapperClassName="w-full"
          />
        </div>
        
        <Select value={calendarType} onValueChange={setCalendarType}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="gregorian">ميلادي</SelectItem>
            <SelectItem value="hijri">هجري</SelectItem>
          </SelectContent>
        </Select>
      </div>
      
      {selectedDate && (
        <div className="flex gap-3 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            <span>ميلادي: {getGregorianDate(selectedDate)}</span>
          </div>
          <div className="flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            <span>هجري: {getHijriDate(selectedDate)}</span>
          </div>
        </div>
      )}
    </div>
  );
}
