import { useState, type FormEvent, useRef } from "react";
import { Link } from "wouter";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { CATEGORIES, SUPPORTED_CITIES, VENDOR_APPLICATION_THANK_YOU, VENDOR_TERMS_VERSION } from "@shared/catalog";
import { apiRequest } from "@/lib/queryClient";

type ApplicationFields = {
  businessName: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  city: string;
  address: string;
  activityTypes: string[];
  description: string;
  capacity: string;
  typicalPrice: string;
  website: string;
  mapsLink: string;
  acceptTerms: boolean;
};
type FieldName = keyof ApplicationFields;
type FieldErrors = Partial<Record<FieldName, string>>;

const initialFields: ApplicationFields = {
  businessName: "", contactName: "", contactEmail: "", contactPhone: "", city: "", address: "",
  activityTypes: [], description: "", capacity: "", typicalPrice: "", website: "", mapsLink: "", acceptTerms: false,
};

function validateField(field: FieldName, value: ApplicationFields[FieldName]): string {
  const text = typeof value === "string" ? value.trim() : "";
  if (field === "activityTypes") return (value as string[]).length ? "" : "Choose at least one activity category.";
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
  if (field === "capacity") {
    if (!text) return "Enter your typical group size.";
    return Number.isInteger(Number(text)) && Number(text) >= 1 && Number(text) <= 10000 ? "" : "Enter a whole group size between 1 and 10,000.";
  }
  if (field === "typicalPrice") {
    if (!text) return "Enter your typical price.";
    return Number.isInteger(Number(text)) && Number(text) >= 0 && Number(text) <= 10000000 ? "" : "Enter a whole LKR amount between 0 and 10,000,000.";
  }
  if (field === "mapsLink") {
    if (!text) return "";
    try { const url = new URL(text); return url.protocol === "https:" || url.protocol === "http:" ? "" : "Enter a valid map link."; }
    catch { return "Enter a full map URL beginning with https://."; }
  }
  if (field === "website") {
    if (!text) return "Enter your website or Instagram.";
    if (/^@[a-zA-Z0-9._]{2,30}$/.test(text)) return "";
    try {
      const url = new URL(/^https?:\/\//i.test(text) ? text : `https://${text}`);
      return (url.protocol === "https:" || url.protocol === "http:") && url.hostname.includes(".") ? "" : "Enter a valid website or Instagram profile.";
    }
    catch { return "Enter a valid website or Instagram profile."; }
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

function errorMessage(error: unknown): string {
  const raw = error instanceof Error ? error.message : "";
  if (/^5\d{2}:\s*/.test(raw)) return "We couldn’t send your application. Please try again.";
  const payload = raw.replace(/^\d+:\s*/, "");
  try {
    const parsed = JSON.parse(payload) as { message?: string };
    return parsed.message || "We couldn’t send your application. Please try again.";
  } catch {
    return "We couldn’t send your application. Please try again.";
  }
}

export default function VendorApplicationForm({ onBack }: { onBack?: () => void }) {
  const [fields, setFields] = useState<ApplicationFields>(initialFields);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [serverError, setServerError] = useState("");
  const [duplicateEmail, setDuplicateEmail] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const applicationMutation = useMutation({
    mutationFn: (payload: Record<string, unknown>) => apiRequest("POST", "/api/vendor-applications", payload),
  });

  const updateField = <K extends FieldName>(field: K, value: ApplicationFields[K]) => {
    setFields((current) => ({ ...current, [field]: value }));
    if (errors[field]) setErrors((current) => ({ ...current, [field]: validateField(field, value) }));
    if (serverError) { setServerError(""); setDuplicateEmail(false); }
  };

  const blurField = (field: FieldName) => {
    setErrors((current) => ({ ...current, [field]: validateField(field, fields[field]) }));
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
      const error = validateField(field, fields[field]);
      if (error) nextErrors[field] = error;
    });
    setErrors(nextErrors);
    setServerError("");
    setDuplicateEmail(false);
    if (Object.keys(nextErrors).length) {
      const firstField = Object.keys(nextErrors)[0];
      formRef.current?.querySelector<HTMLElement>(`[name="${firstField}"]`)?.focus();
      return;
    }
    try {
      const website = fields.website.trim();
      const websiteValue = website.startsWith("@")
        ? website
        : (/^https?:\/\//i.test(website) ? website : `https://${website}`);
      await applicationMutation.mutateAsync({
        businessName: fields.businessName.trim(),
        contactName: fields.contactName.trim(),
        contactEmail: fields.contactEmail.trim().toLowerCase(),
        contactPhone: `+94${fields.contactPhone.replace(/\D/g, "")}`,
        city: fields.city,
        address: fields.address.trim(),
        activityTypes: fields.activityTypes,
        capacity: Number(fields.capacity),
        typicalPrice: Number(fields.typicalPrice),
        description: fields.description.trim(),
        website: websiteValue,
        mapsLink: fields.mapsLink.trim(),
        acceptTerms: fields.acceptTerms,
      });
      setSubmitted(true);
    } catch (error) {
      const message = errorMessage(error);
      setDuplicateEmail(message === "This email already has an account — log in first, then apply");
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
        <div className="v4-field">
          <label htmlFor="vendor-capacity">Typical group size</label>
          <input className="v4-input" id="vendor-capacity" name="capacity" type="number" min="1" max="500" step="1" inputMode="numeric" value={fields.capacity} onChange={(event) => updateField("capacity", event.target.value)} onBlur={handleBlur("capacity")} aria-invalid={!!errors.capacity} aria-describedby={errors.capacity ? "vendor-error-capacity" : undefined} required />
          {fieldError("capacity")}
        </div>
        <div className="v4-field">
          <label htmlFor="vendor-price">Typical price per person (LKR)</label>
          <input className="v4-input" id="vendor-price" name="typicalPrice" type="number" min="0" max="10000000" step="1" inputMode="numeric" placeholder="e.g. 3500" value={fields.typicalPrice} onChange={(event) => updateField("typicalPrice", event.target.value)} onBlur={handleBlur("typicalPrice")} aria-invalid={!!errors.typicalPrice} aria-describedby={errors.typicalPrice ? "vendor-error-typicalPrice" : undefined} required />
          {fieldError("typicalPrice")}
        </div>
        <div className="v4-field v4-field--full">
          <label htmlFor="vendor-description">Tell us about your experience</label>
          <textarea className="v4-textarea" id="vendor-description" name="description" maxLength={600} placeholder="What do guests do, and what makes it a good experience for a group?" value={fields.description} onChange={(event) => updateField("description", event.target.value)} onBlur={handleBlur("description")} aria-invalid={!!errors.description} aria-describedby={errors.description ? "vendor-error-description" : "vendor-description-hint"} required />
          <small id="vendor-description-hint">{fields.description.length}/600 characters</small>
          {fieldError("description")}
        </div>
        <div className="v4-field">
          <label htmlFor="vendor-website">Website or Instagram</label>
          <input className="v4-input" id="vendor-website" name="website" type="text" autoComplete="url" placeholder="yourbusiness.lk or @yourbusiness" value={fields.website} onChange={(event) => updateField("website", event.target.value)} onBlur={handleBlur("website")} aria-invalid={!!errors.website} aria-describedby={errors.website ? "vendor-error-website" : undefined} required />
          {fieldError("website")}
        </div>
        <div className="v4-field">
          <label htmlFor="vendor-maps-link">Google Maps link <span style={{ color: "#64748b", fontWeight: 500 }}>(optional)</span></label>
          <input className="v4-input" id="vendor-maps-link" name="mapsLink" type="url" placeholder="https://maps.app.goo.gl/…" value={fields.mapsLink} onChange={(event) => updateField("mapsLink", event.target.value)} onBlur={handleBlur("mapsLink")} aria-invalid={!!errors.mapsLink} aria-describedby={errors.mapsLink ? "vendor-error-mapsLink" : undefined} />
          {fieldError("mapsLink")}
        </div>
        <div className="v4-field v4-field--full">
          <div className="v4-check-wrap">
            <input id="vendor-accept-terms" name="acceptTerms" type="checkbox" checked={fields.acceptTerms} onChange={(event) => updateField("acceptTerms", event.target.checked)} onBlur={handleBlur("acceptTerms")} aria-invalid={!!errors.acceptTerms} aria-describedby={errors.acceptTerms ? "vendor-error-acceptTerms" : undefined} required />
            <div><label htmlFor="vendor-accept-terms">I agree to the <Link href="/vendor-terms">vendor terms (draft)</Link></label> <span>({VENDOR_TERMS_VERSION}).</span></div>
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
