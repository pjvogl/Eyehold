# Eyehold fast-gate investigation — 2026-10-15

## Observed CI failure
- GitHub run: https://github.com/pjvogl/eyehold/actions/runs/38761430022
- Failing job: fast-gate, job 116513408989
- Stopped at: test 349/1101, `test/qa-product-perfect-claims.test.js`
- Test reported: 10 problems, 54 assertions OK.
- Representative symptoms: planning BLOCKED (expected PASS); release path-set mismatch; accepted-candidate ledger equality and test fixture scenarios failed.
- Node 20 deprecation notice is a warning, not the failing test.

## Mechanism
`scripts/qa/product-perfect/claims.mjs` enumerates *every tracked frontend JS/HTML/CSS*
file plus published marketing documents as the release surface, then checks the path-set,
content SHA256 values, and ancestor source commit against
`qa/product-perfect/claims.json`. Eyehold added frontend source files and modified
`frontend/index.html` and `frontend/app/world.js`; the old release inventory cannot
remain PASS. This is by design, not a flaky assertion.

## Correct resolution — NO CI bypass
1. Audit the newly added Eyehold assets and any existing upstream brand/art references
   for ownership and public-distribution rights.
2. Review new and changed user-facing copy against the finite product claims (especially
   unattended execution, live agents, productivity awards, and mobile capability).
   These remain in-development and must not be advertised as verified features.
3. Test the app and review affected release-source files.
4. Use `buildReleaseSurface(repoRoot, { candidateCommit: reviewedCommit })` from
   `scripts/qa/product-perfect/claims.mjs` to generate a fresh exact source
   inventory; DO NOT manually fabricate SHA values or change the file discovery rules.
5. Update the reviewed ledger only as part of that evidence-based source-lock renewal,
   recording who approved the source snapshot and its claims.
6. Rerun `node test/qa-product-perfect-claims.test.js`, then `npm run test:fast`
   on the exact reviewed revision and inspect any subsequent failures.
7. Keep product/release readiness BLOCKED until the required review and gates pass.

## Not a passing gate
This document is diagnosis, not a release approval. The Eyehold-specific unit tests
passing does not mean end-to-end execution, live Crown attribution, or background
availability has been proven.
