// "Mail almak istemiyor" is stored as a regular BOOLEAN custom field (value "Evet"),
// so it needs no schema change and shows up in the contact form like any other field.
export const MAIL_OPTOUT_KEY = "mail_almak_istemiyor";
export const MAIL_OPTOUT_LABEL = "Mail almak istemiyor";

// customData is stored as compact JSON (JSON.stringify), so this substring is exact.
export const MAIL_OPTOUT_JSON = `"${MAIL_OPTOUT_KEY}":"Evet"`;

export function isMailOptOut(customData: string | null | undefined) {
  return Boolean(customData && customData.includes(MAIL_OPTOUT_JSON));
}
