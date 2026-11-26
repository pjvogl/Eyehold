# Eyehold Crown policy: $1 million net-profit objective

**Policy:** Crowns reward verified progress toward legitimate revenue generation or cost reduction, not mere activity or completion. This is a business objective, not a guarantee of income.

For each task, the operator must define the intended business impact and an acceptable evidence artifact **before** assigning work. The server-side acceptance process must confirm:
- The run was completed by a real agent.
- The deliverable was accepted and its evidence was recorded.
- The acceptance record identifies a valid `goalId` (e.g. `profit-1m`), sets `goalAdvanced: true`, and includes a `goalEvidenceRef` among its accepted `evidenceRefs`.
- The ledger verifies the submitted receipt independently against the trusted run and acceptance stores. No self-awarded Crown credit.

Examples of *possible* goal-aligned deliverables: a published, authorized sales landing page; a customer-approved paid deliverable; a verified lead-research list meeting quality and compliance requirements; reduced documented compute cost. An internal draft may qualify only if the operator has preapproved it as a measurable step toward an actual commercial objective. Invoices, sales and realized net profit must be tracked in a **separate accounting system** using actual transactions, expenses and refunds.

Unapproved busywork, speculative income claims, spam, fabricated customers, unsafe work, and submissions with no credible proof receive **zero Crowns**.

Treasury Watch scores Crowns from verified net profit only: one Crown per whole dollar after costs and compute, including a share for Raven Court when that research fed the venture. A missing Stripe receipt stays unavailable and pays zero Crowns. Paper results are practice points.

## Current limitations
The scoring engine and trusted bridge now enforce the goal fields, but the live sidecar has **not yet been wired** to an authoritative goal/acceptance store for end-to-end automatic awards. An accepted `goalAdvanced` flag establishes a reviewed milestone, not an independently verified increase in bank balance. The existing release audit and live role-specific delegation proofs remain pending.
