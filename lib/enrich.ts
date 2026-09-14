// Contact enrichment. A stub for now — manual entry always works. Wiring a
// provider here lets the "Find contact" button resolve a hiring manager.

export type Contact = {
  name: string | null;
  title: string | null;
  email: string | null;
};

// Resolve a likely hiring-manager contact for a company + role.
//
// TODO: wire Hunter.io (HUNTER_API_KEY) or Apollo — e.g. Hunter's
// domain-search / email-finder endpoints — to return a real contact. Until
// then this returns null so the UI falls back to manual entry.
export async function findContact(
  _company: string,
  _role: string
): Promise<Contact | null> {
  const key = process.env.HUNTER_API_KEY;
  if (!key) return null;
  // Enrichment provider not wired yet — placeholder for the integration.
  return null;
}
