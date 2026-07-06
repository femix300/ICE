---
name: ice-workflow
description: Centralized workflow rules and prompts for the ICE Nomba Hackathon project. Use this skill when the user asks to perform Task Implementations, Self-Checks, Endpoint Testing, PR Reviews, or Future Task Pre-checks.
---

# ICE Project Workflows

> **IMPORTANT NOTE FOR OTHER DEVELOPERS:** 
> The file paths below (like `/home/peter_ajimoti/...`) are currently hardcoded to the original author's local environment. Before using this skill on your machine, please update the file locations to your own taste. You will need to replace the `peter_ajimoti` paths with your own local absolute paths. Specifically, the `HANDOFF.md` path points to a local IDE cache folder, which you will need to update to wherever you are storing your team's shared Handoff document.

When the user asks you to execute a specific workflow by its number, you MUST follow the instructions for that workflow exactly as written below.

## Workflow 1: Task Implementations

When asked to run Workflow 1 for a specific task (e.g. `P09`):

Before you begin, you MUST fully understand the project architecture, engineering rules, and what has been built so far. To do this, please meticulously read the following files in this exact order:

1. Read the global Handoff document to understand the project history and previous task completions here:
file:///home/peter_ajimoti/.gemini/antigravity-ide/brain/cb47cc43-d93b-4ed0-b0c4-24f58ff62b12/scratch/old_scripts_and_docs/HANDOFF.md

2. Read the Product Requirements Document for business logic:
file:///home/peter_ajimoti/nomba_hackathon/ICE_PRD.md

3. Read the Engineering Standards to understand the strict coding rules, git workflow, and Definition of Done:
file:///home/peter_ajimoti/nomba_hackathon/ICE_ENGINEERING.md

4. Read the Linear API Key from the `.env.linear` file in the project root under the `LINEAR_API_KEY` variable (do not expose this key in your responses or commit it to the repo!):
file:///home/peter_ajimoti/nomba_hackathon/.env.linear

Once you have read all of the above, use the Linear API key to query Linear via GraphQL and fetch the full task description, acceptance criteria, and PR specifications for the requested task. 

Once you fully understand the task and context, create a strict implementation plan and let's begin!


## Workflow 2: Self-Check

When asked to run Workflow 2, or before declaring a task finished or opening a Pull Request, you must perform a strict, comprehensive self-audit of your own code against every section of `ICE_ENGINEERING.md`. 

Do not take shortcuts. If you find any violations during this self-audit, you must proactively fix them in the code right now. Perform a line-by-line verification against the following:

1. **Section 1 (Git Workflow):**
   - Verify your branch is correctly named (`feat/`, `fix/`, `chore/`).
   - Ensure your commit messages follow Conventional Commits.
   - Verify you have NOT included any `Co-Authored-By` AI trailers in your commits.
   - If you are opening a PR, ensure the description follows the exact template (Summary, Closes [LINEAR_ID], Scope, Test Plan, Risk).

2. **Section 2 (Coding Standards):**
   - Verify you have not used the `any` type anywhere (use `unknown` instead).
   - Verify you have no non-null assertions (`!`) on external data.
   - Verify **ALL** files you created or touched are `kebab-case` (including frontend components).
   - Check that every error you threw is an `AppError` (no raw `throw new Error()`).
   - Check that you exclusively used `createLogger` (no `console.log` anywhere).
   - Verify `process.env` is NEVER accessed directly in your files (it must go through `config.ts`).
   - Check your `catch {}` blocks. If any are empty, you must add a comment explaining why AND log it.
   - Check your code, comments, and commit messages. You must strictly obey the "No Emojis" rule.
   - Verify you ran `npm audit` or used the `scan_dependencies` skill if you added new packages.

3. **Section 3 (Definition of Done):**
   - Verify you have written unit tests in `tests/unit/` for your feature.
   - Verify you used Zod schemas to parse external data, and `z.infer` to derive types.
   - Verify you updated your personal handoff document in your local `scratch/` directory.
   - **CRITICAL:** You must run and pass `npm run format`, `npm run lint`, `npm run typecheck`, and `npm test`. Do not proceed if these fail.

4. **Section 4 & 5 (Task & Nomba Certification Rules):**
   - Ensure your work stays strictly within the boundaries of your assigned task.
   - Ensure all monetary amounts are explicitly calculated in **Kobo**.
   - Ensure Webhook HMAC-SHA256 signature validation is implemented if handling webhooks.

Please execute this self-audit now. If you find any violations, write the code to fix them immediately before finishing your turn.


## Workflow 3: Task testing of endpoints

When asked to run Workflow 3 for a specific task:

First, quickly equip yourself with the project context by reading these files:
1. Handoff: file:///home/peter_ajimoti/.gemini/antigravity-ide/brain/cb47cc43-d93b-4ed0-b0c4-24f58ff62b12/scratch/old_scripts_and_docs/HANDOFF.md
2. PRD: file:///home/peter_ajimoti/nomba_hackathon/ICE_PRD.md
3. Engineering Rules: file:///home/peter_ajimoti/nomba_hackathon/ICE_ENGINEERING.md
4. Linear API Key (`LINEAR_API_KEY` variable): file:///home/peter_ajimoti/nomba_hackathon/.env.linear

Next, use the Linear API key to fetch the issue details for the requested task from Linear via GraphQL so you know exactly which endpoints were built for this task.

