const WSTG_BASE =
  "https://wstg.owasp.org/latest/4-Web_Application_Security_Testing/";

// Exact page path per WSTG code, matching the OWASP/wstg repo's actual
// file layout (verified against the live site) — WSTG doesn't use
// predictable anchor slugs, so each code needs its real path spelled out.
const CODE_PATHS: Record<string, string> = {
  "WSTG-INFO-01":
    "01-Information_Gathering/01-Conduct_Search_Engine_Reconnaissance_for_Information_Leakage",
  "WSTG-INFO-02": "01-Information_Gathering/02-Fingerprint_Web_Server",
  "WSTG-INFO-04": "01-Information_Gathering/04-Attack_Surface_Identification",
  "WSTG-INFO-06":
    "01-Information_Gathering/06-Identify_Application_Entry_Points",
  "WSTG-CONF-02":
    "02-Configuration_and_Deployment_Management/02-Application_Platform_Configuration",
  "WSTG-CONF-11": "02-Configuration_and_Deployment_Management/11-Cloud_Storage",
  "WSTG-CONF": "02-Configuration_and_Deployment_Management",
  "WSTG-IDNT-04":
    "03-Identity_Management/04-Account_Enumeration_and_Guessable_User_Account",
  "WSTG-CRYP-01": "09-Weak_Cryptography/01-Weak_Transport_Layer_Security",
  "WSTG-SESS-10": "06-Session_Management/10-JSON_Web_Tokens",
  "WSTG-INPV-11": "07-Injection/11-Code_Injection",
  "WSTG-INPV-11.1": "07-Injection/11.1-File_Inclusion",
  "WSTG-CLNT-07": "11-Client-side/07-Cross_Origin_Resource_Sharing",
  "WSTG-APIT-01": "12-API_Testing/01-API_Reconnaissance",
  "WSTG-APIT-99": "12-API_Testing/99-GraphQL",
};

const CHAPTER_COLORS: Record<string, string> = {
  INFO: "bg-blue-500/10 text-blue-700 ring-blue-500/25 dark:text-blue-400",
  CONF: "bg-purple-500/10 text-purple-700 ring-purple-500/25 dark:text-purple-400",
  IDNT: "bg-teal-500/10 text-teal-700 ring-teal-500/25 dark:text-teal-400",
  CRYP: "bg-amber-500/10 text-amber-700 ring-amber-500/25 dark:text-amber-400",
  SESS: "bg-emerald-500/10 text-emerald-700 ring-emerald-500/25 dark:text-emerald-400",
  INPV: "bg-red-500/10 text-red-700 ring-red-500/25 dark:text-red-400",
  CLNT: "bg-pink-500/10 text-pink-700 ring-pink-500/25 dark:text-pink-400",
  APIT: "bg-cyan-500/10 text-cyan-700 ring-cyan-500/25 dark:text-cyan-400",
};

const DEFAULT_COLOR =
  "bg-fd-muted text-fd-muted-foreground ring-fd-border";

interface WstgBadgeProps {
  /** WSTG identifier, e.g. "WSTG-INFO-04" or a chapter-level "WSTG-CONF". */
  code: string;
  /** The WSTG test case's title, e.g. "Attack Surface Identification". */
  title?: string;
}

/**
 * Links a page back to its OWASP WSTG (Web Security Testing Guide) test
 * case for traceability. Colored by chapter prefix (INFO/CONF/IDNT/...) so
 * related pages are visually grouped when scanning.
 */
export function WstgBadge({ code, title }: WstgBadgeProps) {
  const chapter = code.replace("WSTG-", "").split("-")[0];
  const colorClasses = CHAPTER_COLORS[chapter] ?? DEFAULT_COLOR;
  const path = CODE_PATHS[code];
  const href = path ? `${WSTG_BASE}${path}/` : "https://wstg.owasp.org/latest/";

  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer noopener"
      className={`not-prose mb-4 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-mono text-xs font-semibold ring-1 ring-inset transition-opacity hover:opacity-80 ${colorClasses}`}
    >
      {code}
      {title && (
        <span className="font-sans font-normal opacity-80">· {title}</span>
      )}
    </a>
  );
}
