# Eyehold revenue channels

The station can draft things a customer could buy. The owner decides what leaves the station. User accounts are separate from this. A signup does not create a sale.

## What a bot may do

Specialist instructions tell the crew to draft a sellable digital product: a template, a guide, an asset, or a small paid service. The draft has a title, a description, a price in US cents, and a channel. The first channel is `stripe-payment-link`. The draft goes into the Market outbox. The bot does not create a Stripe product, a payment link, or a customer message.

## What requires an owner click

Every external action stays queued until the owner presses its button:

| Action | Button | Effect |
| --- | --- | --- |
| Create the Stripe product, price, and payment link | CREATE STRIPE LINK | One test-mode Stripe account call, using `STRIPE_SECRET_KEY` |
| Drop a draft | REJECT DRAFT | Local only |
| Record a realized sale | `settle` with `confirmedReviewed: true` | Revenue minus measured compute cost |

A request without `confirmed: true` does not call Stripe. Live secret keys are rejected. `payment_method_types` is not sent.

Another channel can be added later by implementing `publish(listing, ctx)` and registering that id. The queue does not change.

## Money and Crowns

A reviewed sale writes two USD receipts: the payment as `revenue`, and the run's measured compute as `model-cost`. The profit ladder in `sidecar/eyehold-finance-truth.js` is revenue minus those costs, toward $1,000,000, then $10,000,000, then $100,000,000. If compute was not measured, the sale is refused rather than booked as free. Crowns are not awarded by a sale and are not dollars.

This is not a bank reconciliation. `CREDITS.live` and `CLOUD_LIVE` stay false. No installer or worker is deployed from this tree, and no real Stripe key belongs in the repo.
