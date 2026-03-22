import { useState } from "react";
import axios from "axios";
import { toast } from "sonner";
import { Upload, Download, FileSpreadsheet, CheckCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { API } from "./constants";

export function ImportDialog({ open, onClose, onSuccess }) {
  const [file, setFile] = useState(null);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState(null);

  const handleImport = async () => {
    if (!file) return;
    setImporting(true);
    setResult(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const token = localStorage.getItem("token");
      const res = await axios.post(`${API}/daily-stats/import`, formData, {
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "multipart/form-data" },
      });
      setResult(res.data);
      if (res.data.created > 0 || res.data.updated > 0) {
        toast.success(`تم استيراد ${res.data.created} سجل جديد وتحديث ${res.data.updated} سجل`);
        onSuccess();
      }
    } catch (err) {
      toast.error(err.response?.data?.detail || "فشل الاستيراد");
    } finally {
      setImporting(false);
    }
  };

  const downloadTemplate = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(`${API}/daily-stats/export/template`, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: "blob",
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", "daily_stats_template.xlsx");
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success("تم تحميل القالب");
    } catch {
      toast.error("فشل تحميل القالب");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md" dir="rtl">
        <DialogHeader>
          <DialogTitle className="font-cairo flex items-center gap-2">
            <Upload className="w-5 h-5" />
            استيراد من Excel
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            ارفع ملف Excel يحتوي على الإحصائيات اليومية
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="border-2 border-dashed rounded-lg p-6 text-center hover:border-primary/50 transition-colors cursor-pointer"
            onClick={() => document.getElementById("stats-import-file").click()}
            data-testid="import-drop-zone"
          >
            <FileSpreadsheet className="w-10 h-10 mx-auto mb-2 text-muted-foreground" />
            <p className="text-sm font-cairo">
              {file ? file.name : "اضغط لاختيار ملف Excel"}
            </p>
            <p className="text-xs text-muted-foreground mt-1">.xlsx</p>
            <input
              id="stats-import-file"
              type="file"
              accept=".xlsx,.xls"
              className="hidden"
              onChange={(e) => {
                setFile(e.target.files[0]);
                setResult(null);
              }}
            />
          </div>

          <Button variant="outline" size="sm" className="w-full gap-2" onClick={downloadTemplate} data-testid="download-template">
            <Download className="w-4 h-4" />
            تحميل قالب Excel
          </Button>

          {result && (
            <div className="bg-muted/50 rounded-lg p-3 text-xs space-y-1" data-testid="import-result">
              <div className="flex items-center gap-2 text-emerald-600">
                <CheckCircle className="w-4 h-4" />
                <span>جديد: {result.created} | محدث: {result.updated} | تخطي: {result.skipped}</span>
              </div>
              {result.errors?.length > 0 && (
                <div className="text-destructive mt-1">
                  <p className="font-semibold">أخطاء:</p>
                  {result.errors.map((e, i) => (
                    <p key={i}>{e}</p>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose}>
            إغلاق
          </Button>
          <Button onClick={handleImport} disabled={!file || importing} data-testid="import-submit">
            {importing ? <Loader2 className="w-4 h-4 animate-spin ml-2" /> : <Upload className="w-4 h-4 ml-2" />}
            استيراد
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
