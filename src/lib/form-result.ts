// Result of a server action that edits a record. Returning { error } instead of throwing lets the form show
// the message: in production a thrown error is replaced by a generic error page.
export type FormResult = { ok?: boolean; error?: string };
