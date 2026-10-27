import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link } from "wouter";
import { ArrowLeft, ArrowRight, FileText, Plus, Trash2 } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { CATEGORIES, SUPPORTED_CITIES, VENDOR_APPLICATION_THANK_YOU, VENDOR_TERMS_VERSION } from "@shared/catalog";
import { applicationActivitySchema, GROUP_SIZE_VALUES, type ApplicationActivity } from "@shared/application-activities";
import { GOOGLE_MAPS_MESSAGE, isGoogleBusinessUrl } from "@shared/contact-policy";

type ApplicationFields = {
  businessName: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  city: string;
  address: string;
  description: string;
  mapsLink: string;
  acceptTerms: boolean;
};
type FieldName = keyof ApplicationFields;
type FieldErrors = Partial<Record<FieldName, string>>;
type ActivityDraft = {
  name: string;
  category: string;
  priceAmount: string;
  differentVisitorPrice: boolean;
  visitorPriceUsd: string;
  groupSizes: ApplicationActivity["groupSizes"];
  description: string;
};
type ActivityErrors = Record<string, string>;

const initialFields: ApplicationFields = {
  businessName: "", contactName: "", contactEmail: "", contactPhone: "", city: "", address: "",
  description: "", mapsLink: "", acceptTerms: false,
};
const emptyActivity = (): ActivityDraft => ({
  name: "", category: "", priceAmount: "", differentVisitorPrice: false, visitorPriceUsd: "", groupSizes: [], description: "",
});
const DOCUMENT_TYPES = ["application/pdf", "image/jpeg", "image/png"];
const DOCUMENT_MAX_BYTES = 10 * 1024 * 1024;
const DOCUMENTS = [
  { key: "idCopy", label: "ID copy", required: true },
  { key: "policeReport", label: "Police report", required: false },
  { key: "businessRegistration", label: "Business registration", required: false },
] as const;
type DocumentKey = (typeof DOCUMENTS)[number]["key"];

function validateField(field: FieldName, value: ApplicationFields[FieldName]): string {
  const text = typeof value === "string" ? value.trim() : "";
  const limits: Partial<Record<FieldName, number>> = {
    businessName: 120, contactName: 120, contactEmail: 200,
    address: 300, description: 600, mapsLink: 500,
  };
  const limit = limits[field];
  if (limit && text.length > limit) return `Keep this field to ${limit} characters.`;
  if (field === "acceptTerms") return value ? "" : "Please review and accept the draft vendor terms to continue.";
  if (field === "contactEmail") {
    if (!text) return "Enter an email address.";
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text) ? "" : "Enter a valid email address.";
  }
  if (field === "contactPhone") {
    const digits = text.replace(/\D/g, "");
    return /^7\d{8}$/.test(digits) ? "" : "Enter a Sri Lankan mobile number with 9 digits after +94.";
  }
  if (field === "city") return SUPPORTED_CITIES.some((city) => city.name === value) ? "" : "Choose a supported city.";
  if (field === "mapsLink") return text && !isGoogleBusinessUrl(text) ? GOOGLE_MAPS_MESSAGE : "";
  const labels: Partial<Record<FieldName, string>> = {
    businessName: "Enter your business name.",
    contactName: "Enter a contact person.",
    address: "Enter your business address.",
    description: "Tell us a little about your business.",
  };
  return text ? "" : labels[field] ?? "This field is required.";
}

function fileValidation(file: File | null, required: boolean) {
  if (!file) return required ? "Upload your ID copy to continue." : "";
  const extension = file.name.split(".").pop()?.toLowerCase();
  const supported = DOCUMENT_TYPES.includes(file.type) || ["pdf", "jpg", "jpeg", "png"].includes(extension ?? "");
  if (!supported) return "Choose a PDF, JPG or PNG file.";
  if (file.size > DOCUMENT_MAX_BYTES) return "Each document must be 10MB or smaller.";
  return "";
}

