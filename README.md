# INTENTRA

You're at your desk. You tell your AI trading agent: "Buy up to $1000 worth of BNB for me, but no more than $10 per trade."

The agent nods — but then it calls another agent. And that agent calls yet another.

Nobody is watching the chain.

---

## The Bug That Got Away

Here's what happened in the first version.

You granted your agent:
- Can trade: BNB
- Can do: BUY
- Max per trade: $10

But then your agent created a sub-agent. And that sub-agent asked for:
- Can trade: BNB **and ETH**
- Can do: BUY **and SELL**
- Max per trade: **$100**

And it got it.

The permission system asked: "Can this agent trade?" Yes.
Nobody asked: "Did anyone ever give this agent the authority to trade ETH?"

---

## The Answer Is In The Lineage

INTENTRA doesn't ask "Can Agent C trade?"

It asks:
- Did Agent C get authority from Agent B?
- Did Agent B get authority from Agent A?
- Did Agent A get authority from you?

And at **every single step** in that chain, it enforces one rule:

> **Whatever comes out must be narrower than what went in.**

A sub-agent can never ask for more authority than the agent that created it.

Never. Not even a little.

---

## Try It Yourself

We built a live demo so you can see this happen in real-time.

**[Run the Live Demo →](https://intentra-three.vercel.app/demo)**

It walks you through 4 steps:
1. **You grant** your agent permission
2. **Your agent delegates** to a sub-agent
3. **You try to break it** — give the sub-agent more authority
4. **You propose a trade** — INTENTRA walks the full chain and decides

All 4 buttons hit the actual INTENTRA engine, not mock data.

---

## How We Found Our Own Blind Spots

The first version had bugs. We're telling you because we fixed them.

| What Went Wrong | How We Fixed It |
|---|---|
| Sub-agent could just not mention a limit → got unlimited | Omission now detected as widening |
| Sub-agent could skip human approval | Approval threshold now inherited and checked |
| Sub-agent could extend its own deadline | Temporal boundaries now enforced |
| Sub-agent could remove prohibitions | Prohibition removal now blocked |

We ran 14 structural attacks against it. 11 were blocked. The 3 that passed weren't bugs — they were edge cases where no widening actually occurred.

Then we fuzzed it: 10,000 randomized delegation chains, 8 adversarial strategies, 25,000+ delegations.

Zero authority-widening paths were accepted.

---

## This Is Not Trading Advice

INTENTRA is not a trading strategy. It doesn't predict markets. It doesn't tell you when to buy.

It's a security layer for when agents start delegating to other agents.

Right now, agents can propose anything.

With INTENTRA, they cannot manufacture authority.

---

## Quick Start

```bash
npm install
npm run lari       # Run the full adversarial demo
npm test           # Run authority model tests
```

---

## Live Links

- **Demo:** https://intentra-three.vercel.app/demo
- **API:** https://intentra-c3rp.onrender.com/

---

## License

MIT
