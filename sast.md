# Static Analysis of Git Repositories — A Step-by-Step Methodology

A host-agnostic workflow for security-reviewing source code from **any git server**, including GitHub, GitLab, Bitbucket, Azure DevOps, Gitea or a self-hosted server. It combines secret scanning over the **full git history**, SAST, dependency (SCA) scanning, IaC/misconfiguration scanning and manual git-history forensics.

> **Authorization first.** Only assess repositories you are explicitly authorized to test. The scans are read-only, but the clones, the git history and the reports can contain the owner's intellectual property and **live credentials**. Treat the whole working folder as sensitive (see §10).

The starting point is an **already-cloned** repository (with its `.git/` folder). Run the guide once per repo; the clones can live anywhere. **Why work from clones instead of ZIP downloads?** A ZIP or tarball export contains only the current tree of one branch. A git clone also gives you:
- **History-aware secret scanning**, which finds credentials that were committed and later "deleted".
- **Every branch and tag**, not just the default branch. Feature and hotfix branches often hold unreviewed code and test credentials.
- **Reproducible evidence.** Every finding can cite a commit hash, author and date.
- **Diff-aware SAST**, which lets you focus on recently changed code.

---

## Contents

1. [Required tools: install and verify](#1-required-tools-install-and-verify)
2. [Start: go to the repository](#2-start-go-to-the-repository)
3. [Record scope and fingerprint the stack](#3-record-scope-and-fingerprint-the-stack)
4. [Secret scanning (full history)](#4-secret-scanning-full-history-all-refs)
5. [SAST (Semgrep plus language-specific tools)](#5-sast-source-code-flaws)
6. [Dependency and supply-chain scanning (SCA)](#6-dependency-and-supply-chain-scanning-sca)
7. [IaC, container and CI/CD misconfiguration](#7-iac-container-and-cicd-misconfiguration)
8. [Git-history forensics](#8-git-history-forensics)
9. [Consolidate and triage](#9-consolidate-and-triage)
10. [Handling and cleanup](#10-handling-and-cleanup)
11. [One-shot script](#11-one-shot-script)

---

## 1. Required tools: install and verify

### 1a. Tool list

| Tool | Purpose | Required? | Install docs | Quick install |
|------|---------|-----------|--------------|---------------|
| **git** | Branch and history inspection, forensics | ✅ Required | <https://git-scm.com/downloads> | `apt install git` / `brew install git` |
| **jq** | Parsing JSON and SARIF output | ✅ Required | <https://jqlang.org/download/> | `apt install jq` / `brew install jq` |
| **TruffleHog** | Secret scanning over git history, with **live verification** | ✅ Required | <https://github.com/trufflesecurity/trufflehog#floppy_disk-installation> | `brew install trufflehog` or<br>`curl -sSfL https://raw.githubusercontent.com/trufflesecurity/trufflehog/main/scripts/install.sh \| sh -s -- -b /usr/local/bin` |
| **Gitleaks** (≥ 8.19) | Second secret-scanning engine | ✅ Required | <https://github.com/gitleaks/gitleaks#installing> | `brew install gitleaks` or a binary from [Releases](https://github.com/gitleaks/gitleaks/releases) |
| **Semgrep** | Multi-language SAST | ✅ Required | <https://semgrep.dev/docs/getting-started/quickstart> | `pipx install semgrep` / `brew install semgrep` |
| **Trivy** | SCA (dependency CVEs) plus IaC/config scanning | ✅ Required | <https://trivy.dev/latest/getting-started/installation/> | `brew install trivy` or<br>`curl -sfL https://raw.githubusercontent.com/aquasecurity/trivy/main/scripts/install.sh \| sh -s -- -b /usr/local/bin` |
| **OSV-Scanner** | Second SCA engine (OSV database) | ⭐ Recommended | <https://google.github.io/osv-scanner/installation/> | `brew install osv-scanner` or<br>`go install github.com/google/osv-scanner/v2/cmd/osv-scanner@latest` |
| **Checkov** | Deep IaC policy scanning (Terraform, K8s, CloudFormation, Helm, Dockerfile, CI configs) | ⭐ Recommended | <https://www.checkov.io/2.Basics/Installing%20Checkov.html> | `pipx install checkov` |
| **Kubescape** | Kubernetes manifest posture (NSA/MITRE frameworks) | ➖ If K8s manifests exist | <https://kubescape.io/docs/install-cli/> | `curl -s https://raw.githubusercontent.com/kubescape/kubescape/master/install.sh \| /bin/bash` |
| **Bandit** | Python-specific SAST | ➖ If Python exists | <https://bandit.readthedocs.io/en/latest/start.html> | `pipx install bandit` |
| **gosec** | Go-specific SAST | ➖ If Go exists | <https://github.com/securego/gosec#install> | `go install github.com/securego/gosec/v2/cmd/gosec@latest` |
| **sarif-tools** | Merging and summarizing SARIF reports | ⭐ Recommended | <https://github.com/microsoft/sarif-tools> | `pipx install sarif-tools` |
| **pipx** | Isolated installs of the Python-based tools above | Helper | <https://pipx.pypa.io/stable/installation/> | `apt install pipx` / `brew install pipx` |

> Piping a remote install script into a shell (`curl | sh`) runs code you haven't read. On an assessment box, prefer a package manager or a release binary whose checksum you have verified.

### 1b. Check that everything is installed

Save as `check-tools.sh` and run `bash check-tools.sh`. It exits non-zero if a **required** tool is missing.

```bash
#!/usr/bin/env bash
# name | version command | required(1)/optional(0)
TOOLS=(
  "git|git --version|1"
  "jq|jq --version|1"
  "trufflehog|trufflehog --version|1"
  "gitleaks|gitleaks version|1"
  "semgrep|semgrep --version|1"
  "trivy|trivy --version|1"
  "osv-scanner|osv-scanner --version|0"
  "checkov|checkov --version|0"
  "kubescape|kubescape version|0"
  "bandit|bandit --version|0"
  "gosec|gosec -version|0"
  "sarif|sarif --version|0"
)

missing_required=0
printf "%-12s %-9s %s\n" TOOL STATUS VERSION
for entry in "${TOOLS[@]}"; do
  IFS='|' read -r name vcmd req <<<"$entry"
  if command -v "$name" >/dev/null 2>&1; then
    printf "%-12s \e[32m%-9s\e[0m %s\n" "$name" OK "$($vcmd 2>&1 | grep -m1 -Eo '[0-9]+\.[0-9]+(\.[0-9]+)?' || echo '?')"
  elif [ "$req" = 1 ]; then
    printf "%-12s \e[31m%-9s\e[0m %s\n" "$name" MISSING "(required)"; missing_required=1
  else
    printf "%-12s \e[33m%-9s\e[0m %s\n" "$name" MISSING "(optional)"
  fi
done

# gitleaks needs the `git` subcommand (v8.19+)
if command -v gitleaks >/dev/null && ! gitleaks git --help >/dev/null 2>&1; then
  echo "WARN: gitleaks is too old for 'gitleaks git' — upgrade to >= 8.19"
fi

[ "$missing_required" = 0 ] && echo "All required tools present." || { echo "Install the missing required tools (see table above)."; exit 1; }
```


---

## 2. Start: go to the repository

Every step in this guide runs **from inside one repository**. The clones can live anywhere, in any folder structure. Go to the repo you want to analyze:

```bash
cd /path/to/<repo>
```

Then set these variables. All later commands use them:

```bash
REPO=$(git rev-parse --show-toplevel)             # repo root, even if you cd'ed into a sub-folder
NAME=$(basename "$REPO")
OUT="$(dirname "$REPO")/sast-output/$NAME"        # one level up: ../sast-output/<repo>
mkdir -p "$OUT"
cd "$REPO"
```

> Reports are written **one directory above the repo**, in `../sast-output/<repo>/`, so they are outside the repository. That way the scanners don't scan their own output, and nothing is added to the working tree. `OUT` is built from `$REPO` rather than a literal `../`, so it points to the same place even if you set the variables from a sub-folder of the repo.

```
parent-folder/
├── <repo>/                 # you are here
└── sast-output/
    └── <repo>/             # $OUT — all reports for this repo
```

To analyze another repo, `cd` into it and set the variables again. Its reports go to `sast-output/<name>/` next to that repo. Repos cloned side by side in the same folder therefore share one `sast-output/` folder.

### Pre-flight check on the clone

The history-based steps are only as complete as the clone:

```bash
echo "shallow:          $(git rev-parse --is-shallow-repository)"
echo "remote branches:  $(git for-each-ref refs/remotes --format='%(refname)' | grep -vc '/HEAD$')"
echo "tags:             $(git for-each-ref refs/tags | wc -l)"
echo "push URL:         $(git remote get-url --push origin 2>/dev/null)"
```

- **`shallow: true`** means history is missing, and the secret and forensics scans will miss old commits. Fix it with `git fetch --unshallow`.
- **Few or zero remote branches** can mean it's a single-branch clone (`--single-branch`). Fetch everything with:
  `git config remote.origin.fetch '+refs/heads/*:refs/remotes/origin/*' && git fetch --all --tags`
- **Disable pushing** as a safety guard: `git remote set-url --push origin no_push`.
- **PR/MR refs (optional).** They aren't fetched by default and mostly contain code from external forks. Fetch them only if they're in scope:
  `git fetch origin '+refs/pull/*/head:refs/remotes/pr/*'` (GitHub) or `git fetch origin '+refs/merge-requests/*/head:refs/remotes/mr/*'` (GitLab).

A full clone already holds **every branch** (as `origin/*`), every tag and the full history. All history steps below use `--all`, so every branch is covered even though only one branch is checked out on disk.

---

## 3. Record scope and fingerprint the stack

### 3a. Exactly what was assessed (commit hashes = reproducible scope)

```bash
{ date -Iseconds
  echo "repo:      $NAME"
  echo "remote:    $(git remote get-url origin 2>/dev/null)"
  echo "HEAD:      $(git rev-parse HEAD 2>/dev/null || echo EMPTY)  ($(git symbolic-ref --short HEAD 2>/dev/null))"
  echo "branches:  $(git for-each-ref refs/remotes/origin --format='%(refname)' | grep -vc '/HEAD$')"
  echo "tags:      $(git for-each-ref refs/tags | wc -l)"
  echo "commits:   $(git rev-list --all --count 2>/dev/null || echo 0)"
  echo "first:     $(git log --all --reverse --format=%as 2>/dev/null | head -1)"
  echo "last:      $(git log --all -1 --format=%as 2>/dev/null)"
} | tee "$OUT/ASSESSED-SNAPSHOT.txt"
```

> `git remote get-url origin` can contain an embedded token if the repo was cloned over HTTPS with credentials in the URL. Check the snapshot before sharing it.

Branch inventory. Stale or forgotten branches are worth a look:
```bash
git for-each-ref --sort=-committerdate refs/remotes/origin \
  --format='%(committerdate:short)  %(refname:lstrip=3)  %(authorname)' | grep -v '  HEAD  ' \
  | tee "$OUT/BRANCHES.txt"
```

### 3b. Stack fingerprint (decides which scanners to run)

```bash
{ echo "-- top extensions:"; git ls-files | sed -n 's/.*\.//p' | sort | uniq -c | sort -rn | head -8
  echo "-- manifests / lockfiles:"
  git ls-files | grep -E '(^|/)(package(-lock)?\.json|yarn\.lock|pnpm-lock\.yaml|requirements.*\.txt|Pipfile(\.lock)?|poetry\.lock|pyproject\.toml|go\.(mod|sum)|pom\.xml|build\.gradle(\.kts)?|gradle\.lockfile|Gemfile(\.lock)?|composer\.(json|lock)|Cargo\.(toml|lock)|.*\.csproj|packages\.lock\.json)$'
  echo "-- IaC / containers / CI:"
  git ls-files | grep -E '(\.tf$|\.tfvars$|Dockerfile|docker-compose.*\.ya?ml$|Chart\.yaml$|kustomization\.ya?ml$|template\.ya?ml$|serverless\.ya?ml$|\.github/workflows/|\.gitlab-ci\.yml$|bitbucket-pipelines\.yml$|azure-pipelines\.yml$|Jenkinsfile|\.circleci/)' | head -20
} | tee "$OUT/FINGERPRINT.txt"
```

> `git ls-files` lists only tracked files, so ignored content such as `node_modules/`, `vendor/`, `venv/` and build output is excluded automatically. Still pass skip flags to the scanners, in case dependencies were installed inside the repo.

---

## 4. Secret scanning: full history, all refs

### 4a. TruffleHog: git mode with verification

```bash
trufflehog git "file://$REPO" \
  --results=verified,unknown \
  --json > "$OUT/trufflehog.json" 2>/dev/null
```

- Scans every commit reachable from any ref in the clone, which includes every `origin/*` branch. You can narrow it with `--branch <ref>` or `--since-commit <sha>`.
- `--results=verified,unknown` reports both live-verified secrets and plausible ones that couldn't be verified. For live secrets only, use `--only-verified`.
- **Verification sends each candidate credential to its provider's API.** Confirm that your rules of engagement allow this. If they don't, add `--no-verification`.

Tally, with git metadata:
```bash
jq -r 'select(.DetectorName) | [.DetectorName, "verified="+(.Verified|tostring),
       .SourceMetadata.Data.Git.commit[0:10], .SourceMetadata.Data.Git.file,
       .SourceMetadata.Data.Git.email, .SourceMetadata.Data.Git.timestamp] | @tsv' \
  "$OUT/trufflehog.json" | sort -u
```

### 4b. Gitleaks: second engine, git mode

```bash
gitleaks git "$REPO" \
  --log-opts="--all" \
  --report-format sarif --report-path "$OUT/gitleaks.sarif" \
  --redact || true          # gitleaks exits non-zero when it finds leaks
```

> `--log-opts="--all"` makes Gitleaks walk every ref, not only `HEAD`. On versions older than 8.19, the equivalent command is `gitleaks detect --source "$REPO" --log-opts="--all"`.

### 4c. Is a secret still in HEAD, or only in history? Where did it come from?

The answer changes the remediation: *rotate and remove it from the code*, or *rotate and purge the history*. Each finding in the §4a/§4b reports includes the **commit** that introduced the secret and the **file** it's in. You don't need to look these up by hand.

**Step 1: list all findings from both scanners, numbered.**

```bash
{ jq -r 'select(.DetectorName) | ["trufflehog", .DetectorName,
         .SourceMetadata.Data.Git.commit, .SourceMetadata.Data.Git.file,
         (.SourceMetadata.Data.Git.line|tostring)] | @tsv' "$OUT/trufflehog.json" 2>/dev/null
  jq -r '.runs[].results[] | ["gitleaks", .ruleId,
         .partialFingerprints.commitSha, .locations[0].physicalLocation.artifactLocation.uri,
         (.locations[0].physicalLocation.region.startLine|tostring)] | @tsv' "$OUT/gitleaks.sarif" 2>/dev/null
} | sort -t$'\t' -k3,5 -u > "$OUT/secrets.tsv"

column -t -s$'\t' -N '#,TOOL,RULE,COMMIT,FILE,LINE' <(nl -w1 -s$'\t' "$OUT/secrets.tsv")
```

Example output:
```
#  TOOL        RULE              COMMIT                                    FILE                     LINE
1  trufflehog  Github            65c0249d167fefa589272260748cbaaaf2c01da3  config/.env.production   1
2  gitleaks    aws-access-token  a41be07c9d2e8f1a0b3c5d7e9f2a4b6c8d0e1f3a  deploy/terraform.tfvars  12
```

The same secret is usually found by both scanners. `sort -k3,5 -u` keeps one row per commit + file + line, so it appears once, while different secrets in the same file stay separate.

**Step 2: pick a finding by its number.** This sets `commit` and `file` for you:

```bash
n=1                                             # the row number from the table above
IFS=$'\t' read -r _ _ commit file _ < <(sed -n "${n}p" "$OUT/secrets.tsv")
echo "commit=$commit  file=$file"
```

**Step 3: investigate it.**

```bash
[ -n "$commit" ] && [ -n "$file" ] || echo "commit/file not set — redo step 2"

# still in the checked-out branch, or only in history?
git cat-file -e "HEAD:$file" 2>/dev/null && echo "still in HEAD" || echo "only in history"

# full lifecycle of the file (added / modified / deleted, by whom)
git log --all --format='%h %as %ae %s' -- "$file"

# which branches / tags contain the commit that introduced the secret
git for-each-ref --contains "$commit" --format='%(refname:short)'

# the exact change that introduced it (prints the secret in clear text)
git show "$commit" -- "$file"
```

> `git show` prints the secret **unredacted**. Don't paste that output into tickets or reports; use the redacted scanner output as evidence instead.

**Or check every finding at once:**
```bash
while IFS=$'\t' read -r tool rule commit file line; do
  state=$(git cat-file -e "HEAD:$file" 2>/dev/null && echo "IN-HEAD" || echo "HISTORY")
  refs=$(git for-each-ref --contains "$commit" --format='%(refname:short)' | paste -sd, -)
  printf "%-8s %-12s %.10s  %-45s %s\n" "$state" "$rule" "$commit" "$file:$line" "$refs"
done < "$OUT/secrets.tsv" | tee "$OUT/secrets-location.txt"
```

If you fetched PR/MR refs (§2) and those are the only refs carrying the commit, the secret may belong to an external contributor's fork. Attribute it accordingly.

---

## 5. SAST: source-code flaws

### 5a. Semgrep on the checked-out branch

Always use the language-agnostic rule packs, plus the language packs that match the repo's stack:

| Stack detected | Semgrep language packs | Extra tool |
|----------------|------------------------|------------|
| JavaScript / Node / Vue | `p/javascript p/nodejs` (+ `p/react`, `p/nextjs` if relevant) | — |
| TypeScript | `p/typescript` | — |
| Python | `p/python` (+ `p/django` / `p/flask`) | `bandit -r` |
| Go | `p/golang` | `gosec ./...` |
| Java / Kotlin | `p/java` (+ `p/kotlin`) | — |
| PHP | `p/php` | — |
| Ruby | `p/ruby` | — |
| C# | `p/csharp` | — |
| Kubernetes YAML | `p/kubernetes` | see §7 |

This snippet picks the language packs automatically from the files tracked in the repo. It saves them in `SEMGREP_LANG`, which §5b and §5c reuse:

```bash
SEMGREP_LANG=()
files=$(git ls-files)
grep -qE '\.(js|jsx|mjs|cjs|vue)$' <<<"$files" && SEMGREP_LANG+=(--config p/javascript --config p/nodejs)
grep -qE '\.tsx?$'                 <<<"$files" && SEMGREP_LANG+=(--config p/typescript)
grep -qE '\.py$'                   <<<"$files" && SEMGREP_LANG+=(--config p/python)
grep -qE '\.go$'                   <<<"$files" && SEMGREP_LANG+=(--config p/golang)
grep -qE '\.(java|kt)$'            <<<"$files" && SEMGREP_LANG+=(--config p/java)
grep -qE '\.php$'                  <<<"$files" && SEMGREP_LANG+=(--config p/php)
grep -qE '\.rb$'                   <<<"$files" && SEMGREP_LANG+=(--config p/ruby)
grep -qE '\.cs$'                   <<<"$files" && SEMGREP_LANG+=(--config p/csharp)
grep -qE '\.ya?ml$'                <<<"$files" && SEMGREP_LANG+=(--config p/kubernetes)
echo "language packs: ${SEMGREP_LANG[*]:-none}"
```

Then run the scan:
```bash
semgrep scan "$REPO" \
  --config p/security-audit --config p/secrets --config p/owasp-top-ten \
  "${SEMGREP_LANG[@]}" \
  --sarif --output "$OUT/semgrep.sarif" \
  --metrics off

jq '[.runs[].results[]] | length' "$OUT/semgrep.sarif"     # number of findings
```

> **Why not `--config auto`?** Semgrep refuses to combine `--config auto` with `--metrics off` ("Cannot create auto config when metrics are off"), because auto mode sends project metadata to the registry. Picking the language packs explicitly, as above, works with metrics off. The `p/...` packs are still downloaded from the Semgrep registry, so the scan needs internet access. For offline or air-gapped runs, use local rule files: `--config /path/to/rules/`.
>
> Semgrep exits with code 0 even when it has findings. To make it fail a CI job on findings, add `--error`. It's a plain flag and takes no value.

Language-specific extras:
```bash
git ls-files | grep -q '\.py$'    && bandit -r "$REPO" -f sarif -o "$OUT/bandit.sarif" -q
git ls-files | grep -q 'go\.mod$' && gosec -fmt sarif -out "$OUT/gosec.sarif" ./...
```

### 5b. Other branches (optional, often high-yield)

Use `git worktree` to check out another branch in a separate folder, next to the repo, without touching your current checkout:
```bash
b=<branch>; safe=${b//\//_}; WT="$REPO-wt-$safe"
git worktree add "$WT" "origin/$b"
semgrep scan "$WT" --config p/security-audit --config p/owasp-top-ten "${SEMGREP_LANG[@]}" \
  --sarif --output "$OUT/semgrep-$safe.sarif" --metrics off
git worktree remove "$WT"          # cleanup
```

### 5c. Diff-aware scan: only what changed since a point in time

```bash
base=$(git rev-list -1 --before="6 months ago" HEAD)
semgrep scan "$REPO" --baseline-commit "$base" \
  --config p/security-audit --config p/owasp-top-ten "${SEMGREP_LANG[@]}" \
  --sarif --output "$OUT/semgrep-recent.sarif" --metrics off
```

---

## 6. Dependency and supply-chain scanning (SCA)

Trivy reads most ecosystems' lockfiles: npm, yarn, pnpm, pip, Poetry, Pipenv, Go, Maven, Gradle, Bundler, Composer, Cargo and NuGet.

```bash
trivy fs "$REPO" --scanners vuln \
  --skip-dirs node_modules --skip-dirs vendor --skip-dirs .venv \
  --format sarif --output "$OUT/trivy-deps.sarif"

# readable, high/critical only
trivy fs "$REPO" --scanners vuln --severity HIGH,CRITICAL \
  --skip-dirs node_modules --skip-dirs vendor --format table
```

Second opinion (OSV database):
The command differs between OSV-Scanner versions: v2 uses `scan source`, and v1 uses plain `scan`. On v1, `source` is read as a folder name, and the scan fails with `Scanning dir source ... lstat source: no such file or directory`. This snippet picks the right form for the installed version:

```bash
if osv-scanner --version 2>&1 | grep -qE 'version: 1\.'; then
  OSV=(osv-scanner scan)            # v1.x
else
  OSV=(osv-scanner scan source)     # v2.x
fi
echo "using: ${OSV[*]}"

"${OSV[@]}" --recursive --format json "$REPO" > "$OUT/osv.json"
echo "exit=$?"    # 0 = no vulns, 1 = vulns found, 128 = no lockfiles/manifests found

# readable summary
"${OSV[@]}" --recursive --format table "$REPO"

jq '[.results[]?.packages[].vulnerabilities[]] | length' "$OUT/osv.json" 2>/dev/null   # number of vulnerabilities
```

> **Put every option before the path.** OSV-Scanner stops reading options at the first path, so anything after `"$REPO"` is treated as another folder to scan. For example, `... "$REPO" --format json` fails with `stat --format: no such file or directory`.
>
> - **Exit codes:** `1` just means vulnerabilities were found. `128` means OSV-Scanner found nothing to scan, which is expected in repos without lockfiles (IaC-only or GitOps repos, for example). In that case `osv.json` stays empty, and there's nothing to review.

**Supply-chain checks that scanners don't flag:**
- **Typosquats and look-alike names.** Read the direct dependency list by eye, looking for names like `lodahs` instead of `lodash` or `reqeusts` instead of `requests`. Confirm whether the package is installed or imported, then find **who added it and when**:
  ```bash
  git log --all -S '<suspicious-pkg>' --format='%h %as %an <%ae> %s'
  ```
- **Dependency confusion.** Look for internal-looking package names without a scope or private registry, and check whether the same name exists on the public registry.
- **Git or URL dependencies, unpinned versions, `postinstall` scripts** and committed `.npmrc` / `pip.conf` / `settings.xml` files that point at registries with tokens in them.

> Prioritize CVEs that have a **fixed version** *and* a reachable call path. Note whether each dependency is direct or transitive.

---

## 7. IaC, container and CI/CD misconfiguration

```bash
trivy config "$REPO" --format sarif --output "$OUT/trivy-config.sarif"
trivy config "$REPO" --severity HIGH,CRITICAL --format table
```

Checkov covers Terraform, CloudFormation/SAM, Kubernetes, Helm, Kustomize, Dockerfile, Serverless, ARM/Bicep and GitHub/GitLab/Bitbucket CI configs:
```bash
checkov -d "$REPO" --quiet -o sarif --output-file-path "$OUT" || true
```

Kubescape, only if the repo contains Kubernetes manifests:
```bash
git grep -qlE '^kind:\s*(Deployment|StatefulSet|DaemonSet|Pod|CronJob|Secret|Role|ClusterRole)' -- '*.yaml' '*.yml' \
  && kubescape scan "$REPO" --format sarif --output "$OUT/kubescape.sarif"
```

**Manual review. Scanners miss these:**
- **CI/CD pipelines** (`.github/workflows/*`, `.gitlab-ci.yml`, `bitbucket-pipelines.yml`, `azure-pipelines.yml`, `Jenkinsfile`, `.circleci/`):
  - Secrets echoed to logs, and `curl | bash`.
  - Over-broad deploy credentials, and security steps that have been disabled.
  - GitHub Actions: `pull_request_target` combined with a checkout of PR code, untrusted `${{ github.event.* }}` interpolated into `run:`, and third-party actions not pinned to a SHA.
  - Self-hosted runners exposed to public PRs.
  - Review the pipeline's history too: `git log -p --all -- <ci-file>`.
- **Kubernetes / GitOps:** plaintext `Secret` objects, webhook URLs, `:latest` image tags, root or privileged containers, `hostPath` mounts. Check whether SOPS or sealed-secrets were introduced **after** plaintext secrets had already been committed.
- **Cloud templates** (Terraform, CloudFormation/SAM, Serverless): wildcard IAM actions or resources, secrets in environment variables, public buckets and endpoints, and helper scripts that assume roles.

---

## 8. Git-history forensics

Everything here is read-only, and `--all` covers every branch.

```bash
{ echo "--- sensitive filenames ever committed (even if deleted since)"
  git log --all --format= --name-only | sort -u | \
    grep -iE '(\.env($|\.)|\.pem$|\.key$|\.p12$|\.pfx$|\.jks$|id_rsa|id_ed25519|credentials|secret|kubeconfig|\.kube/config|\.npmrc$|\.pypirc$|\.netrc$|\.aws/|service.?account.*\.json|firebase.*\.json|\.tfstate|\.sqlite$|\.sql$|\.bak$|dump)'

  echo "--- deleted files (often the 'oops' commits)"
  git log --all --diff-filter=D --format='>> %h %as %ae %s' --name-only | head -60

  echo "--- commit messages hinting at removed secrets"
  git log --all -i -E --grep='secret|password|passwd|token|api.?key|credential|remove.*key|oops|leak|rotate' \
    --format='%h %as %ae %s'
} | tee "$OUT/HISTORY-FORENSICS.txt"
```

Pickaxe searches across all history. `-S` finds commits that add or remove a string; `-G` matches a regex against the diff:
```bash
git log --all -p -G 'AKIA[0-9A-Z]{16}'                  | head -80   # AWS access keys
git log --all -p -G '-----BEGIN [A-Z ]*PRIVATE KEY-----' | head -80   # private keys
git log --all -p -G '(mongodb(\+srv)?|postgres(ql)?|mysql|redis|amqp)://[^ ]+:[^ ]+@' | head -80  # DSNs with creds
git log --all -p -S 'hooks.slack.com'                    | head -80   # Slack webhooks
```

Recover a deleted file's content as evidence:
```bash
git show <commit>^:path/to/deleted.file
```

Large blobs that may be dumps, backups or binaries (sizes in bytes):
```bash
git rev-list --all --objects | git cat-file --batch-check='%(objecttype) %(objectsize) %(rest)' \
  | awk '$1=="blob" && $2>1000000' | sort -k2 -rn | head -20
```

Contributor inventory, which can reveal personal emails and internal hostnames. Record them without overreaching:
```bash
git shortlog -sne --all > "$OUT/AUTHORS.txt"
```

---

## 9. Consolidate and triage

Finding counts for this repo. Run it on `"$(dirname "$OUT")"` instead of `"$OUT"` to cover every repo in the same `sast-output/` folder:
```bash
find "$OUT" -name '*.sarif' | sort | while read -r f; do
  printf "%-60s %s\n" "${f#$OUT/}" "$(jq '[.runs[].results[]]|length' "$f" 2>/dev/null)"
done
```

Triage order, highest signal first:
1. **Verified live secrets** (TruffleHog `verified=true`), whether in HEAD **or** in history. Rotate immediately; these are P1. A secret that exists "only in history" is still exposed to everyone with read access to the repo.
2. **Supply-chain red flags:** typosquats, dependency confusion, malicious install scripts.
3. **SAST criticals with dataflow:** injection, `eval` or deserialization of user input, SSRF, path traversal, auth bypass, weak crypto on reachable input.
4. **Critical and high CVEs** in **direct** dependencies that are actually imported.
5. **IaC and CI/CD criticals:** privileged or root containers, secrets in manifests (current or historical), wildcard IAM, public exposure, pipeline injection.
6. **Best-practice noise.** Batch it rather than inflating the report.

Every finding should cite `<repo>@<commit-sha>:<path>:<line>` so it can be reproduced.

Merge the reports for review:
```bash
sarif summary "$OUT"
sarif copy "$OUT" --output "$OUT/combined.sarif"
```
You can also open individual `.sarif` files in the VS Code **SARIF Viewer** extension. Open the repo folder as the workspace root so the paths resolve.

---

## 10. Handling and cleanup

- **The repo's `.git/` folder holds the entire history**, including every secret ever committed. That makes it more sensitive than the checked-out files alone. Keep the clones and the `sast-output/` folders on encrypted storage, don't sync them to shared drives, and securely delete them when the engagement closes.
- **Never push.** §2 shows how to set the push URL to `no_push`. Verify with `git remote -v`.
- **Remove credentials before archiving.** `git config --get-regexp 'remote\..*\.url|credential'` should show no tokens.
- **Report secrets as rotate-first.** For secrets that exist only in history, recommend a history rewrite (`git filter-repo` / BFG) **in addition to** rotation. A rewrite alone isn't enough, because forks, existing clones, CI caches and the hosting platform can still hold the old objects.
- **State the scope** in the report: the refs and commit hashes from each repo's `ASSESSED-SNAPSHOT.txt`. Out of scope unless provided separately:
  - Platform-side CI/CD variables and secrets
  - Branch protection and repository settings
  - PR/MR discussions and wikis
  - Refs created after the clone date

---

## 11. One-shot script

Save as `scan-repo.sh`, then either run it from inside a repo or pass the repo path:

```bash
cd /path/to/<repo> && bash /path/to/scan-repo.sh
# or
bash scan-repo.sh /path/to/<repo>

# several repos, wherever they are
for r in /path/one/repo-a /other/path/repo-b; do bash scan-repo.sh "$r"; done
```

It checks the tools, then runs every automated scan on that one repository. Reports go to `../sast-output/<repo>/`, one level above the repo. It doesn't fetch, modify or push anything.

```bash
#!/usr/bin/env bash
set -uo pipefail

# --- target repo -----------------------------------------------------------
cd "${1:-.}" || exit 1
REPO=$(git rev-parse --show-toplevel 2>/dev/null) || { echo "Not a git repository: ${1:-$PWD}"; exit 1; }
cd "$REPO"
NAME=$(basename "$REPO")
OUT="$(dirname "$REPO")/sast-output/$NAME"      # ../sast-output/<repo>, outside the repo
mkdir -p "$OUT"

# --- tool check ------------------------------------------------------------
for t in git jq trufflehog gitleaks semgrep trivy; do
  command -v "$t" >/dev/null || { echo "Missing required tool: $t (see §1)"; exit 1; }
done
has() { command -v "$1" >/dev/null 2>&1; }

echo "==================== $NAME  →  $OUT ===================="
[ "$(git rev-parse --is-shallow-repository)" = true ] && \
  echo "WARN: shallow clone — history scans will be incomplete (git fetch --unshallow)"

# --- scope snapshot --------------------------------------------------------
{ date -Iseconds
  echo "repo: $NAME"
  echo "HEAD: $(git rev-parse HEAD 2>/dev/null || echo EMPTY)"
  echo "refs: $(git for-each-ref | wc -l)  commits: $(git rev-list --all --count 2>/dev/null || echo 0)"
} > "$OUT/ASSESSED-SNAPSHOT.txt"

# --- secrets: full history, every branch -----------------------------------
echo "[*] trufflehog";  trufflehog git "file://$REPO" --results=verified,unknown --json \
  > "$OUT/trufflehog.json" 2>/dev/null
echo "[*] gitleaks";    gitleaks git "$REPO" --log-opts="--all" --report-format sarif \
  --report-path "$OUT/gitleaks.sarif" --redact >/dev/null 2>&1 || true

# --- history forensics: sensitive filenames ever committed -----------------
git log --all --format= --name-only 2>/dev/null | sort -u | \
  grep -iE '(\.env($|\.)|\.pem$|\.key$|\.p12$|\.pfx$|id_rsa|credentials|kubeconfig|\.npmrc$|\.pypirc$|service.?account.*\.json|\.tfstate|\.sql$|\.bak$)' \
  > "$OUT/history-sensitive-files.txt" || true

# nothing checked out → nothing more to scan
git rev-parse -q --verify HEAD >/dev/null || { echo "Empty HEAD: history-only scan done."; exit 0; }

# --- SAST ------------------------------------------------------------------
SEMGREP_LANG=()
files=$(git ls-files)
grep -qE '\.(js|jsx|mjs|cjs|vue)$' <<<"$files" && SEMGREP_LANG+=(--config p/javascript --config p/nodejs)
grep -qE '\.tsx?$'                 <<<"$files" && SEMGREP_LANG+=(--config p/typescript)
grep -qE '\.py$'                   <<<"$files" && SEMGREP_LANG+=(--config p/python)
grep -qE '\.go$'                   <<<"$files" && SEMGREP_LANG+=(--config p/golang)
grep -qE '\.(java|kt)$'            <<<"$files" && SEMGREP_LANG+=(--config p/java)
grep -qE '\.php$'                  <<<"$files" && SEMGREP_LANG+=(--config p/php)
grep -qE '\.rb$'                   <<<"$files" && SEMGREP_LANG+=(--config p/ruby)
grep -qE '\.cs$'                   <<<"$files" && SEMGREP_LANG+=(--config p/csharp)
grep -qE '\.ya?ml$'                <<<"$files" && SEMGREP_LANG+=(--config p/kubernetes)
echo "[*] semgrep (${SEMGREP_LANG[*]:-no language packs})"
semgrep scan "$REPO" --config p/security-audit --config p/secrets --config p/owasp-top-ten \
  "${SEMGREP_LANG[@]}" \
  --sarif --output "$OUT/semgrep.sarif" --metrics off --quiet
if has bandit && git ls-files | grep -q '\.py$'; then
  echo "[*] bandit"; bandit -r "$REPO" -f sarif -o "$OUT/bandit.sarif" -q || true; fi
if has gosec && git ls-files | grep -q 'go\.mod$'; then
  echo "[*] gosec";  gosec -quiet -fmt sarif -out "$OUT/gosec.sarif" ./... || true; fi

# --- SCA -------------------------------------------------------------------
echo "[*] trivy fs"; trivy fs "$REPO" --scanners vuln --skip-dirs node_modules --skip-dirs vendor --skip-dirs .venv \
  --format sarif --output "$OUT/trivy-deps.sarif" 2>/dev/null || true
if has osv-scanner; then
  if osv-scanner --version 2>&1 | grep -qE 'version: 1\.'; then OSV=(osv-scanner scan); else OSV=(osv-scanner scan source); fi
  echo "[*] osv-scanner (${OSV[*]})"
  "${OSV[@]}" --recursive --format json "$REPO" > "$OUT/osv.json" 2>/dev/null || true
fi

# --- IaC / config / container / CI ----------------------------------------
echo "[*] trivy config"; trivy config "$REPO" --format sarif --output "$OUT/trivy-config.sarif" 2>/dev/null || true
has checkov && { echo "[*] checkov"; checkov -d "$REPO" --quiet -o sarif --output-file-path "$OUT" >/dev/null 2>&1 || true; }

# --- summary ---------------------------------------------------------------
echo; echo "=== SARIF counts ==="
find "$OUT" -name '*.sarif' | sort | while read -r f; do
  printf "%-40s %s\n" "${f#$OUT/}" "$(jq '[.runs[].results[]]|length' "$f" 2>/dev/null)"
done
echo "TruffleHog hits: $(jq -s 'map(select(.DetectorName))|length' "$OUT/trufflehog.json" 2>/dev/null)"
echo "Done. Reports in $OUT — now do the manual review (§6 supply-chain, §7 CI/CD, §8 forensics) and triage (§9)."
```