function getActivityErrors(activity: ActivityDraft, index: number): ActivityErrors {
  const parsed = applicationActivitySchema.safeParse({
    name: activity.name,
    category: activity.category,
    priceAmount: activity.priceAmount.trim() ? Number(activity.priceAmount) : Number.NaN,
    differentVisitorPrice: activity.differentVisitorPrice,
    visitorPriceUsd: activity.differentVisitorPrice
      ? activity.visitorPriceUsd.trim() ? Number(activity.visitorPriceUsd) : null
      : null,
    groupSizes: activity.groupSizes,
    description: activity.description,
  });
  if (parsed.success) return {};
  const result: ActivityErrors = {};
  parsed.error.issues.forEach((issue) => {
    const field = String(issue.path[0] ?? "name");
    result[`activity-${index}-${field}`] = issue.message;
  });
  return result;
}

async function applicationError(response: Response) {
  const fallback = "We couldn't send your application. Please try again.";
  try {
    const parsed = await response.json() as { message?: string; error?: string };
    return parsed.message || parsed.error || fallback;
  } catch {
    return fallback;
  }
}

export default function VendorApplicationForm({ onBack }: { onBack?: () => void }) {
  const [fields, setFields] = useState<ApplicationFields>(initialFields);
  const [activities, setActivities] = useState<ActivityDraft[]>([emptyActivity()]);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [activityErrors, setActivityErrors] = useState<ActivityErrors>({});
  const [documentErrors, setDocumentErrors] = useState<Partial<Record<DocumentKey, string>>>({});
  const [serverError, setServerError] = useState("");
  const [duplicateEmail, setDuplicateEmail] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [hasAttemptedSubmit, setHasAttemptedSubmit] = useState(false);
  const [validationAttempt, setValidationAttempt] = useState(0);
  const [documents, setDocuments] = useState<Record<DocumentKey, File | null>>({ idCopy: null, policeReport: null, businessRegistration: null });
  const formRef = useRef<HTMLFormElement>(null);
  const successRef = useRef<HTMLElement>(null);
  const applicationMutation = useMutation({
    mutationFn: async (payload: FormData) => {
      const response = await fetch("/api/vendor-applications", { method: "POST", credentials: "include", body: payload });
      if (!response.ok) throw new Error(await applicationError(response));
      return response;
    },
  });

  useEffect(() => {
    if (submitted) successRef.current?.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "center" });
  }, [submitted]);
  useEffect(() => {
    if (!validationAttempt) return;
    // Run after React commits the new errors, not in a frame that can see stale DOM.
    const firstInvalid = formRef.current?.querySelector<HTMLElement>(
      'input[aria-invalid="true"], select[aria-invalid="true"], textarea[aria-invalid="true"]',
    );
    if (firstInvalid) {
      firstInvalid.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "center" });
      firstInvalid.focus({ preventScroll: true });
    }
  }, [validationAttempt]);

  const updateField = <K extends FieldName>(field: K, value: ApplicationFields[K]) => {
    setFields((current) => ({ ...current, [field]: value }));
    if (errors[field]) setErrors((current) => ({ ...current, [field]: validateField(field, value) }));
    if (serverError) { setServerError(""); setDuplicateEmail(false); }
  };
  const updateActivity = (index: number, field: keyof ActivityDraft, value: string | boolean | ApplicationActivity["groupSizes"]) => {
    setActivities((current) => current.map((activity, itemIndex) => itemIndex === index ? { ...activity, [field]: value } : activity));
    const key = `activity-${index}-${field === "priceAmount" ? "priceAmount" : field === "visitorPriceUsd" ? "visitorPriceUsd" : field}`;
    if (activityErrors[key]) setActivityErrors((current) => {
      const next = { ...current };
      delete next[key];
      return next;
    });
    if (field === "differentVisitorPrice") setActivityErrors((current) => {
      const next = { ...current };
      delete next[`activity-${index}-visitorPriceUsd`];
      return next;
    });
    if (serverError) { setServerError(""); setDuplicateEmail(false); }
  };
  const normalizeMobileInput = (input: string) => {
    const digits = input.replace(/\D/g, "");
    const localDigits = digits.length === 11 && digits.startsWith("94")
      ? digits.slice(2)
      : digits.length === 10 && digits.startsWith("0")
        ? digits.slice(1)
        : digits;
    return localDigits.slice(0, 9);
  };
  const fieldError = (field: FieldName) => errors[field] ? <p className="v4-error" id={`vendor-error-${field}`} role="alert">{errors[field]}</p> : null;
  const activityError = (index: number, field: string) => {
    const key = `activity-${index}-${field}`;
    return activityErrors[key] ? <p className="v4-error" id={`vendor-error-${key}`} role="alert">{activityErrors[key]}</p> : null;
  };

  const submitApplication = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setHasAttemptedSubmit(true);
    const nextErrors: FieldErrors = {};
    (Object.keys(fields) as FieldName[]).forEach((field) => {
      const issue = validateField(field, fields[field]);
      if (issue) nextErrors[field] = issue;
    });
    const nextActivityErrors = activities.reduce<ActivityErrors>((acc, activity, index) => ({ ...acc, ...getActivityErrors(activity, index) }), {});
    const nextDocumentErrors: Partial<Record<DocumentKey, string>> = {};
    DOCUMENTS.forEach(({ key, required }) => {
      const issue = fileValidation(documents[key], required);
      if (issue) nextDocumentErrors[key] = issue;
    });
    setErrors(nextErrors);
    setActivityErrors(nextActivityErrors);
    setDocumentErrors(nextDocumentErrors);
    setServerError("");
    setDuplicateEmail(false);

    const errorCount = Object.keys(nextErrors).length + Object.keys(nextActivityErrors).length + Object.keys(nextDocumentErrors).length;
    if (errorCount) {
      setValidationAttempt(current => current + 1);
      return;
    }

    try {
      const payload = new FormData();
      const serializedActivities: ApplicationActivity[] = activities.map((activity) => ({
        name: activity.name.trim(),
        category: activity.category as ApplicationActivity["category"],
        priceAmount: Number(activity.priceAmount),
        differentVisitorPrice: activity.differentVisitorPrice,
        visitorPriceUsd: activity.differentVisitorPrice ? Number(activity.visitorPriceUsd) : null,
        groupSizes: activity.groupSizes,
        description: activity.description.trim(),
      }));
      payload.append("application", JSON.stringify({
        businessName: fields.businessName.trim(),
        contactName: fields.contactName.trim(),
        contactEmail: fields.contactEmail.trim().toLowerCase(),
        contactPhone: `+94${fields.contactPhone.replace(/\D/g, "")}`,
        city: fields.city,
        address: fields.address.trim(),
        description: fields.description.trim(),
        ...(fields.mapsLink.trim() ? { mapsLink: fields.mapsLink.trim() } : {}),
        acceptTerms: fields.acceptTerms,
        activities: serializedActivities,
      }));
      DOCUMENTS.forEach(({ key }) => { if (documents[key]) payload.append(key, documents[key] as File); });
      await applicationMutation.mutateAsync(payload);
      setSubmitted(true);
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      const isDuplicate = message.toLowerCase().includes("already has an account");
      setDuplicateEmail(isDuplicate);
      setServerError(isDuplicate ? message : "We couldn't send your application. Please try again.");
    }
  };

  if (submitted) {
    return (
      <section ref={successRef} className="v4-success" aria-live="polite" data-testid="vendor-application-success" tabIndex={-1}>
        <span className="v4-success-mark" aria-hidden="true">✓</span>
        <h2>Application received</h2>
        <p className="v4-success-message">{VENDOR_APPLICATION_THANK_YOU}</p>
      </section>
    );
  }

  const fieldLabels: Partial<Record<FieldName, string>> = {
    businessName: "Business name", contactName: "Contact person", contactEmail: "Email address",
    contactPhone: "Mobile number", city: "City", address: "Business address",
    description: "Business description", mapsLink: "Google Maps link", acceptTerms: "Vendor terms",
  };
  const summaryItems = [
    ...Object.entries(errors).filter(([, message]) => !!message).map(([key, message]) => `${fieldLabels[key as FieldName] ?? key}: ${message}`),
    ...Object.entries(activityErrors).filter(([, message]) => !!message).map(([key, message]) => {
      const [, index, field] = key.split("-");
      const fieldLabel: Record<string, string> = { name: "name", category: "category", priceAmount: "LKR price", visitorPriceUsd: "visitor USD price", groupSizes: "group sizes", description: "description" };
      return `Activity ${Number(index) + 1} ${fieldLabel[field] ?? field}: ${message}`;
    }),
    ...Object.entries(documentErrors).filter(([, message]) => !!message).map(([key, message]) => `${DOCUMENTS.find((doc) => doc.key === key)?.label ?? "Document"}: ${message}`),
  ];

  return (
    <form ref={formRef} className="v4-form-card" onSubmit={submitApplication} noValidate onBlurCapture={(event) => {
      // Inline blur errors can move Send between pointerdown and click, cancelling
      // the submit. The submit handler validates everything after that click.
      const next = event.relatedTarget;
      if (next instanceof HTMLElement && next.closest('button[type="submit"]')) event.stopPropagation();
    }}>
      {serverError && (
        <div className="v4-form-alert" role="alert" data-testid="vendor-application-error">
          {duplicateEmail ? <>
            <strong>There’s already an account with that email.</strong> {serverError}{" "}
            <Link href={`/login?next=${encodeURIComponent("/for-vendors/apply")}`}>Log in, then apply</Link>.
          </> : <>{serverError} <button type="button" onClick={() => formRef.current?.requestSubmit()}>Retry application</button></>}
        </div>
      )}
      <div className="v4-form-grid">
        <div className="v4-field">
          <label htmlFor="vendor-business-name">Business name</label>
          <input className="v4-input" id="vendor-business-name" name="businessName" autoComplete="organization" value={fields.businessName} onChange={(event) => updateField("businessName", event.target.value)} onBlur={() => setErrors((current) => ({ ...current, businessName: validateField("businessName", fields.businessName) }))} aria-invalid={!!errors.businessName} aria-describedby={errors.businessName ? "vendor-error-businessName" : undefined} required />
          {fieldError("businessName")}
        </div>
        <div className="v4-field">
          <label htmlFor="vendor-contact-name">Contact person</label>
          <input className="v4-input" id="vendor-contact-name" name="contactName" autoComplete="name" value={fields.contactName} onChange={(event) => updateField("contactName", event.target.value)} onBlur={() => setErrors((current) => ({ ...current, contactName: validateField("contactName", fields.contactName) }))} aria-invalid={!!errors.contactName} aria-describedby={errors.contactName ? "vendor-error-contactName" : undefined} required />
          {fieldError("contactName")}
        </div>
        <div className="v4-field">
          <label htmlFor="vendor-contact-phone">Mobile number</label>
          <div className="v4-phone-control">
            <span className="v4-phone-prefix" aria-hidden="true">+94</span>
            <input className="v4-input" id="vendor-contact-phone" name="contactPhone" type="tel" inputMode="tel" autoComplete="tel-national" placeholder="7X XXX XXXX" maxLength={18} value={fields.contactPhone} onChange={(event) => updateField("contactPhone", normalizeMobileInput(event.target.value))} aria-label="Mobile number after country code +94" aria-invalid={!!errors.contactPhone} aria-describedby={errors.contactPhone ? "vendor-error-contactPhone" : "vendor-phone-hint"} required />
          </div>
          <small id="vendor-phone-hint">Sri Lankan mobile number</small>
          {fieldError("contactPhone")}
        </div>
        <div className="v4-field">
          <label htmlFor="vendor-contact-email">Email address</label>
          <input className="v4-input" id="vendor-contact-email" name="contactEmail" type="email" autoComplete="email" value={fields.contactEmail} onChange={(event) => updateField("contactEmail", event.target.value)} onBlur={() => setErrors((current) => ({ ...current, contactEmail: validateField("contactEmail", fields.contactEmail) }))} aria-invalid={!!errors.contactEmail} aria-describedby={errors.contactEmail ? "vendor-error-contactEmail" : undefined} required />
          {fieldError("contactEmail")}
        </div>
        <div className="v4-field">
          <label htmlFor="vendor-city">City</label>
          <select className="v4-select" id="vendor-city" name="city" value={fields.city} onChange={(event) => updateField("city", event.target.value)} aria-invalid={!!errors.city} aria-describedby={errors.city ? "vendor-error-city" : undefined} required>
            <option value="">Choose a city</option>
            {SUPPORTED_CITIES.map(({ name }) => <option key={name} value={name}>{name}</option>)}
          </select>
          {fieldError("city")}
        </div>
        <div className="v4-field">
          <label htmlFor="vendor-address">Business address</label>
          <input className="v4-input" id="vendor-address" name="address" autoComplete="street-address" value={fields.address} onChange={(event) => updateField("address", event.target.value)} onBlur={() => setErrors((current) => ({ ...current, address: validateField("address", fields.address) }))} aria-invalid={!!errors.address} aria-describedby={errors.address ? "vendor-error-address" : undefined} required />
          {fieldError("address")}
        </div>

        <section className="v4-field v4-field--full v4-activities" data-testid="activities" aria-labelledby="vendor-activities-heading">
          <div className="v4-activities-heading">
            <div><p className="v4-eyebrow">Your listing</p><h2 id="vendor-activities-heading">Your activities</h2><p>Add each experience you offer. Every activity has its own category, price and group sizes.</p></div>
            <span className="v4-activity-count">{activities.length} of 10</span>
          </div>
          <div className="v4-activity-list">
            {activities.map((activity, index) => {
              const nameId = `activity-${index}-name`;
              const categoryId = `activity-${index}-category`;
              const priceId = `activity-${index}-priceAmount`;
              const visitorId = `activity-${index}-visitorPriceUsd`;
              const descriptionId = `activity-${index}-description`;
              return <article className="v4-activity-card" key={index}>
                <div className="v4-activity-card-head">
                  <div><span className="v4-activity-number">0{index + 1}</span><h3>Activity {index + 1}</h3></div>
                  {index > 0 && <button className="v4-remove-activity" type="button" data-testid="remove-activity" onClick={() => {
                    setActivities((current) => current.filter((_, itemIndex) => itemIndex !== index));
                    setActivityErrors({});
                  }}><Trash2 size={15} aria-hidden="true" /> Remove</button>}
                </div>
                <div className="v4-form-grid v4-activity-fields">
                  <div className="v4-field">
                    <label htmlFor={nameId}>Activity name</label>
                    <input className="v4-input" id={nameId} name={`activities.${index}.name`} data-field={`activity-${index}-name`} maxLength={60} value={activity.name} onChange={(event) => updateActivity(index, "name", event.target.value)} onBlur={() => setActivityErrors((current) => ({ ...current, ...getActivityErrors(activity, index) }))} aria-invalid={!!activityErrors[`activity-${index}-name`]} aria-describedby={activityErrors[`activity-${index}-name`] ? `vendor-error-activity-${index}-name` : undefined} required />
                    {activityError(index, "name")}
                  </div>
                  <div className="v4-field">
                    <label htmlFor={categoryId}>Category</label>
                    <select className="v4-select" id={categoryId} name={`activities.${index}.category`} data-field={`activity-${index}-category`} value={activity.category} onChange={(event) => updateActivity(index, "category", event.target.value)} aria-invalid={!!activityErrors[`activity-${index}-category`]} aria-describedby={activityErrors[`activity-${index}-category`] ? `vendor-error-activity-${index}-category` : undefined} required>
                      <option value="">Choose a category</option>
                      {CATEGORIES.map((category) => <option value={category.value} key={category.value}>{category.label}</option>)}
                    </select>
                    {activityError(index, "category")}
                  </div>
                  <div className="v4-field v4-field--full">
                    <label htmlFor={priceId}>Price for Sri Lankans and residents per person (LKR)</label>
                    <input className="v4-input" id={priceId} name={`activities.${index}.priceAmount`} data-field={`activity-${index}-priceAmount`} type="number" min="0" max="10000000" step="1" inputMode="numeric" placeholder="e.g. 3500" value={activity.priceAmount} onChange={(event) => updateActivity(index, "priceAmount", event.target.value)} onBlur={() => setActivityErrors((current) => ({ ...current, ...getActivityErrors(activity, index) }))} aria-invalid={!!activityErrors[`activity-${index}-priceAmount`]} aria-describedby={activityErrors[`activity-${index}-priceAmount`] ? `vendor-error-activity-${index}-priceAmount` : undefined} required />
                    {activityError(index, "priceAmount")}
                  </div>
                  <fieldset className="v4-field v4-field--full v4-activity-option">
                    <legend className="v4-field-legend">Different price for foreign visitors?</legend>
                    <label className="v4-toggle"><input type="checkbox" name={`activities.${index}.differentVisitorPrice`} checked={activity.differentVisitorPrice} onChange={(event) => updateActivity(index, "differentVisitorPrice", event.target.checked)} /><span aria-hidden="true" /><b>{activity.differentVisitorPrice ? "Yes" : "No"}</b></label>
                  </fieldset>
                  {activity.differentVisitorPrice && <div className="v4-field v4-field--full">
                    <label htmlFor={visitorId}>Price for foreign visitors per person (USD)</label>
                    <input className="v4-input" id={visitorId} name={`activities.${index}.visitorPriceUsd`} data-field={`activity-${index}-visitorPriceUsd`} type="number" min="0" max="1000000" step="1" inputMode="numeric" placeholder="e.g. 25" value={activity.visitorPriceUsd} onChange={(event) => updateActivity(index, "visitorPriceUsd", event.target.value)} onBlur={() => setActivityErrors((current) => ({ ...current, ...getActivityErrors(activity, index) }))} aria-invalid={!!activityErrors[`activity-${index}-visitorPriceUsd`]} aria-describedby={activityErrors[`activity-${index}-visitorPriceUsd`] ? `vendor-error-activity-${index}-visitorPriceUsd` : undefined} required />
                    {activityError(index, "visitorPriceUsd")}
                  </div>}
                  <fieldset className="v4-field v4-field--full v4-activity-option" aria-invalid={!!activityErrors[`activity-${index}-groupSizes`]} aria-describedby={activityErrors[`activity-${index}-groupSizes`] ? `vendor-error-activity-${index}-groupSizes` : undefined}>
                    <legend className="v4-field-legend">Typical group sizes</legend>
                    <div className="v4-group-pills" role="group" aria-label={`Group sizes for activity ${index + 1}`}>
                      {GROUP_SIZE_VALUES.map((size) => <label className="v4-group-pill" key={size}>
                        <input type="checkbox" name={`activities.${index}.groupSizes`} value={size} checked={activity.groupSizes.includes(size)} onChange={(event) => updateActivity(index, "groupSizes", (event.target.checked ? [...activity.groupSizes, size] : activity.groupSizes.filter((item) => item !== size)) as ApplicationActivity["groupSizes"])} aria-invalid={!!activityErrors[`activity-${index}-groupSizes`]} aria-describedby={activityErrors[`activity-${index}-groupSizes`] ? `vendor-error-activity-${index}-groupSizes` : undefined} />
                        <span>{size === "1" ? "1 person" : size === "2" ? "2 people" : size === "3-5" ? "3-5 people" : "6+ people"}</span>
                      </label>)}
                    </div>
                    {activityError(index, "groupSizes")}
                  </fieldset>
                  <div className="v4-field v4-field--full">
                    <label htmlFor={descriptionId}>Activity description <span className="v4-optional">Optional</span></label>
                    <textarea className="v4-textarea v4-activity-description" id={descriptionId} name={`activities.${index}.description`} data-field={`activity-${index}-description`} maxLength={300} placeholder="What will guests do?" value={activity.description} onChange={(event) => updateActivity(index, "description", event.target.value)} onBlur={() => setActivityErrors((current) => ({ ...current, ...getActivityErrors(activity, index) }))} aria-invalid={!!activityErrors[`activity-${index}-description`]} aria-describedby={activityErrors[`activity-${index}-description`] ? `vendor-error-activity-${index}-description` : `activity-description-hint-${index}`} />
                    <small id={`activity-description-hint-${index}`}>{activity.description.length}/300 characters. Leave out phone numbers and email addresses.</small>
                    {activityError(index, "description")}
                  </div>
                </div>
              </article>;
            })}
          </div>
          {activities.length < 10 && <button className="v4-add-activity" type="button" data-testid="add-activity" onClick={() => setActivities((current) => [...current, emptyActivity()])}><Plus size={17} aria-hidden="true" /> Add another activity</button>}
        </section>

        <div className="v4-field v4-field--full">
          <label htmlFor="vendor-description">Tell us about your business</label>
          <textarea className="v4-textarea" id="vendor-description" name="description" maxLength={600} placeholder="A little about your business and what guests can expect." value={fields.description} onChange={(event) => updateField("description", event.target.value)} onBlur={() => setErrors((current) => ({ ...current, description: validateField("description", fields.description) }))} aria-invalid={!!errors.description} aria-describedby={errors.description ? "vendor-error-description" : "vendor-description-hint"} required />
          <small id="vendor-description-hint">{fields.description.length}/600 characters</small>
          {fieldError("description")}
        </div>
        <div className="v4-field v4-field--full">
          <label htmlFor="vendor-maps-link">Google Maps link to your business (optional)</label>
          <input className="v4-input" id="vendor-maps-link" name="mapsLink" type="url" placeholder="https://maps.app.goo.gl/" value={fields.mapsLink} onChange={(event) => updateField("mapsLink", event.target.value)} aria-invalid={!!errors.mapsLink} aria-describedby={errors.mapsLink ? "vendor-error-mapsLink" : "vendor-maps-hint"} />
          {fieldError("mapsLink")}
          <small id="vendor-maps-hint">We use this to show your Google rating on your listing.</small>
        </div>
        <fieldset className="v4-field v4-field--full v4-document-fieldset">
          <legend className="v4-field-legend">Verification documents</legend>
          <p className="v4-privacy-copy">We use these only to verify you. Only Free Spirit admins can see them.</p>
          <div className="v4-document-grid">
            {DOCUMENTS.map(({ key, label, required }) => <div className={`v4-document-upload${documentErrors[key] ? " v4-document-upload--invalid" : ""}`} key={key}>
              <label htmlFor={`vendor-document-${key}`}>{label}</label>
              <small className="v4-document-requirement">{required ? "Required" : "Optional"}</small>
              <input id={`vendor-document-${key}`} data-field={`document-${key}`} type="file" required={required} accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
                aria-describedby={`vendor-document-hint-${key}${documentErrors[key] ? ` vendor-document-error-${key}` : ""}`}
                aria-invalid={!!documentErrors[key]} onChange={(event) => {
                  const file = event.target.files?.[0] ?? null;
                  const issue = fileValidation(file, false);
                  setDocuments((current) => ({ ...current, [key]: issue ? null : file }));
                  setDocumentErrors((current) => ({ ...current, [key]: issue }));
                  if (issue) event.target.value = "";
                }} />
              <small id={`vendor-document-hint-${key}`}>PDF, JPG or PNG. Maximum 10MB.</small>
              {documents[key] && <small className="v4-document-selected">{documents[key]?.name} selected</small>}
              {documentErrors[key] && <p className="v4-error" id={`vendor-document-error-${key}`} role="alert">{documentErrors[key]}</p>}
            </div>)}
          </div>
        </fieldset>
        <div className="v4-field v4-field--full">
          <div className="v4-check-wrap">
            <input id="vendor-accept-terms" name="acceptTerms" type="checkbox" checked={fields.acceptTerms} onChange={(event) => updateField("acceptTerms", event.target.checked)} onBlur={() => setErrors((current) => ({ ...current, acceptTerms: validateField("acceptTerms", fields.acceptTerms) }))} aria-invalid={!!errors.acceptTerms} aria-describedby={errors.acceptTerms ? "vendor-error-acceptTerms" : undefined} required />
            <div><label htmlFor="vendor-accept-terms">I agree to the <Link href="/vendor-terms">vendor terms (version {VENDOR_TERMS_VERSION}, pending legal review)</Link>. We'll ask you to accept the final version before your first paid booking.</label></div>
          </div>
          {fieldError("acceptTerms")}
        </div>
      </div>
      {hasAttemptedSubmit && summaryItems.length > 0 && <section className="v4-error-summary" role="alert" data-testid="error-summary" aria-live="assertive">
        <strong>Please fix {summaryItems.length} {summaryItems.length === 1 ? "thing" : "things"} before sending</strong>
        <ul>{summaryItems.map((item, index) => <li key={`${item}-${index}`}>{item}</li>)}</ul>
      </section>}
      <div className="v4-submit-row">
        <button className="v4-button v4-button--orange" type="submit" disabled={applicationMutation.isPending} data-testid="button-submit-vendor-application">
          {applicationMutation.isPending ? "Sending..." : "Send application"} <ArrowRight size={17} aria-hidden="true" />
        </button>
        <p>Your details are for discussing your listing and next steps with Free Spirit.</p>
      </div>
      {onBack && <button type="button" className="v4-back-link" onClick={onBack}><ArrowLeft size={16} aria-hidden="true" /> Back to the vendor overview</button>}
    </form>
  );
}
