import { PolicyType } from "@/generated/prisma";

export type ExtractedPolicy = {
  provider?: string;
  type?: PolicyType;
  policyNumber?: string;
  startDate?: Date | null;
  endDate?: Date | null;
  premiumPence?: number | null;
  autoRenew?: boolean;
};

function titleCase(word: string) {
  return word.replace(/(^|\s|[-_])(\w)/g, (_, p1, p2) => p1 + p2.toUpperCase());
}

export function providerFromFromHeader(from: string | undefined): string | undefined {
  if (!from) return undefined;
  // Try to grab domain name excluding tld, then title-case
  const m = from.match(/@([A-Za-z0-9.-]+)/);
  if (!m) return undefined;
  const domain = m[1];
  const label = domain.split(".")[0];
  if (!label) return undefined;
  return titleCase(label);
}

export function detectPolicyType(text: string): PolicyType | undefined {
  const t = text.toLowerCase();
  if (/\b(car|motor|auto)\b/.test(t)) return "CAR";
  if (/(home|buildings?|contents?)/.test(t)) return "HOME";
  if (/\blife\b/.test(t)) return "LIFE";
  if (/\bpet\b/.test(t)) return "PET";
  if (/travel/.test(t)) return "TRAVEL";
  if (/health|medical/.test(t)) return "HEALTH";
  if (/income\s*protection/.test(t)) return "INCOME_PROTECTION";
  return undefined;
}

export function extractPolicyNumber(text: string): string | undefined {
  // Common patterns: Policy Number, Policy No, Policy #, Reference
  const re = /(policy\s*(number|no\.?|#)|reference|policy id)[:\s]*([A-Z0-9-]{6,})/i;
  const m = text.match(re);
  return m?.[3]?.trim();
}

export function extractDates(text: string): { start?: Date; end?: Date } {
  const out: { start?: Date; end?: Date } = {};
  // Day Month Year (UK) e.g., 15 Mar 2025, 15 March 2025, 15/03/2025
  const patterns = [
    /(start|effective)\s*(date)?[:\s]*([0-9]{1,2}\s+[A-Za-z]{3,9}\s+[0-9]{4}|[0-9]{1,2}\/[0-9]{1,2}\/[0-9]{2,4})/i,
    /(end|renewal)\s*(date)?[:\s]*([0-9]{1,2}\s+[A-Za-z]{3,9}\s+[0-9]{4}|[0-9]{1,2}\/[0-9]{1,2}\/[0-9]{2,4})/i,
  ];
  const mStart = text.match(patterns[0]);
  const mEnd = text.match(patterns[1]);
  const parse = (s?: string) => {
    if (!s) return undefined;
    // Try dd/mm/yyyy first (UK)
    const m = s.match(/^([0-9]{1,2})\/([0-9]{1,2})\/([0-9]{2,4})$/);
    if (m) {
      const d = Number(m[1]), mo = Number(m[2]) - 1, y = Number(m[3].length === 2 ? "20" + m[3] : m[3]);
      const date = new Date(y, mo, d);
      return isNaN(date.getTime()) ? undefined : date;
    }
    const d2 = new Date(s);
    return isNaN(d2.getTime()) ? undefined : d2;
  };
  if (mStart) out.start = parse(mStart[3]);
  if (mEnd) out.end = parse(mEnd[3]);
  return out;
}

export function extractPremium(text: string): number | undefined {
  // Look for £ followed by number, optionally per year/month
  const re = /£\s*([0-9,.]+)\s*(per\s*(year|annum|month)|\/(year|annum|month))?/i;
  const m = text.match(re);
  if (!m) return undefined;
  const pounds = Number(m[1].replace(/,/g, ""));
  if (isNaN(pounds)) return undefined;
  return Math.round(pounds * 100);
}

export function detectAutoRenew(text: string): boolean {
  return /auto[-\s]?renew|automatically\s+renew/i.test(text);
}

export function extractPolicy(fromHeader: string | undefined, text: string): ExtractedPolicy {
  const provider = providerFromFromHeader(fromHeader) || undefined;
  const type = detectPolicyType(text);
  const policyNumber = extractPolicyNumber(text);
  const dates = extractDates(text);
  const premiumPence = extractPremium(text) ?? null;
  const autoRenew = detectAutoRenew(text);

  return {
    provider,
    type,
    policyNumber,
    startDate: dates.start || null,
    endDate: dates.end || null,
    premiumPence,
    autoRenew,
  };
}
