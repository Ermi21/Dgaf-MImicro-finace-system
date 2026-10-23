export type EmploymentType = "EMPLOYEE" | "SELF_EMPLOYED";
export type Gender = "MALE" | "FEMALE";
export type Sex = Gender;
export type ReferralType = "NONE" | "ADMIN" | "PERSON";
export type RegistrationStatus = "PENDING" | "APPROVED" | "REJECTED" | "SUSPENDED" | "CANCELLED";
export type NotificationStatus = "PENDING" | "SENT" | "FAILED";
export type NotificationAudienceType =
  | "INDIVIDUAL"
  | "ALL_USERS"
  | "BY_JOB"
  | "BY_CITY"
  | "BY_SUBCITY"
  | "BY_WOREDA"
  | "BY_EMPLOYMENT_TYPE"
  | "BY_REGISTRATION_STATUS";

export interface Page<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface City {
  id: string;
  name: string;
  is_active: boolean;
}

export interface Subcity {
  id: string;
  name: string;
  city_id: string;
  is_active: boolean;
}

export interface Woreda {
  id: string;
  name: string;
  subcity_id: string;
  is_active: boolean;
}

export interface Job {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
}

export interface UserRead {
  id: string;
  telegram_id: number;
  first_name: string;
  second_name: string;
  phone: string;
  language: string;
  national_id?: string | null;
  is_active: boolean;
  created_at: string;
}

export interface RegistrationListItem {
  id: string;
  created_at: string;
  updated_at: string;
  status: RegistrationStatus;
  employment_type: EmploymentType;
  gender: Gender | null;
  sex: Gender | null;
  national_id?: string | null;
  referral_type?: ReferralType | null;
  referral_name?: string | null;
  referral_admin_id?: string | null;
  referral_admin_name?: string | null;
  user_first_name: string;
  user_second_name: string;
  user_phone: string;
  job_name: string;
  city_name: string;
  subcity_name: string;
  woreda_name: string;
}

export interface RegistrationDetail {
  id: string;
  created_at: string;
  updated_at: string;
  status: RegistrationStatus;
  employment_type: EmploymentType;
  gender: Gender | null;
  sex: Gender | null;
  national_id?: string | null;
  referral_type?: ReferralType | null;
  referral_name?: string | null;
  referral_admin_id?: string | null;
  referral_admin_name?: string | null;
  rejection_reason: string | null;
  approved_at: string | null;
  rejected_at: string | null;
  suspended_at: string | null;
  user: UserRead;
  job: Job;
  city: City;
  subcity: Subcity;
  woreda: Woreda;
}

export interface RegistrationFilters {
  name?: string;
  phone?: string;
  status?: RegistrationStatus;
  job_id?: string;
  city_id?: string;
  subcity_id?: string;
  woreda_id?: string;
  employment_type?: EmploymentType;
  gender?: Gender;
  referral_type?: ReferralType;
  referrer_name?: string;
  date_from?: string;
  date_to?: string;
  page: number;
  page_size: number;
}

export interface ReferralSummary {
  total_referrals: number;
  approved_referrals: number;
  pending_referrals: number;
  rejected_referrals: number;
  payout_rate: number;
  total_payout: number;
}

export interface DashboardStats {
  total_users: number;
  total_registrations: number;
  pending_registrations: number;
  approved_registrations: number;
  rejected_registrations: number;
  suspended_registrations: number;
  cancelled_registrations: number;
  active_jobs: number;
  active_cities: number;
  notifications_sent: number;
  notifications_failed: number;
  notifications_pending: number;
  referral_summary?: ReferralSummary;
}

export interface ReferredCustomer {
  registration_id: string;
  customer_name: string;
  customer_phone: string;
  job_name: string;
  status: RegistrationStatus;
  gender: Gender | null;
  national_id: string | null;
  created_at: string | null;
}

export interface ReferrerPerformance {
  referrer_name: string;
  referral_type: ReferralType;
  total_invites: number;
  approved_invites: number;
  pending_invites: number;
  rejected_invites: number;
  suspended_invites: number;
  total_payout: number;
  payout_rate: number;
  customers: ReferredCustomer[];
}

export interface ReferralReport {
  summary: {
    total_referrals: number;
    approved_referrals: number;
    pending_referrals: number;
    rejected_referrals: number;
    payout_rate: number;
    total_payout: number;
    unique_referrers: number;
  };
  referrers: ReferrerPerformance[];
}

export interface RegistrationTrends {
  by_job: { job: string; count: number }[];
  by_city: { city: string; count: number }[];
}

export interface NotificationItem {
  id: string;
  created_at: string;
  updated_at: string;
  audience_type: NotificationAudienceType;
  message: string;
  status: NotificationStatus;
  sent_at: string | null;
  failure_reason: string | null;
  recipient_count: number;
  sent_count: number;
  failed_count: number;
}

export interface ActivityLogItem {
  id: string;
  created_at: string;
  admin_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string;
  old_value: Record<string, unknown> | null;
  new_value: Record<string, unknown> | null;
}

export interface AdminRead {
  id: string;
  created_at: string;
  telegram_id: number;
  name: string;
  role_id: string;
  role_name: string;
  is_active: boolean;
}

export interface RoleRead {
  id: string;
  name: string;
  description: string | null;
  permissions: string[];
}

export interface LoginResult {
  access_token: string;
  is_admin: boolean;
  role: string | null;
  permissions: string[];
}

export interface ApiError {
  error: {
    code: string;
    message: string;
  };
}
