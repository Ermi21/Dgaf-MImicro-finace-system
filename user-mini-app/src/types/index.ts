export type EmploymentType = "EMPLOYEE" | "SELF_EMPLOYED";
export type Gender = "MALE" | "FEMALE";
export type Sex = Gender;
export type ReferralType = "NONE" | "ADMIN" | "PERSON";

export type RegistrationStatus = "PENDING" | "APPROVED" | "REJECTED" | "SUSPENDED" | "CANCELLED";

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

export interface UserProfile {
  id: string;
  telegram_id: number;
  first_name: string;
  second_name: string;
  phone: string;
  language: string;
  is_active: boolean;
  created_at: string;
}

export interface RegistrationCreatePayload {
  first_name: string;
  second_name: string;
  phone: string;
  city_id: string;
  subcity_id: string;
  woreda_id: string;
  job_id: string;
  employment_type: EmploymentType;
  gender?: Gender;
  sex?: Gender;
  national_id?: string;
  referral_type?: ReferralType;
  referral_name?: string;
  referral_admin_id?: string;
}

export interface MyRegistrationItem {
  id: string;
  created_at: string;
  updated_at: string;
  status: RegistrationStatus;
  employment_type: EmploymentType;
  gender?: Gender | null;
  sex?: Gender | null;
  national_id?: string | null;
  referral_type?: ReferralType | null;
  referral_name?: string | null;
  rejection_reason: string | null;
  job_name: string;
  city_name: string;
  subcity_name: string;
  woreda_name: string;
}

export interface MyNotificationItem {
  id: string;
  message: string;
  status: string;
  sent_at: string | null;
  created_at: string;
}

export interface MyReferralSummary {
  total_invites: number;
  approved_invites: number;
  pending_invites: number;
  rejected_invites: number;
  suspended_invites: number;
  payout_rate: number;
  total_earned_payout: number;
  pending_payout: number;
}

export interface MyReferredApplicant {
  registration_id: string;
  customer_name: string;
  customer_phone: string;
  job_name: string;
  status: RegistrationStatus;
  city_name: string | null;
  created_at: string | null;
}

export interface MyReferralReport {
  summary: MyReferralSummary;
  user_referral_name: string;
  customers: MyReferredApplicant[];
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

