// Shared domain types mirroring the Supabase schema (see Prompt 3).
// Kept minimal for the scaffold; generated types can replace these later.

export type Plan = "free" | "pro";
export type RemotePref = "any" | "remote" | "hybrid" | "onsite";
export type Seniority = "intern" | "junior" | "mid" | "senior" | "lead";

export type Profile = {
  id: string;
  created_at: string;
  full_name: string | null;
  headline: string | null;
  target_roles: string[];
  target_locations: string[];
  remote_pref: RemotePref;
  seniority: Seniority | null;
  onboarding_complete: boolean;
  email_optout: boolean;
  plan: Plan;
};

export type Resume = {
  id: string;
  user_id: string;
  created_at: string;
  storage_path: string;
  file_name: string | null;
  parsed: Record<string, unknown> | null;
  is_primary: boolean;
};

export type Company = {
  id: string;
  created_at: string;
  name: string;
  website: string | null;
  careers_url: string | null;
  ats_type: string | null;
  ats_slug: string | null;
};

export type Job = {
  id: string;
  created_at: string;
  company_id: string | null;
  external_id: string | null;
  title: string;
  location: string | null;
  remote: boolean;
  employment_type: string | null;
  description: string | null;
  apply_url: string;
  posted_at: string | null;
  is_active: boolean;
};

export type MatchStatus = "new" | "saved" | "dismissed";
export type Match = {
  id: string;
  created_at: string;
  user_id: string;
  job_id: string;
  score: number | null;
  reasons: { fit: string[]; gaps: string[] } | null;
  status: MatchStatus;
};

export type ApplicationStatus = "draft" | "approved" | "sent";
export type ApplicationStage =
  | "matched"
  | "applied"
  | "replied"
  | "interview"
  | "offer"
  | "rejected";
export type Application = {
  id: string;
  created_at: string;
  user_id: string;
  job_id: string;
  tailored_resume: Record<string, unknown> | null;
  cover_letter: string | null;
  status: ApplicationStatus;
  stage: ApplicationStage;
  sent_at: string | null;
};

export type Outreach = {
  id: string;
  created_at: string;
  user_id: string;
  application_id: string | null;
  contact_name: string | null;
  contact_title: string | null;
  contact_email: string | null;
  message: string | null;
  status: "draft" | "sent";
  sent_at: string | null;
};

export type Activity = {
  id: string;
  created_at: string;
  user_id: string;
  application_id: string | null;
  type: "note" | "followup" | "stage_change";
  body: string | null;
  due_at: string | null;
  done: boolean;
};

export type Subscription = {
  id: string;
  created_at: string;
  user_id: string;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  plan: Plan;
  status: "inactive" | "active" | "past_due" | "canceled";
  current_period_end: string | null;
};

export type Notification = {
  id: string;
  created_at: string;
  user_id: string;
  match_id: string | null;
  type: string;
  read: boolean;
};
