// ATS source adapters. Public JSON APIs first, HTML fallback last.
// Real fetch/normalize logic is implemented in Prompt 6 (job scraping).

export type AtsType = "greenhouse" | "lever" | "ashby" | "workable" | "html";

export type NormalizedJob = {
  externalId: string;
  title: string;
  location: string | null;
  remote: boolean;
  employmentType: string | null;
  description: string;
  applyUrl: string;
  postedAt: string | null;
};

// Fetch + normalize jobs for a company from its ATS. Stub for now.
export async function fetchJobs(
  _atsType: AtsType,
  _slug: string
): Promise<NormalizedJob[]> {
  return [];
}
