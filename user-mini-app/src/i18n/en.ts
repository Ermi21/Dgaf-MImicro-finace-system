const en = {  common: {
    loading: "Loading...",
    retry: "Try again",
    back: "Back",
    next: "Next",
    submit: "Submit",
    cancel: "Cancel",
    somethingWrong: "Something went wrong.",
  },
  home: {
    title: "Job Registration",
    subtitle: "Open this from the bot menu to register or check your status.",
  },
  register: {
    title: "New registration",
    stepPersonal: "Your details",
    stepLocation: "Location",
    stepJob: "Job",
    stepReview: "Review",
    firstName: "First name",
    secondName: "Second name",
    phone: "Phone number",
    phoneHint: "e.g. 0911223344",
    city: "City",
    subcity: "Subcity / Zone",
    woreda: "Woreda",
    job: "Job",
    employmentType: "Employment type",
    employmentEmployee: "Employee",
    employmentSelfEmployed: "Self-employed",
    selectPlaceholder: "Select...",
    reviewIntro: "Check your details before submitting.",
    submitRegistration: "Submit registration",
    submitting: "Submitting...",
    success: "Registration submitted",
    successBody: "We've received your application for {job}. You can track its status under My Registration.",
    duplicateError: "You already have an active registration for this job.",
    validationRequired: "This field is required.",
    validationPhone: "Enter a valid Ethiopian mobile number.",
  },
  profile: {
    title: "My Profile",
    empty: "You don't have a profile yet.",
    emptyHint: "Submit a registration to create one.",
    phone: "Phone",
    language: "Language",
    memberSince: "Registered since",
  },
  registrations: {
    title: "My Registration",
    empty: "You haven't registered for any jobs yet.",
    emptyHint: "Use Register from the menu to get started.",
    statusPending: "Pending review",
    statusApproved: "Approved",
    statusRejected: "Rejected",
    statusSuspended: "Suspended",
    statusCancelled: "Cancelled",
    rejectionReason: "Reason",
    submittedOn: "Submitted",
  },
  notifications: {
    title: "Notifications",
    empty: "No notifications yet.",
  },
} as const;

// NOTE: `en` above uses `as const` for developer ergonomics (literal key
// checking, autocomplete), but the *value* type used elsewhere must be
// the widened `string` shape - otherwise `am.ts` (correctly holding
// different Amharic literals) would fail to satisfy `typeof en`. See
// `Dictionary` below, which is what every other module should import.
export type Dictionary = { [K in keyof typeof en]: { [F in keyof (typeof en)[K]]: string } };

export default en as Dictionary;