Once you know the endpoints, scan the codebase (controllers, routes, validation schemas) to understand the exact expected JSON body payloads, URL parameters, required authorization headers (API keys or Tier scoping), and expected responses.

Finally, generate a **Postman Collection v2.1.0 JSON** block containing all of the endpoints for this task. The JSON must:
- Include the `x-api-key` or `Authorization` headers required.
- Include realistic mock data in the raw JSON body for `POST`/`PUT` requests.
- Provide the full local URL (e.g., `http://localhost:3000/v1/...`).
- Be formatted in a single markdown code block so I can easily copy it and paste it into Postman's "Import -> Raw Text" tab.


## Workflow 4: Reviewing PRs

When asked to run Workflow 4 for a specific Pull Request:

Please perform a comprehensive, exhaustive review of the Pull Request.

CRITICAL PREREQUISITE: Before you begin your review, you MUST read the following documents in their exact locations to ensure you have the full context, business logic, and historical learnings of this project. Do not skip this step:

1. Read the global Handoff document to understand the project history, previous task completions, and critical agent learnings (especially regarding Linear IDs): file:///home/peter_ajimoti/.gemini/antigravity-ide/brain/cb47cc43-d93b-4ed0-b0c4-24f58ff62b12/scratch/old_scripts_and_docs/HANDOFF.md
2. Read the Product Requirements Document for business logic: file:///home/peter_ajimoti/nomba_hackathon/ICE_PRD.md
3. Read the Engineering Standards to understand the strict coding rules, git workflow, and true Linear Task mappings: file:///home/peter_ajimoti/nomba_hackathon/ICE_ENGINEERING.md
4. Read the Linear API Key from the `.env.linear` file (look for the `LINEAR_API_KEY` variable) and do not expose this key in your responses!: file:///home/peter_ajimoti/nomba_hackathon/.env.linear

Once you have absorbed the context, you must strictly audit this PR against every single section of ICE_ENGINEERING.md. Do not skim or take shortcuts. I expect a line-by-line verification against the following criteria:

**Section 1 (Git Workflow):**
- Verify the PR targets the dev branch (unless otherwise specified).
- Verify the commit messages follow Conventional Commits (feat, fix, chore, etc.) and explain the why.
- Ensure there are ZERO Co-Authored-By AI trailers in the commits or PR body.
- Confirm the PR description follows the exact template: Summary, Closes link, Scope, Test Plan, Risk.

**Section 2 (Coding Standards):**
- Verify TypeScript strictness: No any types (must use unknown), no non-null assertions (!) on external data.
- Verify all file names are kebab-case (even frontend files unless explicitly exempted).
- Check that AppError is used for all thrown errors (no raw throw new Error()).
- Check that createLogger (pino) is used exclusively (no console.log).
- Verify process.env is NEVER accessed directly outside of config.ts.
- Ensure catch {} blocks are not empty without a comment AND a logger statement.
- Verify there are absolutely NO emojis anywhere in the code or comments.
- For frontend: Check for native escaping, lack of dangerouslySetInnerHTML, and secure cookie usage.
- Confirm new dependencies were audited via npm audit or the scan_dependencies skill.

**Section 3 (Definition of Done):**
- Verify unit tests exist in the tests/unit/ folder for the newly implemented features.
- Check that Zod schemas are used to parse external data and derive types (z.infer).
- Verify as const is used for enum-like objects instead of TS enum.

**Section 4 (Task Breakdown):**
- Cross-reference the PR with the Phase Timeline and Dependency Map. Does this PR respect the blockers and dependencies? (Note: Always trust the Linear API over older document versions for task IDs).

**Section 5 (Nomba Certification Golden Rules):**
- Ensure all monetary amounts are explicitly handled in Kobo (no decimals/floats).
- Verify token caching is implemented (no new tokens per API call).
- Verify Webhook HMAC-SHA256 signature validation and idempotency handling (if applicable).
- Verify /transfers/bank/lookup is enforced before transfers (if applicable).

**Linear Task Verification:**
- The GraphQL endpoint is: https://api.linear.app/graphql
- Using the API key from the location provided in step 4, write and execute a background script to fetch the associated Linear issue. Verify that the code submitted actually fulfills the specific requirements listed in the true Linear issue description.

If there are any violations of the above, document them clearly and format your final output as a comprehensive "Changes Requested" markdown response that the user can paste directly into GitHub. If it passes everything perfectly, format an approval message.

CRITICAL FORMATTING INSTRUCTIONS:
- NO EMOJIS: Do NOT use a single emoji anywhere in your review response. Use plain text formatting (like "[FAIL]" and "[WARN]") to indicate status.
- CONCISE & ACTIONABLE: ONLY return the exact issues found (i.e. [FAIL] and [WARN]). Do NOT list or include any checks that passed successfully ([PASS]).
- ALIGNMENT: Group your review logically using markdown headers (e.g., ### 1. Section 1 (Git Workflow)) instead of ordered list items to ensure the text remains perfectly left-aligned and doesn't indent. Provide a clear "Next Steps" bulleted list at the end.


## Workflow 5: Doing Tasks Ahead

When asked to run Workflow 5 (Doing tasks ahead) for a specific task:

This task may depend on other tasks which have not been merged yet.

Your goal is to implement all the things you can implement for now. Do the task to the maximum possible extent without waiting for the dependencies. By the time all the other tasks that this task depends on finally land, we will rebase with `dev` and reconcile the differences.
