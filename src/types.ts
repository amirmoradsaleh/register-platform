export interface Submission {
  id: string;
  nationalCode: string;
  trackingCode: string;
  phoneNumber: string;
  createdAt: string;
  status: "pending" | "approved" | "rejected";
  adminNotes?: string;
  description?: string;
}

export type TabType = "user" | "admin";
