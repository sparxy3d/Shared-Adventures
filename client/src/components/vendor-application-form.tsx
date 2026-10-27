import { useState, type FormEvent, useRef } from "react";
import { Link } from "wouter";
import { ArrowLeft, ArrowRight, FileText } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { CATEGORIES, SUPPORTED_CITIES, VENDOR_APPLICATION_THANK_YOU, VENDOR_TERMS_VERSION } from "@shared/catalog";
import { GOOGLE_MAPS_MESSAGE, isGoogleBusinessUrl } from "@shared/contact-policy";

type ApplicationFields = {
  businessName: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  city: string;
  address: string;
  activityTypes: string[];
  description: string;
  groupSizes: string[];
  typicalPrice: string;
  differentVisitorPrice: boolean;
  typicalVisitorPriceUsd: string;
  mapsLink: string;
  acceptTerms: boolean;
};
type FieldName = keyof ApplicationFields;
type FieldErrors = Partial<Record<FieldName, string>>;

const initialFields: ApplicationFields = {
  businessName: "", contactName: "", contactEmail: "", contactPhone: "", city: "", address: "",
  activityTypes: [], description: "", groupSizes: [], typicalPrice: "", differentVisitorPrice: false, typicalVisitorPriceUsd: "", mapsLink: "", acceptTerms: false,
};

const DOCUMENT_TYPES = ["application/pdf", "image/jpeg", "image/png"];
const DOCUMENT_MAX_BYTES = 10 * 1024 * 1024;
const DOCUMENTS = [
  { key: "idCopy", label: "ID copy", required: true },
  { key: "policeReport", label: "Police report", required: false },
  { key: "businessRegistration", label: "Business registration", required: false },
] as const;
type DocumentKey = (typeof DOCUMENTS)[number]["key"];

function validateField(field: FieldName, value: ApplicationFields[FieldName], visitorPriceEnabled = false): string {
  const text = typeof value === "string" ? value.trim() : "";
  if (field === "activityTypes") return (value as string[]).length ? "" : "Choose at least one activity category.";
  if (field === "groupSizes") return (value as string[]).length ? "" : "Choose at least one typical group size.";
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
  if (field === "typicalPrice") {
    if (!text) return "Enter your typical price.";
    return Number.isInteger(Number(text)) && Number(text) >= 0 && Number(text) <= 10000000 ? "" : "Enter a whole LKR amount between 0 and 10,000,000.";
  }
  if (field === "typicalVisitorPriceUsd") {
    if (!visitorPriceEnabled) return "";
    if (!text) return "Enter your typical visitor price.";
    return Number.isInteger(Number(text)) && Number(text) >= 0 && Number(text) <= 1000000 ? "" : "Enter a whole USD amount between 0 and 1,000,000.";
  }
  if (field === "mapsLink") {
    return isGoogleBusinessUrl(text) ? "" : GOOGLE_MAPS_MESSAGE;
  }
  if (!text) {
    const labels: Partial<Record<FieldName, string>> = {
      businessName: "Enter your business name.", contactName: "Enter a contact person.", address: "Enter your business address.",
      description: "Tell us a little about the experience you offer.",
    };
    return labels[field] ?? "This field is required.";
  }
  if (field === "description" && text.length > 600) return "Keep the description under 600 characters.";
  return "";
}

async function applicationError(response: Response) {
  const fallback = "We couldn’t send your application. Please try again.";
  try {
    const parsed = await response.json() as { message?: string; error?: string };
    return parsed.message || parsed.error || fallback;
  } catch {
    return fallback;
  }
}

function fileValidation(file: File | null, required: boolean) {
  if (!file) return required ? "Upload your ID copy to continue." : "";
  const extension = file.name.split(".").pop()?.toLowerCase();
  const supported = DOCUMENT_TYPES.includes(file.type) || ["pdf", "jpg", "jpeg", "png"].includes(extension ?? "");
  if (!supported) return "Choose a PDF, JPG or PNG file.";
  if (file.size > DOCUMENT_MAX_BYTES) return "Each document must be 10MB or smaller.";
  return "";
}

