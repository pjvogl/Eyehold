# The Eyehold

A Manager and a crew of specialists, each running a venture that can earn real money for the owner.

The Manager picks the work: an Etsy shop of digital and printable products, freelance-style digital services, a trader, or a new venture the Manager proposes. Before that, the Manager asks the Researcher. The Researcher, Raven Court on the work board, does nothing but research. They return ranked briefs: expected revenue, upfront cost, risk, time to first dollar, and sources. The Manager accepts a brief and assigns it to a job agent. That agent can ask the Researcher for more, such as a trending niche, a price, a competitor, or the state of a market. The answer attaches to the venture. Signups are a bonus. The score that matters is verified profit.

## What you see

Crowns are the scoreboard. One Crown is one whole dollar of verified net profit: money received, minus costs, minus compute. They are points, not cash, and they are not transferable. Each agent and each venture shows its own Crowns. When a venture came from the Researcher's work, that Researcher keeps a share of those Crowns. A brief's expected revenue is not profit and pays nothing.

Paper trading and other simulations do not earn Crowns. Those results show up as practice points, labeled so they cannot be mistaken for profit.

## The treasury

Upfront costs come out of money the team has already earned: listing fees, tools, ads, trading capital. The owner can top up the treasury by hand. Each agent has a budget and a hard cap. If the cash is not there, the spend does not happen.

Nothing goes out on its own. A listing, a payment link, a trade, a spend, or a message to a customer waits in the queue until the owner clicks.

## The channels

The trader starts on paper. Fills are simulated. Position size and losses are capped. Moving a trader onto a small real budget takes the owner's approval and a paper record that is actually ahead. No broker is connected, and no broker key is stored.

Etsy listings have an adapter for the Etsy Open API. It is not connected. A key in the environment would not make it call Etsy in this build. Stripe Payment Links are the sales channel that can run, in test mode, and only after the owner presses the button.

## The ladder

Verified profit is recorded in the station ledger toward $1,000,000, then $10,000,000, then $100,000,000 after compute and other measured costs. Missing numbers stay missing. Crowns do not move the ladder. The ladder does not mean the money is in the bank.

This station does not deploy itself, and it does not ship with payment or brokerage secrets.
