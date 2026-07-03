# Pre-PR Agent Self-Check (2-Factor Verification)

> **Purpose:** This prompt acts as a strict 2-factor verification step. Before opening any Pull Request, you (the agent or developer) MUST run through this exact self-check to prevent recurring errors that have historically failed reviews. Do this *before* requesting Peter's review.

## 1. Git & PR Metadata
- [ ] **Commit Explains the "Why":** Did you write a commit body explaining the *why*, or did you just list the *what*? The diff already shows what changed. Your commit body MUST explain the reasoning behind the change.
- [ ] **Linear Issue Linked:** Does your PR description properly link the active Linear issue (e.g., `Closes ICE-XXX`)? Do NOT use `Closes: N/A` if a task exists.
- [ ] **Clean Branch History:** Does your branch contain ONLY the commits relevant to your specific task? Do NOT bundle multiple Linear tasks into one PR. Ensure your diff does NOT contain unrelated commits from other feature branches. Rebase cleanly onto `dev` if necessary.

## 2. File Naming & Structure
- [ ] **Strict Kebab-Case:** Are all newly created filenames strictly kebab-case (e.g., `layout.tsx`, `sidebar.tsx`, `api-key-display.tsx`)? This rule applies to ALL files, including frontend React components. PascalCase (e.g., `Layout.tsx`) is forbidden.
- [ ] **Mounted Routes:** If you added new endpoints or routes, are they properly instantiated and mounted in the main application (e.g., `server.ts`) so they are actually reachable?

## 3. Error Handling & Environment
- [ ] **No Raw Errors:** Are all errors thrown using `AppError(code, message)`? NEVER use a raw `throw new Error(...)` anywhere in the codebase, including inside API clients or repositories.
- [ ] **No Silenced Catches:** For every `catch {}` block in your code, is there a comment explaining why the error is being swallowed AND a `pino` logger statement recording the failure?
- [ ] **Process.env Access:** Is there absolutely zero direct access to `process.env` (like `process.env.NEXT_PUBLIC_API_URL`) outside of `config.ts`? All environment variables must be read through the Zod-validated `config` object.
- [ ] **Pino Logger:** Did you use `console.error` or `console.log` anywhere? These are forbidden. You must exclusively use the `createLogger(serviceName)` (pino) factory.

## 4. Type Safety & Validation
- [ ] **No Blind Casting:** Did you blindly cast network responses (e.g., `return result as T` or `return result.data as T`)? External data must not be trusted. You MUST parse and validate it with Zod and use `z.infer`.
- [ ] **No Non-Null Assertions:** Did you use `!` on any external data?

## 5. Security & Dependencies
- [ ] **Dependency Auditing:** If you added any new packages to `package.json` (e.g., `zod`), did you explicitly run `npm audit` or use the `scan_dependencies` skill? You MUST fix/resolve any vulnerabilities flagged (e.g., moderate severity XSS vulnerabilities) before submitting the PR.

## 6. Testing
- [ ] **Unit Tests Exist:** Did you add unit tests in the `tests/unit/` folder for your newly implemented feature? A completely missing tests folder or missing test file for your specific logic is an automatic PR failure. All PRs must include tests.

## 7. ICE_ENGINEERING.md Full Compliance
- [ ] **Line-by-Line Verification:** In addition to the recurring errors listed above, have you cross-referenced your entire PR against every single section of `ICE_ENGINEERING.md`? 
  - Section 1 (Git Workflow)
  - Section 2 (Coding Standards)
  - Section 3 (Definition of Done)
  - Section 4 (Task Breakdown & Dependency Map)
  - Section 5 (Nomba Certification Golden Rules)
- You MUST ensure your code completely satisfies ALL rules in those sections.

---
**Agent Instruction:** You must perform a line-by-line verification against this entire checklist AND `ICE_ENGINEERING.md`. If any check fails or any rule is violated, you MUST FIX the code or the git history BEFORE opening the PR. Only proceed to open the PR when all checks pass perfectly.