export default function VendorApplicationForm({ onBack }: { onBack?: () => void }) {
  const [fields, setFields] = useState<ApplicationFields>(initialFields);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [serverError, setServerError] = useState("");
  const [duplicateEmail, setDuplicateEmail] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [documents, setDocuments] = useState<Record<DocumentKey, File | null>>({ idCopy: null, policeReport: null, businessRegistration: null });
  const [documentErrors, setDocumentErrors] = useState<Partial<Record<DocumentKey, string>>>({});
  const formRef = useRef<HTMLFormElement>(null);
  const applicationMutation = useMutation({
    mutationFn: async (payload: FormData) => {
      const response = await fetch("/api/vendor-applications", { method: "POST", credentials: "include", body: payload });
      if (!response.ok) throw new Error(await applicationError(response));
      return response;
    },
  });

  const updateField = <K extends FieldName>(field: K, value: ApplicationFields[K]) => {
    setFields((current) => ({ ...current, [field]: value }));
    if (errors[field]) setErrors((current) => ({ ...current, [field]: validateField(field, value, field === "typicalVisitorPriceUsd" ? fields.differentVisitorPrice : false) }));
    if (serverError) { setServerError(""); setDuplicateEmail(false); }
  };

  const blurField = (field: FieldName) => {
    setErrors((current) => ({ ...current, [field]: validateField(field, fields[field], fields.differentVisitorPrice) }));
  };

  const handleBlur = (field: FieldName) => () => blurField(field);
  const normalizeMobileInput = (input: string) => {
    const digits = input.replace(/\D/g, "");
    const localDigits = digits.length === 11 && digits.startsWith("94")
      ? digits.slice(2)
      : digits.length === 10 && digits.startsWith("0")
        ? digits.slice(1)
        : digits;
    return localDigits.slice(0, 9);
  };

  const submitApplication = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextErrors: FieldErrors = {};
    (Object.keys(fields) as FieldName[]).forEach((field) => {
      const error = validateField(field, fields[field], fields.differentVisitorPrice);
      if (error) nextErrors[field] = error;
    });
    setErrors(nextErrors);
    setServerError("");
    setDuplicateEmail(false);
    const nextDocumentErrors: Partial<Record<DocumentKey, string>> = {};
    DOCUMENTS.forEach(({ key, required }) => {
      const issue = fileValidation(documents[key], required);
      if (issue) nextDocumentErrors[key] = issue;
    });
    setDocumentErrors(nextDocumentErrors);
    if (Object.keys(nextErrors).length || Object.keys(nextDocumentErrors).length) {
      const firstField = Object.keys(nextErrors)[0];
      if (firstField) formRef.current?.querySelector<HTMLElement>(`[name="${firstField}"]`)?.focus();
      else formRef.current?.querySelector<HTMLElement>("#vendor-document-idCopy")?.focus();
      return;
    }
    try {
      const payload = new FormData();
      payload.append("application", JSON.stringify({
        businessName: fields.businessName.trim(),
        contactName: fields.contactName.trim(),
        contactEmail: fields.contactEmail.trim().toLowerCase(),
        contactPhone: `+94${fields.contactPhone.replace(/\D/g, "")}`,
        city: fields.city,
        address: fields.address.trim(),
        activityTypes: fields.activityTypes,
        groupSizes: fields.groupSizes,
        typicalPrice: Number(fields.typicalPrice),
        differentVisitorPrice: fields.differentVisitorPrice,
        typicalVisitorPriceUsd: fields.differentVisitorPrice ? Number(fields.typicalVisitorPriceUsd) : null,
        description: fields.description.trim(),
        mapsLink: fields.mapsLink.trim(),
        acceptTerms: fields.acceptTerms,
      }));
      DOCUMENTS.forEach(({ key }) => { if (documents[key]) payload.append(key, documents[key] as File); });
      await applicationMutation.mutateAsync(payload);
      setSubmitted(true);
    } catch (error) {
      const message = error instanceof Error ? error.message : "We couldn’t send your application. Please try again.";
      setDuplicateEmail(message === "This email already has an account. Log in first, then apply");
      setServerError(message);
    }
  };

  if (submitted) {
    return (
      <section className="v4-success" aria-live="polite" data-testid="vendor-application-success">
        <span className="v4-success-mark" aria-hidden="true">✓</span>
        <p className="v4-eyebrow">Application received</p>
        <h2>{VENDOR_APPLICATION_THANK_YOU}</h2>
        <p>We’ll use the contact details you shared to talk through the next steps for your experience.</p>
        <div className="v4-uploaded-list" aria-label="Submitted documents">
          {DOCUMENTS.filter(({ key }) => documents[key]).map(({ key, label }) => <span key={key}><FileText size={15} aria-hidden="true" />{label}: Uploaded</span>)}
        </div>
        <Link href="/for-vendors" className="v4-back-link"><ArrowLeft size={17} aria-hidden="true" /> Back to the vendor page</Link>
      </section>
    );
  }

  const fieldError = (field: FieldName) => errors[field] ? <p className="v4-error" id={`vendor-error-${field}`} role="alert">{errors[field]}</p> : null;

  return (
    <form ref={formRef} className="v4-form-card" onSubmit={submitApplication} noValidate>
      {serverError && (
        <div className="v4-form-alert" role="alert" data-testid="vendor-application-error">
          <strong>{duplicateEmail ? "There’s already an account with that email." : "We couldn’t send your application."}</strong>
          {duplicateEmail ? (
            <> {serverError} <Link href={`/login?next=${encodeURIComponent("/for-vendors/apply")}`}>Log in, then apply</Link>.</>
          ) : <>{serverError}<br /><button type="button" onClick={() => formRef.current?.requestSubmit()}>Retry application</button></>}
        </div>
      )}
      <div className="v4-form-grid">
        <div className="v4-field">
          <label htmlFor="vendor-business-name">Business name</label>
          <input className="v4-input" id="vendor-business-name" name="businessName" autoComplete="organization" value={fields.businessName} onChange={(event) => updateField("businessName", event.target.value)} onBlur={handleBlur("businessName")} aria-invalid={!!errors.businessName} aria-describedby={errors.businessName ? "vendor-error-businessName" : undefined} required />
          {fieldError("businessName")}
        </div>
        <div className="v4-field">
          <label htmlFor="vendor-contact-name">Contact person</label>
          <input className="v4-input" id="vendor-contact-name" name="contactName" autoComplete="name" value={fields.contactName} onChange={(event) => updateField("contactName", event.target.value)} onBlur={handleBlur("contactName")} aria-invalid={!!errors.contactName} aria-describedby={errors.contactName ? "vendor-error-contactName" : undefined} required />
          {fieldError("contactName")}
        </div>
        <div className="v4-field">
          <label htmlFor="vendor-contact-phone">Mobile number</label>
          <div className="v4-phone-control">
            <span className="v4-phone-prefix" aria-hidden="true">+94</span>
            <input className="v4-input" id="vendor-contact-phone" name="contactPhone" type="tel" inputMode="tel" autoComplete="tel-national" placeholder="7X XXX XXXX" maxLength={18} value={fields.contactPhone} onChange={(event) => updateField("contactPhone", normalizeMobileInput(event.target.value))} onBlur={handleBlur("contactPhone")} aria-label="Mobile number after country code +94" aria-invalid={!!errors.contactPhone} aria-describedby={errors.contactPhone ? "vendor-error-contactPhone" : "vendor-phone-hint"} required />
          </div>
          <small id="vendor-phone-hint">Sri Lankan mobile number</small>
          {fieldError("contactPhone")}
        </div>
        <div className="v4-field">
          <label htmlFor="vendor-contact-email">Email address</label>
          <input className="v4-input" id="vendor-contact-email" name="contactEmail" type="email" autoComplete="email" value={fields.contactEmail} onChange={(event) => updateField("contactEmail", event.target.value)} onBlur={handleBlur("contactEmail")} aria-invalid={!!errors.contactEmail} aria-describedby={errors.contactEmail ? "vendor-error-contactEmail" : undefined} required />
          {fieldError("contactEmail")}
        </div>
        <div className="v4-field">
          <label htmlFor="vendor-city">City</label>
          <select className="v4-select" id="vendor-city" name="city" value={fields.city} onChange={(event) => updateField("city", event.target.value)} onBlur={handleBlur("city")} aria-invalid={!!errors.city} aria-describedby={errors.city ? "vendor-error-city" : undefined} required>
            <option value="">Choose a city</option>
            {SUPPORTED_CITIES.map(({ name }) => <option key={name} value={name}>{name}</option>)}
          </select>
          {fieldError("city")}
        </div>
        <div className="v4-field">
          <label htmlFor="vendor-address">Business address</label>
          <input className="v4-input" id="vendor-address" name="address" autoComplete="street-address" value={fields.address} onChange={(event) => updateField("address", event.target.value)} onBlur={handleBlur("address")} aria-invalid={!!errors.address} aria-describedby={errors.address ? "vendor-error-address" : undefined} required />
          {fieldError("address")}
        </div>
        <fieldset className="v4-field v4-field--full" style={{ border: 0, padding: 0, margin: 0 }}>
          <legend className="v4-field-legend">Activity categories</legend>
          <div className="v4-category-grid">
            {CATEGORIES.map((category) => (
              <label className="v4-category-choice" key={category.value}>
                <input
                  type="checkbox"
                  name="activityTypes"
                  value={category.value}
                  checked={fields.activityTypes.includes(category.value)}
                  onChange={(event) => updateField("activityTypes", event.target.checked ? [...fields.activityTypes, category.value] : fields.activityTypes.filter((value) => value !== category.value))}
                  onBlur={handleBlur("activityTypes")}
                  aria-invalid={!!errors.activityTypes}
                  aria-describedby={errors.activityTypes ? "vendor-error-activityTypes" : undefined}
                />
                {category.label}
              </label>
            ))}
          </div>
          {fieldError("activityTypes")}
        </fieldset>
        <fieldset className="v4-field v4-field--full" style={{ border: 0, padding: 0, margin: 0 }}>
          <legend className="v4-field-legend">Typical group sizes</legend>
          <div className="v4-group-pills" role="group" aria-label="Choose typical group sizes">
            {["1", "2", "3-5", "6+"].map((size) => <label className="v4-group-pill" key={size}>
              <input type="checkbox" name="groupSizes" value={size} checked={fields.groupSizes.includes(size)}
                onChange={(event) => updateField("groupSizes", event.target.checked ? [...fields.groupSizes, size] : fields.groupSizes.filter((item) => item !== size))}
                aria-invalid={!!errors.groupSizes} aria-describedby={errors.groupSizes ? "vendor-error-groupSizes" : undefined} />
              <span>{size === "1" ? "1 person" : size === "2" ? "2 people" : size === "3-5" ? "3–5 people" : `${size} people`}</span>
            </label>)}
          </div>
          {fieldError("groupSizes")}
        </fieldset>
        <fieldset className="v4-field v4-field--full" style={{ border: 0, padding: 0, margin: 0 }}>
          <legend className="v4-field-legend">Do you charge foreign visitors a different price?</legend>
          <div className="v4-visitor-price-choice">
            {[true, false].map(enabled => <label key={String(enabled)}>
              <input name="differentVisitorPrice" type="radio" checked={fields.differentVisitorPrice === enabled} onChange={() => {
                setFields(current => ({ ...current, differentVisitorPrice: enabled }));
                setErrors(current => ({ ...current, typicalVisitorPriceUsd: "" }));
              }} />
              <span>{enabled ? "Yes" : "No"}</span>
            </label>)}
          </div>
        </fieldset>
        <div className="v4-field v4-field--full">
          <label htmlFor="vendor-price">{fields.differentVisitorPrice ? "Typical price for Sri Lankans and residents (LKR)" : "Typical price per person (LKR)"}</label>
          <input className="v4-input" id="vendor-price" name="typicalPrice" type="number" min="0" max="10000000" step="1" inputMode="numeric" placeholder="e.g. 3500" value={fields.typicalPrice} onChange={(event) => updateField("typicalPrice", event.target.value)} onBlur={handleBlur("typicalPrice")} aria-invalid={!!errors.typicalPrice} aria-describedby={errors.typicalPrice ? "vendor-error-typicalPrice" : undefined} required />
          {fieldError("typicalPrice")}
        </div>
        {fields.differentVisitorPrice && <div className="v4-field v4-field--full">
          <label htmlFor="vendor-visitor-price">Typical price for foreign visitors (USD)</label>
          <input className="v4-input" id="vendor-visitor-price" name="typicalVisitorPriceUsd" type="number" min="0" max="1000000" step="1" inputMode="numeric" placeholder="e.g. 25" value={fields.typicalVisitorPriceUsd} onChange={(event) => updateField("typicalVisitorPriceUsd", event.target.value)} onBlur={handleBlur("typicalVisitorPriceUsd")} aria-invalid={!!errors.typicalVisitorPriceUsd} aria-describedby={errors.typicalVisitorPriceUsd ? "vendor-error-typicalVisitorPriceUsd" : undefined} required />
          {fieldError("typicalVisitorPriceUsd")}
        </div>}
        <div className="v4-field v4-field--full">
          <label htmlFor="vendor-description">Tell us about your experience</label>
          <textarea className="v4-textarea" id="vendor-description" name="description" maxLength={600} placeholder="What do guests do, and what makes it a good experience for a group?" value={fields.description} onChange={(event) => updateField("description", event.target.value)} onBlur={handleBlur("description")} aria-invalid={!!errors.description} aria-describedby={errors.description ? "vendor-error-description" : "vendor-description-hint"} required />
          <small id="vendor-description-hint">{fields.description.length}/600 characters</small>
          {fieldError("description")}
        </div>
        <div className="v4-field v4-field--full">
          <label htmlFor="vendor-maps-link">Google Maps link to your business (optional)</label>
          <input className="v4-input" id="vendor-maps-link" name="mapsLink" type="url" placeholder="https://maps.app.goo.gl/" value={fields.mapsLink} onChange={(event) => updateField("mapsLink", event.target.value)} onBlur={handleBlur("mapsLink")} aria-invalid={!!errors.mapsLink} aria-describedby={errors.mapsLink ? "vendor-error-mapsLink" : "vendor-maps-hint"} />
          {fieldError("mapsLink")}
          <small id="vendor-maps-hint">We use this to show your Google rating on your listing.</small>
        </div>
        <fieldset className="v4-field v4-field--full v4-document-fieldset">
          <legend className="v4-field-legend">Verification documents</legend>
          <p className="v4-privacy-copy">Your documents are private. Only authorized Free Spirit administrators can review them for verification. They are not shown publicly or shared with customers. We store document details securely and only use them to assess your application.</p>
          <div className="v4-document-grid">
            {DOCUMENTS.map(({ key, label, required }) => <div className="v4-document-upload" key={key}>
              <label htmlFor={`vendor-document-${key}`}>{label}</label>
              <small className="v4-document-requirement">{required ? "Required" : "Optional"}</small>
              <input id={`vendor-document-${key}`} type="file" required={required} accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
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
            <input id="vendor-accept-terms" name="acceptTerms" type="checkbox" checked={fields.acceptTerms} onChange={(event) => updateField("acceptTerms", event.target.checked)} onBlur={handleBlur("acceptTerms")} aria-invalid={!!errors.acceptTerms} aria-describedby={errors.acceptTerms ? "vendor-error-acceptTerms" : undefined} required />
            <div><label htmlFor="vendor-accept-terms">I agree to the <Link href="/vendor-terms">vendor terms (version {VENDOR_TERMS_VERSION}, pending legal review)</Link>. We'll ask you to accept the final version before your first paid booking.</label></div>
          </div>
          {fieldError("acceptTerms")}
        </div>
      </div>
      <div className="v4-submit-row">
        <button className="v4-button v4-button--orange" type="submit" disabled={applicationMutation.isPending} data-testid="button-submit-vendor-application">
          {applicationMutation.isPending ? "Sending application…" : "Send application"} <ArrowRight size={17} aria-hidden="true" />
        </button>
        <p>Your details are for discussing your listing and next steps with Free Spirit.</p>
      </div>
      {onBack && <button type="button" className="v4-back-link" onClick={onBack}><ArrowLeft size={16} aria-hidden="true" /> Back to the vendor overview</button>}
    </form>
  );
}
