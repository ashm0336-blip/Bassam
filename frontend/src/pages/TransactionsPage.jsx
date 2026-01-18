import { useState, useEffect } from "react";
import axios from "axios";
import { useLanguage } from "@/context/LanguageContext";
import { useAuth } from "@/context/AuthContext";
import {
  FileText,
  Plus,
  Search,
  Filter,
  Download,
  Clock,
  CheckCircle,
  AlertCircle,
  XCircle
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function TransactionsPage() {
  const { language } = useLanguage();
  const { user, isReadOnly } = useAuth();
  const [transactions, setTransactions] = useState([]);
  const [stats, setStats] = useState({});
  const [filterStatus, setFilterStatus] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [loading, setLoading] = useState(true);

  const [formData, setFormData] = useState({
    transaction_number: "",
    transaction_date: "",
    subject: "",
    assigned_to: "",
    priority: "normal",
    department: user?.department || "gates",
    due_date: "",
    notes: ""
  });

  useEffect(() => {
    fetchTransactions();
    fetchStats();
  }, [filterStatus]);

  const fetchTransactions = async () => {
    try {
      const token = localStorage.getItem("token");
      const url = filterStatus === "all" 
        ? `${API}/transactions`
        : `${API}/transactions?status=${filterStatus}`;
      
      const response = await axios.get(url, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setTransactions(response.data);
    } catch (error) {
      console.error("Error fetching transactions:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(`${API}/transactions/stats`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setStats(response.data);
    } catch (error) {
      console.error("Error fetching stats:", error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      const token = localStorage.getItem("token");
      await axios.post(`${API}/transactions`, formData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      toast.success(language === 'ar' ? 'تمت إضافة المعاملة بنجاح' : 'Transaction added successfully');
      setDialogOpen(false);
      fetchTransactions();
      fetchStats();
      
      // Reset form
      setFormData({
        transaction_number: "",
        transaction_date: "",
        subject: "",
        assigned_to: "",
        priority: "normal",
        department: user?.department || "gates",
        due_date: "",
        notes: ""
      });
    } catch (error) {
      console.error("Error creating transaction:", error);
      toast.error(language === 'ar' ? 'فشل إضافة المعاملة' : 'Failed to add transaction');
    }
  };

  const handleStatusUpdate = async (transactionId, newStatus) => {
    try {
      const token = localStorage.getItem("token");
      await axios.put(
        `${API}/transactions/${transactionId}`,
        { status: newStatus },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      toast.success(language === 'ar' ? 'تم تحديث الحالة' : 'Status updated');
      fetchTransactions();
      fetchStats();
    } catch (error) {
      console.error("Error updating status:", error);
      toast.error(language === 'ar' ? 'فشل التحديث' : 'Failed to update');
    }
  };

  const statusConfig = {
    pending: { 
      label_ar: "قيد الانتظار", 
      label_en: "Pending", 
      color: "bg-yellow-100 text-yellow-800 border-yellow-200",
      icon: Clock
    },
    in_progress: { 
      label_ar: "تحت الإجراء", 
      label_en: "In Progress", 
      color: "bg-blue-100 text-blue-800 border-blue-200",
      icon: AlertCircle
    },
    completed: { 
      label_ar: "مكتمل", 
      label_en: "Completed", 
      color: "bg-green-100 text-green-800 border-green-200",
      icon: CheckCircle
    }
  };

  const filteredTransactions = transactions.filter(t => 
    t.transaction_number.includes(searchQuery) || 
    t.subject.includes(searchQuery) ||
    t.assigned_to.includes(searchQuery)
  );

  return (
    <div className="space-y-6" data-testid="transactions-page">
      {/* Header with Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="text-right">
                <p className="text-xs text-muted-foreground">{language === 'ar' ? 'الإجمالي' : 'Total'}</p>
                <p className="text-2xl font-bold">{stats.total || 0}</p>
              </div>
              <FileText className="w-8 h-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="text-right">
                <p className="text-xs text-muted-foreground">{language === 'ar' ? 'قيد الانتظار' : 'Pending'}</p>
                <p className="text-2xl font-bold text-yellow-600">{stats.pending || 0}</p>
              </div>
              <Clock className="w-8 h-8 text-yellow-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="text-right">
                <p className="text-xs text-muted-foreground">{language === 'ar' ? 'تحت الإجراء' : 'In Progress'}</p>
                <p className="text-2xl font-bold text-blue-600">{stats.in_progress || 0}</p>
              </div>
              <AlertCircle className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="text-right">
                <p className="text-xs text-muted-foreground">{language === 'ar' ? 'مكتمل' : 'Completed'}</p>
                <p className="text-2xl font-bold text-green-600">{stats.completed || 0}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Toolbar */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-3 flex-wrap">
            {!isReadOnly() && (
              <Button onClick={() => setDialogOpen(true)} className="bg-primary">
                <Plus className="w-4 h-4 ml-2" />
                {language === 'ar' ? 'معاملة جديدة' : 'New Transaction'}
              </Button>
            )}
            
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder={language === 'ar' ? 'بحث برقم المعاملة أو الموضوع...' : 'Search...'}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pr-10"
                />
              </div>
            </div>
            
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{language === 'ar' ? 'الكل' : 'All'}</SelectItem>
                <SelectItem value="pending">{language === 'ar' ? 'قيد الانتظار' : 'Pending'}</SelectItem>
                <SelectItem value="in_progress">{language === 'ar' ? 'تحت الإجراء' : 'In Progress'}</SelectItem>
                <SelectItem value="completed">{language === 'ar' ? 'مكتمل' : 'Completed'}</SelectItem>
              </SelectContent>
            </Select>
            
            <Button variant="outline">
              <Download className="w-4 h-4 ml-2" />
              {language === 'ar' ? 'تصدير' : 'Export'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Transactions Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-right">{language === 'ar' ? 'رقم المعاملة' : 'Number'}</TableHead>
                  <TableHead className="text-right">{language === 'ar' ? 'التاريخ' : 'Date'}</TableHead>
                  <TableHead className="text-right">{language === 'ar' ? 'الموضوع' : 'Subject'}</TableHead>
                  <TableHead className="text-center">{language === 'ar' ? 'المستلم' : 'Assigned'}</TableHead>
                  <TableHead className="text-center">{language === 'ar' ? 'الأولوية' : 'Priority'}</TableHead>
                  <TableHead className="text-center">{language === 'ar' ? 'الحالة' : 'Status'}</TableHead>
                  <TableHead className="text-center">{language === 'ar' ? 'الإجراءات' : 'Actions'}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTransactions.map((transaction) => {
                  const StatusIcon = statusConfig[transaction.status]?.icon || Clock;
                  
                  return (
                    <TableRow key={transaction.id}>
                      <TableCell className="text-right font-bold">{transaction.transaction_number}</TableCell>
                      <TableCell className="text-right text-sm">{transaction.transaction_date}</TableCell>
                      <TableCell className="text-right">
                        <p className="font-medium">{transaction.subject}</p>
                        {transaction.notes && (
                          <p className="text-xs text-muted-foreground mt-1">{transaction.notes.substring(0, 50)}...</p>
                        )}
                      </TableCell>
                      <TableCell className="text-center text-sm">{transaction.assigned_to}</TableCell>
                      <TableCell className="text-center">
                        <Badge variant={transaction.priority === 'urgent' ? 'destructive' : 'outline'} className="text-xs">
                          {transaction.priority}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        {!isReadOnly() ? (
                          <Select 
                            value={transaction.status} 
                            onValueChange={(v) => handleStatusUpdate(transaction.id, v)}
                          >
                            <SelectTrigger className="h-8 w-32">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="pending">{language === 'ar' ? 'قيد الانتظار' : 'Pending'}</SelectItem>
                              <SelectItem value="in_progress">{language === 'ar' ? 'تحت الإجراء' : 'In Progress'}</SelectItem>
                              <SelectItem value="completed">{language === 'ar' ? 'مكتمل' : 'Completed'}</SelectItem>
                            </SelectContent>
                          </Select>
                        ) : (
                          <Badge className={statusConfig[transaction.status]?.color}>
                            {language === 'ar' 
                              ? statusConfig[transaction.status]?.label_ar 
                              : statusConfig[transaction.status]?.label_en
                            }
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setSelectedTransaction(transaction);
                            setDetailsDialogOpen(true);
                          }}
                        >
                          {language === 'ar' ? 'التفاصيل' : 'Details'}
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Add Transaction Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle className="font-cairo text-right">
              {language === 'ar' ? 'إضافة معاملة جديدة' : 'Add New Transaction'}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4" dir="rtl">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-right block mb-2">{language === 'ar' ? 'رقم المعاملة' : 'Transaction Number'}</Label>
                <Input
                  value={formData.transaction_number}
                  onChange={(e) => setFormData({...formData, transaction_number: e.target.value})}
                  placeholder="80360"
                  className="text-right"
                  required
                />
              </div>
              <div>
                <Label className="text-right block mb-2">{language === 'ar' ? 'التاريخ (هجري)' : 'Date (Hijri)'}</Label>
                <Input
                  value={formData.transaction_date}
                  onChange={(e) => setFormData({...formData, transaction_date: e.target.value})}
                  placeholder="1447/07/16"
                  className="text-right"
                  required
                />
              </div>
            </div>

            <div>
              <Label className="text-right block mb-2">{language === 'ar' ? 'الموضوع' : 'Subject'}</Label>
              <Textarea
                value={formData.subject}
                onChange={(e) => setFormData({...formData, subject: e.target.value})}
                placeholder={language === 'ar' ? 'بشأن...' : 'Regarding...'}
                className="text-right"
                rows={2}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-right block mb-2">{language === 'ar' ? 'المستلم' : 'Assigned To'}</Label>
                <Input
                  value={formData.assigned_to}
                  onChange={(e) => setFormData({...formData, assigned_to: e.target.value})}
                  placeholder={language === 'ar' ? 'اسم الموظف' : 'Employee name'}
                  className="text-right"
                  required
                />
              </div>
              <div>
                <Label className="text-right block mb-2">{language === 'ar' ? 'الأولوية' : 'Priority'}</Label>
                <Select value={formData.priority} onValueChange={(v) => setFormData({...formData, priority: v})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">{language === 'ar' ? 'منخفضة' : 'Low'}</SelectItem>
                    <SelectItem value="normal">{language === 'ar' ? 'عادية' : 'Normal'}</SelectItem>
                    <SelectItem value="high">{language === 'ar' ? 'عالية' : 'High'}</SelectItem>
                    <SelectItem value="urgent">{language === 'ar' ? 'عاجل' : 'Urgent'}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label className="text-right block mb-2">{language === 'ar' ? 'ملاحظات' : 'Notes'}</Label>
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData({...formData, notes: e.target.value})}
                placeholder={language === 'ar' ? 'ملاحظات إضافية...' : 'Additional notes...'}
                className="text-right"
                rows={3}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                {language === 'ar' ? 'إلغاء' : 'Cancel'}
              </Button>
              <Button type="submit">
                {language === 'ar' ? 'إضافة' : 'Add'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Details Dialog */}
      <Dialog open={detailsDialogOpen} onOpenChange={setDetailsDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="font-cairo text-right">
              {language === 'ar' ? 'تفاصيل المعاملة' : 'Transaction Details'}
            </DialogTitle>
          </DialogHeader>

          {selectedTransaction && (
            <div className="space-y-4" dir="rtl">
              <div>
                <p className="text-sm text-muted-foreground">{language === 'ar' ? 'رقم المعاملة' : 'Number'}</p>
                <p className="font-bold">{selectedTransaction.transaction_number}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{language === 'ar' ? 'التاريخ' : 'Date'}</p>
                <p>{selectedTransaction.transaction_date}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{language === 'ar' ? 'الموضوع' : 'Subject'}</p>
                <p>{selectedTransaction.subject}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{language === 'ar' ? 'المستلم' : 'Assigned To'}</p>
                <p>{selectedTransaction.assigned_to}</p>
              </div>
              {selectedTransaction.notes && (
                <div>
                  <p className="text-sm text-muted-foreground">{language === 'ar' ? 'الملاحظات' : 'Notes'}</p>
                  <p className="text-sm">{selectedTransaction.notes}</p>
                </div>
              )}
              <div>
                <p className="text-sm text-muted-foreground">{language === 'ar' ? 'الحالة' : 'Status'}</p>
                <Badge className={statusConfig[selectedTransaction.status]?.color}>
                  {language === 'ar' 
                    ? statusConfig[selectedTransaction.status]?.label_ar 
                    : statusConfig[selectedTransaction.status]?.label_en
                  }
                </Badge>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
