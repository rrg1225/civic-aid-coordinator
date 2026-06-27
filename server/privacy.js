const PHONE_PATTERN = /\b(?:\+?\d[\d -]{7,}\d)\b/g;
const EMAIL_PATTERN = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi;

export function redactSensitiveText(value = "") {
  return String(value)
    .replace(EMAIL_PATTERN, "[redacted-email]")
    .replace(PHONE_PATTERN, "[redacted-phone]");
}

export function publicCaseView(item) {
  return {
    ...item,
    requester: item.requester ? `${item.requester.slice(0, 1)}***` : "Anonymous",
    contact: item.contact ? "[redacted-contact]" : "",
    notes: redactSensitiveText(item.notes)
  };
}
