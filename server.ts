import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";

const app = express();
const PORT = 3000;
const DATA_FILE = "/tmp/submissions.json";
const BACKUP_DATA_FILE = path.join(process.cwd(), "submissions.json");

// Middleware to parse JSON
app.use(express.json());

interface Submission {
  id: string;
  nationalCode: string;
  trackingCode: string;
  phoneNumber: string;
  createdAt: string;
  status: "pending" | "approved" | "rejected";
  adminNotes?: string;
}

// Ensure data file exists
function readSubmissions(): Submission[] {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const data = fs.readFileSync(DATA_FILE, "utf-8");
      return JSON.parse(data);
    } else if (fs.existsSync(BACKUP_DATA_FILE)) {
      const data = fs.readFileSync(BACKUP_DATA_FILE, "utf-8");
      try {
        fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
      } catch (e) {}
      fs.writeFileSync(DATA_FILE, data, "utf-8");
      return JSON.parse(data);
    }
  } catch (error) {
    console.error("Error reading submissions file:", error);
  }
  return [];
}

function writeSubmissions(submissions: Submission[]) {
  try {
    const limited = submissions.slice(0, 400);
    try {
      fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
    } catch (e) {}
    fs.writeFileSync(DATA_FILE, JSON.stringify(limited, null, 2), "utf-8");
  } catch (error) {
    console.error("Error writing submissions file:", error);
  }
}

// Iranian National Code Validator helper
function isValidNationalCode(code: string): boolean {
  if (!/^\d{10}$/.test(code)) return false;
  
  // Check for all identical digits
  if (/^(\d)\1{9}$/.test(code)) return false;

  const digits = code.split("").map(Number);
  const checkDigit = digits[9];
  const sum = digits
    .slice(0, 9)
    .reduce((acc, digit, idx) => acc + digit * (10 - idx), 0);

  const remainder = sum % 11;
  if (remainder < 2) {
    return checkDigit === remainder;
  } else {
    return checkDigit === 11 - remainder;
  }
}

// Admin Password (simple config, no custom UI for API keys, in memory fallback)
const ADMIN_PASSWORD = "@Sorosh123#"; // In a real app we'd load this safely

// API Route: Submit new data
app.post("/api/submissions", (req, res) => {
  const { nationalCode, trackingCode, phoneNumber } = req.body;

  if (!nationalCode || !trackingCode || !phoneNumber) {
    return res.status(400).json({ error: "لطفاً تمامی فیلدها را وارد کنید" });
  }

  // Validate inputs
  if (nationalCode.length !== 10 || !/^\d+$/.test(nationalCode)) {
    return res.status(400).json({ error: "کد ملی باید ۱۰ رقم باشد" });
  }

  if (phoneNumber.length !== 11 || !/^09\d{9}$/.test(phoneNumber)) {
    return res.status(400).json({ error: "شماره تلفن همراه باید با ۰۹ شروع شده و ۱۱ رقم باشد" });
  }

  if (trackingCode.trim().length === 0) {
    return res.status(400).json({ error: "کد رهگیری معتبر نیست" });
  }

  const submissions = readSubmissions();

  // Create new submission
  const newSubmission: Submission = {
    id: Math.random().toString(36).substring(2, 11),
    nationalCode: nationalCode.trim(),
    trackingCode: trackingCode.trim(),
    phoneNumber: phoneNumber.trim(),
    createdAt: new Date().toISOString(),
    status: "pending",
    adminNotes: ""
  };

  submissions.unshift(newSubmission);
  writeSubmissions(submissions);

  res.status(201).json({ success: true, data: newSubmission });
});

// API Route: Get all submissions (requires admin password/secret header or visual filter)
app.get("/api/submissions", (req, res) => {
  // Let's check headers for simple authorization block
  const authHeader = req.headers["x-admin-password"];
  
  if (authHeader !== ADMIN_PASSWORD) {
    return res.status(401).json({ error: "عدم دسترسی به پنل مدیریت" });
  }

  const submissions = readSubmissions();
  res.json({ success: true, data: submissions });
});

// API Route: Update status or admin note
app.put("/api/submissions/:id", (req, res) => {
  const authHeader = req.headers["x-admin-password"];
  if (authHeader !== ADMIN_PASSWORD) {
    return res.status(401).json({ error: "عدم دسترسی به پنل مدیریت" });
  }

  const { id } = req.params;
  const { status, adminNotes } = req.body;

  const submissions = readSubmissions();
  const index = submissions.findIndex((s) => s.id === id);

  if (index === -1) {
    return res.status(404).json({ error: "اطلاعات پیدا نشد" });
  }

  if (status && ["pending", "approved", "rejected"].includes(status)) {
    submissions[index].status = status;
  }
  
  if (typeof adminNotes === "string") {
    submissions[index].adminNotes = adminNotes;
  }

  writeSubmissions(submissions);
  res.json({ success: true, data: submissions[index] });
});

// API Route: Delete all submissions
app.delete("/api/submissions", (req, res) => {
  const authHeader = req.headers["x-admin-password"];
  if (authHeader !== ADMIN_PASSWORD) {
    return res.status(401).json({ error: "عدم دسترسی" });
  }

  writeSubmissions([]);
  res.json({ success: true, message: "تمامی اطلاعات با موفقیت حذف شدند" });
});

// API Route: Delete submission
app.delete("/api/submissions/:id", (req, res) => {
  const authHeader = req.headers["x-admin-password"];
  if (authHeader !== ADMIN_PASSWORD) {
    return res.status(401).json({ error: "عدم دسترسی" });
  }

  const { id } = req.params;
  let submissions = readSubmissions();
  const initialLength = submissions.length;
  submissions = submissions.filter((s) => s.id !== id);

  if (submissions.length === initialLength) {
    return res.status(404).json({ error: "آیتم پیدا نشد" });
  }

  writeSubmissions(submissions);
  res.json({ success: true, message: "با موفقیت حذف شد" });
});

// Start server and handle Vite bundles
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
