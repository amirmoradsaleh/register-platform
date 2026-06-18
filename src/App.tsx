import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  User, 
  ShieldCheck, 
  CheckCircle, 
  AlertCircle, 
  Check, 
  X, 
  Search, 
  Trash2, 
  Edit, 
  Phone, 
  CreditCard, 
  Lock, 
  RefreshCw, 
  Download, 
  Database, 
  LogOut, 
  ExternalLink,
  ClipboardCheck,
  Plus,
  Loader2,
  SlidersHorizontal,
  ChevronDown
} from "lucide-react";
import { Submission, TabType } from "./types";

// Helper to convert Persian/Arabic numerals to standard English digits
function toEnglishDigits(str: string): string {
  const persianDigits = [/۰/g, /۱/g, /۲/g, /۳/g, /۴/g, /۵/g, /۶/g, /۷/g, /۸/g, /۹/g];
  const arabicDigits = [/٠/g, /١/g, /٢/g, /٣/g, /٤/g, /٥/g, /٦/g, /٧/g, /٨/g, /٩/g];
  let result = str;
  for (let i = 0; i < 10; i++) {
    result = result.replace(persianDigits[i], i.toString()).replace(arabicDigits[i], i.toString());
  }
  return result;
}

// Iranian National Code Validation Utility
function isValidNationalCode(code: string): boolean {
  const cleanCode = toEnglishDigits(code).trim();
  if (!/^\d{10}$/.test(cleanCode)) return false;
  
  if (/^(\d)\1{9}$/.test(cleanCode)) return false;

  const digits = cleanCode.split("").map(Number);
  const checkDigit = digits[9];
  const sum = digits
    .slice(0, 9)
    .reduce((acc, digit, idx) => acc + digit * (10 - idx), 0);

  const remainder = sum % 11;
  return remainder < 2 ? checkDigit === remainder : checkDigit === 11 - remainder;
}

// Generate a random secure tracking code
function generateRandomTrackingCode(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let result = "TRK-";
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// Persian numbers formatter for UI representation
function toPersianDigits(num: string | number): string {
  const str = String(num);
  const persian = ["۰", "۱", "۲", "۳", "۴", "۵", "۶", "۷", "۸", "۹"];
  return str.replace(/[0-9]/g, (w) => persian[+w]);
}

export default function App() {
  const [activeTab, setActiveTab] = useState<TabType>(() => {
    if (typeof window !== "undefined") {
      const path = window.location.pathname.toLowerCase();
      if (path.endsWith("/admin") || path.endsWith("/admin/")) {
        return "admin";
      }
    }
    return "user";
  });

  // Listen to path changes or browser back/forward buttons
  useEffect(() => {
    const handleUrlChange = () => {
      const path = window.location.pathname.toLowerCase();
      if (path.endsWith("/admin") || path.endsWith("/admin/")) {
        setActiveTab("admin");
      } else {
        setActiveTab("user");
      }
    };
    handleUrlChange();
    window.addEventListener("popstate", handleUrlChange);
    return () => window.removeEventListener("popstate", handleUrlChange);
  }, []);
  
  // Submit Form States
  const [nationalCode, setNationalCode] = useState("");
  const [trackingCode, setTrackingCode] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [formError, setFormError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState<Submission | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);

  // Admin Auth States
  const [adminPassword, setAdminPassword] = useState("");
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);
  const [authError, setAuthError] = useState("");

  // Admin Panel States
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [isLoadingSubmissions, setIsLoadingSubmissions] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [editingItem, setEditingItem] = useState<Submission | null>(null);
  const [editStatus, setEditStatus] = useState<"pending" | "approved" | "rejected">("pending");
  const [editNotes, setEditNotes] = useState("");
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 20;

  // Reset page when filter or search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter]);

  // Load submissions from the Express API
  const fetchSubmissions = async () => {
    setIsLoadingSubmissions(true);
    try {
      const response = await fetch("/api/submissions", {
        headers: {
          "x-admin-password": adminPassword || "@Sorosh123#",
        },
      });
      const resData = await response.json();
      if (response.ok && resData.success) {
        setSubmissions(resData.data);
      } else {
        setAuthError(resData.error || "خطا در بارگذاری اطلاعات");
        setIsAdminAuthenticated(false);
      }
    } catch (err) {
      console.error(err);
      setAuthError("ارتباط با سرور برقرار نشد");
    } finally {
      setIsLoadingSubmissions(false);
    }
  };

  // Run initial state recovery for admin if already logged in
  useEffect(() => {
    if (isAdminAuthenticated) {
      fetchSubmissions();
    }
  }, [isAdminAuthenticated]);

  // Handle Form Submission
  const handleUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    
    const cleanNationalCode = toEnglishDigits(nationalCode).trim();
    const cleanPhoneNumber = toEnglishDigits(phoneNumber).trim();
    const cleanTrackingCode = toEnglishDigits(trackingCode).trim();

    if (!cleanNationalCode || !cleanTrackingCode || !cleanPhoneNumber) {
      setFormError("لطفاً همه‌ی فیلدهای الزامی را پر کنید.");
      return;
    }

    if (!isValidNationalCode(cleanNationalCode)) {
      setFormError("کد ملی وارد شده معتبر نیست. لطفاً بررسی کنید.");
      return;
    }

    if (!/^09\d{9}$/.test(cleanPhoneNumber)) {
      setFormError("شماره همراه باید معتبر بوده و ۱۱ رقم باشد (شروع با ۰۹).");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/submissions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          nationalCode: cleanNationalCode,
          trackingCode: cleanTrackingCode,
          phoneNumber: cleanPhoneNumber,
        }),
      });

      const resData = await response.json();

      if (response.ok && resData.success) {
        setSubmitSuccess(resData.data);
        // Clear input states
        setNationalCode("");
        setTrackingCode("");
        setPhoneNumber("");
      } else {
        setFormError(resData.error || "ثبت اطلاعات با خطا مواجه شد.");
      }
    } catch (err) {
      console.error(err);
      setFormError("ارتباط با سرور قطع شده است. مجدداً تلاش کنید.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Admin Authorization
  const handleAdminLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError("");
    if (adminPassword.trim() === "@Sorosh123#") {
      setIsAdminAuthenticated(true);
    } else {
      setAuthError("رمز عبور وارد شده نادرست است.");
    }
  };

  // Seed mockup elements to make it lively
  const handleSeedMockData = async () => {
    const mockData = [
      { nationalCode: "0012345678", trackingCode: "TRK-A81G48", phoneNumber: "09121111111" },
      { nationalCode: "1270834591", trackingCode: "TRK-Z59B12", phoneNumber: "09193335555" },
      { nationalCode: "2280456123", trackingCode: "TRK-K04H72", phoneNumber: "09357778899" },
    ];

    try {
      for (const item of mockData) {
        await fetch("/api/submissions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(item),
        });
      }
      fetchSubmissions();
    } catch (err) {
      console.error("Error seeding", err);
    }
  };

  // Update Status
  const handleUpdateStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;
    setIsUpdatingStatus(true);

    try {
      const response = await fetch(`/api/submissions/${editingItem.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "x-admin-password": adminPassword,
        },
        body: JSON.stringify({
          status: editStatus,
          adminNotes: editNotes,
        }),
      });

      const resData = await response.json();
      if (response.ok && resData.success) {
        // Refresh
        await fetchSubmissions();
        setEditingItem(null);
      } else {
        alert(resData.error || "بروزرسانی وضعیت با خطا مواجه شد.");
      }
    } catch (err) {
      console.error(err);
      alert("ارتباط با سرور برقرار نشد.");
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  // Delete submission record
  const handleDeleteSubmission = async (id: string) => {
    if (!confirm("آیا از حذف این درخواست اطمینان دارید؟")) return;

    try {
      const response = await fetch(`/api/submissions/${id}`, {
        method: "DELETE",
        headers: {
          "x-admin-password": adminPassword,
        },
      });

      const resData = await response.json();
      if (response.ok && resData.success) {
        fetchSubmissions();
        if (editingItem?.id === id) {
          setEditingItem(null);
        }
      } else {
        alert(resData.error || "خطا در حذف آیتم");
      }
    } catch (err) {
      console.error(err);
      alert("خطا در برقراری ارتباط با سرور");
    }
  };

  // Delete all submissions
  const handleDeleteAllSubmissions = async () => {
    if (!confirm("آیا از حذف تمامی پرونده‌ها اطمینان کامل دارید؟ این عمل غیرقابل بازگشت است و تمام رکوردها پاک می‌شوند.")) return;

    try {
      const response = await fetch("/api/submissions", {
        method: "DELETE",
        headers: {
          "x-admin-password": adminPassword,
        },
      });

      const resData = await response.json();
      if (response.ok && resData.success) {
        setSubmissions([]);
        setEditingItem(null);
        setCurrentPage(1);
      } else {
        alert(resData.error || "خطا در پاکسازی کل دیتابیس");
      }
    } catch (err) {
      console.error(err);
      alert("خطا در برقراری ارتباط با سرور");
    }
  };

  // Auto Copy Tracking Code to Clipboard
  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  // Export submissions to CSV (human-readable spreadsheet)
  const exportToCSV = () => {
    const headers = ["ID", "National Code", "Tracking Code", "Phone Number", "Submission Date", "Status", "Admin Notes"];
    const rows = submissions.map((s) => [
      s.id,
      s.nationalCode,
      s.trackingCode,
      s.phoneNumber,
      new Date(s.createdAt).toLocaleString("fa-IR"),
      s.status === "approved" ? "تایید شده" : s.status === "rejected" ? "رد شده" : "در حال بررسی",
      s.adminNotes || ""
    ]);
    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `گزارش_ثبت_اطلاعات_${new Date().toLocaleDateString("fa-IR")}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Filtering list
  const filteredSubmissions = submissions.filter((item) => {
    const matchesSearch = 
      item.nationalCode.includes(searchTerm) || 
      item.phoneNumber.includes(searchTerm) || 
      item.trackingCode.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || item.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Calculate paginated details
  const totalPages = Math.ceil(filteredSubmissions.length / ITEMS_PER_PAGE);
  const paginatedSubmissions = filteredSubmissions.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  // Realtime checks for input displays
  const showNationalCodeFeedback = nationalCode.length > 0;
  const isNCValid = isValidNationalCode(nationalCode);
  const showPhoneFeedback = phoneNumber.length > 0;
  const isPhoneValid = /^09\d{9}$/.test(toEnglishDigits(phoneNumber));

  return (
    <div className="min-h-screen bg-slate-50/50 flex flex-col antialiased">
      {/* Top Header Navigation */}
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-slate-100 px-4 py-3 md:px-8">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          
          {/* Logo & Title */}
          <div className="flex items-center gap-2.5">
            <div className="h-10 w-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-sm shadow-indigo-200">
              <Database className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-base font-bold text-slate-800 tracking-tight">سامانه ثبت و پیگیری کدملی</h1>
              <p className="text-[11px] text-slate-400 font-medium">ساده، مینیمال و امن</p>
            </div>
          </div>

          {/* Mode Indicator/Help */}
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold text-slate-500 bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200/45">
              {activeTab === "admin" ? "بخش مدیریت دیتابیس" : "فرم ثبت اطلاعات متقاضی"}
            </span>
          </div>

        </div>
      </header>

      {/* Main Body */}
      <main className="flex-grow max-w-6xl w-full mx-auto p-4 md:p-8 flex flex-col items-center justify-center">
        
        {/* TAB 1: User Registration Panel */}
        <AnimatePresence mode="wait">
          {activeTab === "user" && (
            <motion.div 
              key="user-tab"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              className="w-full max-w-xl"
            >
              {!submitSuccess ? (
                <div className="bg-white rounded-2xl border border-slate-150 shadow-sm overflow-hidden p-6 md:p-8">
                  
                  {/* Form Headline */}
                  <div className="text-center mb-8">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase bg-indigo-50 text-indigo-700 mb-3">
                      بخش مراجعین حضوری و غیرحضوری
                    </span>
                    <h2 className="text-xl font-extrabold text-slate-800">ثبت فرم مشخصات جدید</h2>
                    <p className="text-xs text-slate-400 mt-1.5">لطفاً اطلاعات زیر را با دقت و با کاراکترهای انگلیسی یا فارسی وارد کنید</p>
                  </div>

                  {/* Form Component */}
                  <form onSubmit={handleUserSubmit} className="space-y-6">
                    
                    {/* Error Alerts */}
                    {formError && (
                      <motion.div 
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="bg-rose-50 border-r-4 border-rose-500 p-4 rounded-xl flex items-start gap-2.5"
                      >
                        <AlertCircle className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
                        <span className="text-xs text-rose-700 font-medium leading-relaxed">{formError}</span>
                      </motion.div>
                    )}

                    {/* Field 1: National Code */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-600 block">
                        کد ملی متقاضی <span className="text-rose-400">*</span>
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          maxLength={10}
                          placeholder="مثال: ۰۰۱۲۳۴۵۶۷۸"
                          value={nationalCode}
                          onChange={(e) => setNationalCode(e.target.value)}
                          className={`w-full px-4 py-3 bg-slate-50/50 hover:bg-slate-50 border rounded-xl text-sm font-semibold tracking-wide transition-all outline-none focus:bg-white focus:ring-2 focus:ring-indigo-100 ${
                            showNationalCodeFeedback 
                              ? isNCValid 
                                ? "border-emerald-200" 
                                : "border-rose-200"
                              : "border-slate-200 focus:border-indigo-400"
                          }`}
                        />
                        <div className="absolute left-3.5 top-1/2 -translate-y-1/2 flex items-center gap-1.5 text-slate-400 pointer-events-none">
                          {showNationalCodeFeedback && (
                            isNCValid 
                              ? <Check className="h-4.5 w-4.5 text-emerald-500" />
                              : <X className="h-4.5 w-4.5 text-rose-400" />
                          )}
                        </div>
                      </div>
                      
                      {/* Interactive Help */}
                      <div className="flex justify-between items-center px-1">
                        <span className="text-[10px] text-slate-400">کد ملی ده رقمی معتبر به همراه کنترل رقم آخر</span>
                        {showNationalCodeFeedback && (
                          <span className={`text-[10px] font-bold ${isNCValid ? "text-emerald-600" : "text-rose-500"}`}>
                            {isNCValid ? "✓ تأیید ساختار شماره" : "✗ ساختار شماره نادرست است"}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Field 2: Phone Number */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-600 block">
                        شماره تلفن همراه <span className="text-rose-400">*</span>
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          maxLength={11}
                          placeholder="مثال: ۰۹۱۲۳۴۵۶۷۸۹"
                          value={phoneNumber}
                          onChange={(e) => setPhoneNumber(e.target.value)}
                          className={`w-full px-4 py-3 bg-slate-50/50 hover:bg-slate-50 border rounded-xl text-sm font-semibold tracking-wide transition-all outline-none focus:bg-white focus:ring-2 focus:ring-indigo-100 ${
                            showPhoneFeedback 
                              ? isPhoneValid 
                                ? "border-emerald-200" 
                                : "border-rose-200"
                              : "border-slate-200 focus:border-indigo-400"
                          }`}
                        />
                        <div className="absolute left-3.5 top-1/2 -translate-y-1/2 flex items-center text-slate-400 pointer-events-none">
                          {showPhoneFeedback && (
                            isPhoneValid 
                              ? <Check className="h-4.5 w-4.5 text-emerald-500" />
                              : <X className="h-4.5 w-4.5 text-rose-400" />
                          )}
                        </div>
                      </div>
                      <div className="flex justify-between items-center px-1">
                        <span className="text-[10px] text-slate-400">شماره موبایل فعال متقاضی (مثال: ۰۹۱۲۳۴۵۶۷۸۹)</span>
                        {showPhoneFeedback && (
                          <span className={`text-[10px] font-bold ${isPhoneValid ? "text-emerald-600" : "text-rose-500"}`}>
                            {isPhoneValid ? "✓ درست" : "✗ شماره نامعتبر"}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Field 3: Tracking Code */}
                    <div className="space-y-1.5">
                      <div className="flex justify-between items-center">
                        <label className="text-xs font-semibold text-slate-600">
                          کد رهگیری پرونده <span className="text-rose-400">*</span>
                        </label>
                        <button
                          type="button"
                          onClick={() => setTrackingCode(generateRandomTrackingCode())}
                          className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 transition-colors"
                        >
                          <Plus className="h-3 w-3" />
                          ایجاد کد تصادفی پرونده
                        </button>
                      </div>
                      <div className="relative">
                        <input
                          type="text"
                          placeholder="مثال: TRK-52A9D"
                          value={trackingCode}
                          onChange={(e) => setTrackingCode(e.target.value)}
                          className="w-full px-4 py-3 bg-slate-50/50 hover:bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold tracking-wide transition-all outline-none focus:bg-white focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                        />
                      </div>
                      <span className="text-[10px] text-slate-400 block px-1">مقدار شناسه رهگیری را به صورت دلخواه وارد کرده یا از کد تولیدشده استفاده کنید.</span>
                    </div>

                    {/* Submit Bar Button */}
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 disabled:bg-slate-300 text-white font-bold rounded-xl text-sm transition-all shadow-md shadow-indigo-100 flex items-center justify-center gap-2 cursor-pointer"
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="h-5 w-5 animate-spin" />
                          <span>در حال ثبت اطلاعات...</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle className="h-5 w-5" />
                          <span>ثبت نهایی اطلاعات پرونده</span>
                        </>
                      )}
                    </button>

                  </form>
                </div>
              ) : (
                
                /* Success screen card */
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-white rounded-2xl border border-slate-150 shadow-sm overflow-hidden p-8 text-center space-y-6"
                >
                  <div className="inline-flex h-16 w-16 items-center justify-center bg-emerald-50 rounded-full text-emerald-500 mb-2">
                    <CheckCircle className="h-10 w-10 animate-bounce" />
                  </div>
                  
                  <div>
                    <h3 className="text-xl font-extrabold text-slate-800">اطلاعات شما با موفقیت ثبت شد</h3>
                    <p className="text-xs text-slate-400 mt-2">پرونده شما در بانک اطلاعاتی ایجاد شد و آماده بررسی توسط مدیریت است</p>
                  </div>

                  {/* Registered Details display */}
                  <div className="bg-slate-50 border border-slate-100 rounded-2xl p-5 text-right space-y-3.5 max-w-sm mx-auto">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-400 font-medium">کد ملی ثبت شده:</span>
                      <span className="font-bold text-slate-800 tracking-wider">
                        {toPersianDigits(submitSuccess.nationalCode)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-400 font-medium">شماره تلفن همراه:</span>
                      <span className="font-bold text-slate-800 tracking-wider">
                        {toPersianDigits(submitSuccess.phoneNumber)}
                      </span>
                    </div>
                    <div className="border-t border-slate-200/60 pt-3 flex justify-between items-center">
                      <span className="text-xs text-indigo-600 font-bold">کد رهگیری نهایی شما:</span>
                      <div className="flex items-center gap-1.5 bg-indigo-50 px-2.5 py-1.5 rounded-lg border border-indigo-150">
                        <span className="text-xs font-mono font-bold text-indigo-700 tracking-widest">{submitSuccess.trackingCode}</span>
                        <button 
                          onClick={() => handleCopyCode(submitSuccess.trackingCode)}
                          className="text-indigo-400 hover:text-indigo-600 cursor-pointer"
                          title="کپی در حافظه"
                        >
                          <ClipboardCheck className={`h-4 w-4 ${copiedCode ? "text-emerald-500" : ""}`} />
                        </button>
                      </div>
                    </div>
                  </div>

                  {copiedCode && (
                    <span className="text-[10px] text-emerald-600 font-semibold bg-emerald-50 px-3 py-1 rounded-full inline-block">
                      کد رهگیری با موفقیت در حافظه کپی شد
                    </span>
                  )}

                  <div className="pt-4 border-t border-slate-100 flex justify-center">
                    <button
                      onClick={() => setSubmitSuccess(null)}
                      className="px-8 py-3 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-indigo-100 cursor-pointer"
                    >
                      ثبت پرونده یا کدملی جدید
                    </button>
                  </div>

                </motion.div>
              )}
            </motion.div>
          )}

          {/* TAB 2: Admin Panel (Auth + Table Interface) */}
          {activeTab === "admin" && (
            <motion.div 
              key="admin-tab"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              className="w-full max-w-5xl"
            >
              
              {/* Login Modal/Box if unauthorized */}
              {!isAdminAuthenticated ? (
                <div className="max-w-md mx-auto bg-white rounded-2xl border border-slate-150 shadow-sm p-6 md:p-8">
                  <div className="text-center mb-6">
                    <div className="h-12 w-12 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto mb-3">
                      <Lock className="h-6 w-6" />
                    </div>
                    <h3 className="text-md font-bold text-slate-800">ورود امن به پنل مدیریت</h3>
                    <p className="text-[11px] text-slate-400 mt-1">جهت دسترسی به دیتابیس ثبت‌نام‌شدگان، رمز عبور مدیریت را وارد کنید</p>
                  </div>

                  <form onSubmit={handleAdminLogin} className="space-y-4">
                    {authError && (
                      <div className="bg-rose-50 text-rose-600 text-[11px] font-bold p-3 rounded-lg border-r-4 border-rose-500">
                        {authError}
                      </div>
                    )}
                    
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-600 block">رمز عبور ادمین</label>
                      <input
                        type="password"
                        placeholder="••••••••"
                        value={adminPassword}
                        onChange={(e) => setAdminPassword(e.target.value)}
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:bg-white focus:border-indigo-500 transition-all text-center tracking-widest"
                      />
                    </div>

                    <button
                      type="submit"
                      className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs transition-all shadow-md shadow-indigo-100 cursor-pointer"
                    >
                      ورود به داشبورد ادمین
                    </button>
                  </form>
                </div>
              ) : (
                
                /* Real ADMIN Dashboard UI */
                <div className="space-y-6">
                  
                  {/* Dashboard Headers */}
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                        <ShieldCheck className="h-5.5 w-5.5" />
                      </div>
                      <div className="text-right">
                        <h4 className="text-sm font-extrabold text-slate-850">میز کار ادمین</h4>
                        <p className="text-[10px] text-slate-400">فهرست کل پرونده‌های به ثبت رسیده در پورتال</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={handleSeedMockData}
                        className="px-3 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold rounded-lg transition-all flex items-center gap-1 cursor-pointer"
                        title="ایجاد چند داده اجمالی برای نمایش در جدول"
                      >
                        <RefreshCw className="h-3.5 w-3.5" />
                        ایجاد داده آزمایشی
                      </button>
                      <button
                        onClick={exportToCSV}
                        disabled={submissions.length === 0}
                        className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg transition-all flex items-center gap-1 disabled:opacity-40 cursor-pointer"
                      >
                        <Download className="h-3.5 w-3.5" />
                        خروجی اکسل (CSV)
                      </button>
                      <button
                        onClick={handleDeleteAllSubmissions}
                        disabled={submissions.length === 0}
                        className="px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200/55 text-xs font-bold rounded-lg transition-all flex items-center gap-1 disabled:opacity-40 cursor-pointer"
                        title="حذف تمامی اطلاعات ثبت شده"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        حذف همه
                      </button>
                      <button
                        onClick={() => {
                          setIsAdminAuthenticated(false);
                          setAdminPassword("");
                        }}
                        className="px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-600 text-xs font-bold rounded-lg transition-all flex items-center gap-1 cursor-pointer"
                      >
                        <LogOut className="h-3.5 w-3.5" />
                        خروج
                      </button>
                    </div>
                  </div>

                  {/* Summary Metric Counters */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    
                    <div className="bg-white p-4 rounded-xl border border-slate-150 shadow-sm text-right">
                      <span className="text-[10px] font-semibold text-slate-400">کل درخواست‌ها</span>
                      <h5 className="text-xl font-black text-slate-800 mt-1">{toPersianDigits(submissions.length)}</h5>
                    </div>

                    <div className="bg-white p-4 rounded-xl border border-slate-150 shadow-sm text-right">
                      <span className="text-[10px] font-semibold text-amber-500">در انتظار بررسی</span>
                      <h5 className="text-xl font-black text-amber-600 mt-1">
                        {toPersianDigits(submissions.filter(s => s.status === "pending").length)}
                      </h5>
                    </div>

                    <div className="bg-white p-4 rounded-xl border border-slate-150 shadow-sm text-right">
                      <span className="text-[10px] font-semibold text-emerald-500">تأیید شده</span>
                      <h5 className="text-xl font-black text-emerald-600 mt-1">
                        {toPersianDigits(submissions.filter(s => s.status === "approved").length)}
                      </h5>
                    </div>

                    <div className="bg-white p-4 rounded-xl border border-slate-150 shadow-sm text-right">
                      <span className="text-[10px] font-semibold text-rose-400">رد شده</span>
                      <h5 className="text-xl font-black text-rose-605 mt-1">
                        {toPersianDigits(submissions.filter(s => s.status === "rejected").length)}
                      </h5>
                    </div>

                  </div>

                  {/* Active filters and Search box */}
                  <div className="bg-white p-4 rounded-xl border border-slate-150 shadow-sm flex flex-col md:flex-row gap-3 justify-between items-center">
                    
                    {/* Search Field */}
                    <div className="relative w-full md:max-w-xs">
                      <input
                        type="text"
                        placeholder="جستجو با کدملی، همراه، کد رهگیری..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(toEnglishDigits(e.target.value))}
                        className="w-full pl-3 pr-9 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs outline-none focus:bg-white focus:border-indigo-500 transition-all"
                      />
                      <Search className="h-4 w-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
                    </div>

                    {/* Filter Status Badge Tab */}
                    <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto">
                      <button
                        onClick={() => setStatusFilter("all")}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer whitespace-nowrap transition-all ${
                          statusFilter === "all"
                            ? "bg-slate-800 text-white"
                            : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                        }`}
                      >
                        همه رکوردهای ثبت‌نام
                      </button>
                      <button
                        onClick={() => setStatusFilter("pending")}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer whitespace-nowrap transition-all ${
                          statusFilter === "pending"
                            ? "bg-amber-100 text-amber-700"
                            : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                        }`}
                      >
                        در انتظار بررسی
                      </button>
                      <button
                        onClick={() => setStatusFilter("approved")}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer whitespace-nowrap transition-all ${
                          statusFilter === "approved"
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                        }`}
                      >
                        تایید شده
                      </button>
                      <button
                        onClick={() => setStatusFilter("rejected")}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer whitespace-nowrap transition-all ${
                          statusFilter === "rejected"
                            ? "bg-rose-100 text-rose-700"
                            : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                        }`}
                      >
                        رد شده
                      </button>
                    </div>

                  </div>

                  {/* Main Database Table Container */}
                  <div className="w-full">
                    
                    {/* Database Submission Log Table */}
                    <div className="bg-white rounded-xl border border-slate-150 shadow-sm overflow-hidden w-full">
                      <div className="overflow-x-auto">
                        <table className="w-full text-right text-xs">
                          <thead className="bg-slate-50 text-slate-500 border-b border-slate-100 font-bold">
                            <tr>
                              <th className="px-4 py-3.5">کد ملی متقاضی</th>
                              <th className="px-4 py-3.5">کد رهگیری</th>
                              <th className="px-4 py-3.5">تلفن همراه</th>
                              <th className="px-4 py-3.5">تاریخ ثبت</th>
                              <th className="px-4 py-3.5">وضعیت بررسی</th>
                              <th className="px-4 py-3.5 text-center">عملیات</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {isLoadingSubmissions ? (
                              <tr>
                                <td colSpan={6} className="px-4 py-12 text-center text-slate-400 font-semibold">
                                  <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2 text-indigo-500" />
                                  <span>در حال خواندن اطلاعات از سرور پرونده‌ها...</span>
                                </td>
                              </tr>
                            ) : filteredSubmissions.length === 0 ? (
                              <tr>
                                <td colSpan={6} className="px-4 py-12 text-center text-slate-400 font-semibold">
                                  هیچ رکوردی یافت نشد.
                                </td>
                              </tr>
                            ) : (
                              paginatedSubmissions.map((item) => (
                                <tr 
                                  key={item.id} 
                                  className={`hover:bg-slate-50/70 transition-all ${
                                    editingItem?.id === item.id ? "bg-indigo-50/40" : ""
                                  }`}
                                >
                                  {/* National Code */}
                                  <td className="px-4 py-3.5 font-bold text-slate-700 tracking-wider">
                                    {toPersianDigits(item.nationalCode)}
                                  </td>
                                  
                                  {/* Tracking Code */}
                                  <td className="px-4 py-3.5">
                                    <span className="font-mono bg-slate-100 text-slate-600 px-2 py-1 rounded text-[11px] font-bold">
                                      {item.trackingCode}
                                    </span>
                                  </td>
                                  
                                  {/* Phone */}
                                  <td className="px-4 py-3.5 text-slate-600 font-mono">
                                    {toPersianDigits(item.phoneNumber)}
                                  </td>

                                  {/* Date Created */}
                                  <td className="px-4 py-3.5 text-slate-400 text-[10px] font-medium" dir="ltr">
                                    {new Date(item.createdAt).toLocaleDateString("fa-IR")}
                                  </td>

                                  {/* Status chip */}
                                  <td className="px-4 py-3.5">
                                    {item.status === "passed" || item.status === "approved" ? (
                                      <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-full font-bold text-[10px]">
                                        <Check className="h-3 w-3" />
                                        تایید شده
                                      </span>
                                    ) : item.status === "rejected" ? (
                                      <span className="inline-flex items-center gap-1 bg-rose-50 text-rose-700 px-2.5 py-1 rounded-full font-bold text-[10px]">
                                        <X className="h-3 w-3" />
                                        رد شده
                                      </span>
                                    ) : (
                                      <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-700 px-2.5 py-1 rounded-full font-bold text-[10px]">
                                        <RefreshCw className="h-2.5 w-2.5 animate-spin" />
                                        در حال بررسی
                                      </span>
                                    )}
                                  </td>

                                  {/* Action links */}
                                  <td className="px-4 py-3.5 text-center">
                                    <div className="inline-flex items-center gap-1.5">
                                      <button
                                        onClick={() => {
                                          setEditingItem(item);
                                          setEditStatus(item.status);
                                          setEditNotes(item.adminNotes || "");
                                        }}
                                        className="p-1 px-2 text-[10px] font-bold bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-md transition-colors flex items-center gap-1 cursor-pointer"
                                        title="بررسی وضعیت پرونده"
                                      >
                                        <Edit className="h-3.5 w-3.5" />
                                        بررسی
                                      </button>
                                      <button
                                        onClick={() => handleDeleteSubmission(item.id)}
                                        className="p-1 hover:bg-rose-50 hover:text-rose-600 text-slate-400 rounded-md transition-all cursor-pointer"
                                        title="حذف کلی درخواست"
                                      >
                                        <Trash2 className="h-3.5 w-3.5" />
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>

                      {/* Pagination Controls inside the white box footer */}
                      {totalPages > 1 && (
                        <div className="bg-slate-50/70 border-t border-slate-100 px-4 py-3.5 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
                          <div className="font-semibold text-slate-600">
                            نمایش ردیف‌های {toPersianDigits(String((currentPage - 1) * ITEMS_PER_PAGE + 1))} تا {toPersianDigits(String(Math.min(currentPage * ITEMS_PER_PAGE, filteredSubmissions.length)))} از {toPersianDigits(String(filteredSubmissions.length))} پرونده ثبت شده
                          </div>
                          
                          <div className="flex items-center gap-1.5" dir="ltr">
                            <button
                              disabled={currentPage === 1}
                              onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                              className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 font-bold transition-all disabled:opacity-40 disabled:hover:bg-white text-[10px] cursor-pointer"
                            >
                              قبلی
                            </button>
                            
                            {Array.from({ length: totalPages }, (_, idx) => idx + 1).map((page) => (
                              <button
                                key={page}
                                onClick={() => setCurrentPage(page)}
                                className={`px-3 py-1.5 rounded-lg font-bold text-[10px] transition-all cursor-pointer border ${
                                  currentPage === page
                                    ? "bg-indigo-600 border-indigo-600 text-white shadow-sm"
                                    : "border-slate-200 bg-white hover:bg-slate-50 text-slate-600"
                                }`}
                              >
                                {toPersianDigits(String(page))}
                              </button>
                            ))}
                            
                            <button
                              disabled={currentPage === totalPages}
                              onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                              className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 font-bold transition-all disabled:opacity-40 disabled:hover:bg-white text-[10px] cursor-pointer"
                            >
                              بعدی
                            </button>
                          </div>
                        </div>
                      )}
                    </div>

                  </div>

                  {/* Admin Review Pop-up Modal */}
                  <AnimatePresence>
                    {editingItem && (
                      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        {/* Backdrop with elegant blur */}
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          onClick={() => setEditingItem(null)}
                          className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm"
                        />
                        
                        {/* Pop-up Box Content */}
                        <motion.div
                          initial={{ opacity: 0, scale: 0.95, y: 15 }}
                          animate={{ opacity: 1, scale: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.95, y: 15 }}
                          transition={{ duration: 0.2 }}
                          className="relative bg-white rounded-2xl border border-slate-150 shadow-xl p-6 w-full max-w-md z-10 space-y-4 text-right"
                        >
                          <form onSubmit={handleUpdateStatus} className="space-y-4">
                            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                              <h4 className="text-sm font-bold text-slate-800">بررسی و تعیین وضعیت پرونده</h4>
                              <button 
                                type="button" 
                                onClick={() => setEditingItem(null)}
                                className="text-slate-400 hover:text-slate-600 cursor-pointer p-1 rounded-lg hover:bg-slate-50 transition-colors"
                              >
                                <X className="h-4.5 w-4.5" />
                              </button>
                            </div>

                            {/* Quick Summary */}
                            <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-100 space-y-2 text-xs">
                              <div className="flex justify-between">
                                <span className="text-slate-400 font-medium">کد ملی:</span>
                                <span className="font-bold tracking-wider text-slate-800">
                                  {toPersianDigits(editingItem.nationalCode)}
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-slate-400 font-medium">تلفن همراه:</span>
                                <span className="font-bold text-slate-800">{toPersianDigits(editingItem.phoneNumber)}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-slate-400 font-medium">کد رهگیری:</span>
                                <span className="font-mono bg-white border border-slate-200/60 px-1 py-0.5 rounded text-[10px] text-slate-700 font-bold">
                                  {editingItem.trackingCode}
                                </span>
                              </div>
                            </div>

                            {/* Modify Status Select */}
                            <div className="space-y-1.5">
                              <label className="text-xs font-semibold text-slate-600 block">وضعیت جدید پرونده</label>
                              <div className="grid grid-cols-3 gap-2">
                                <button
                                  type="button"
                                  onClick={() => setEditStatus("approved")}
                                  className={`py-2 rounded-lg text-[10px] font-bold cursor-pointer border text-center transition-all ${
                                    editStatus === "approved"
                                      ? "bg-emerald-50 text-emerald-700 border-emerald-300"
                                      : "bg-white hover:bg-slate-50 text-slate-600 border-slate-200"
                                  }`}
                                >
                                  تایید نهایی
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setEditStatus("pending")}
                                  className={`py-2 rounded-lg text-[10px] font-bold cursor-pointer border text-center transition-all ${
                                    editStatus === "pending"
                                      ? "bg-amber-50 text-amber-700 border-amber-300"
                                      : "bg-white hover:bg-slate-50 text-slate-600 border-slate-200"
                                  }`}
                                >
                                  بررسی مجدد
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setEditStatus("rejected")}
                                  className={`py-2 rounded-lg text-[10px] font-bold cursor-pointer border text-center transition-all ${
                                    editStatus === "rejected"
                                      ? "bg-rose-50 text-rose-700 border-rose-300"
                                      : "bg-white hover:bg-slate-50 text-slate-600 border-slate-200"
                                  }`}
                                >
                                  رد پرونده
                                </button>
                              </div>
                            </div>

                            {/* Admin Notes Field */}
                            <div className="space-y-1.5">
                              <label className="text-xs font-semibold text-slate-600 block">توضیحات و یادداشت ادمین</label>
                              <textarea
                                rows={3}
                                placeholder="توضیحات یا علت رد صلاحیت..."
                                value={editNotes}
                                onChange={(e) => setEditNotes(e.target.value)}
                                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs outline-none focus:bg-white focus:border-indigo-400 transition-all resize-none"
                              />
                            </div>

                            {/* Actions */}
                            <div className="flex gap-2.5 pt-2">
                              <button
                                type="submit"
                                disabled={isUpdatingStatus}
                                className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shadow-sm transition-all flex items-center justify-center gap-1 cursor-pointer"
                              >
                                {isUpdatingStatus && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                                ذخیره تغییرات
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditingItem(null)}
                                className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-semibold rounded-lg transition-all cursor-pointer"
                              >
                                انصراف
                              </button>
                            </div>

                          </form>
                        </motion.div>
                      </div>
                    )}
                  </AnimatePresence>

                </div>
              )}

            </motion.div>
          )}
        </AnimatePresence>

      </main>

      {/* Footer Branding */}
      <footer className="py-6 border-t border-slate-100 text-center">
        <p className="text-[10px] text-slate-400 font-medium">© طراحی با بالاترین کیفیت و اصول مینیمال فرانت‌اند - ۱۴۰۵</p>
      </footer>
    </div>
  );
}
