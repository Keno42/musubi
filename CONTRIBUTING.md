# Contributing

Before writing any code — with or without an AI assistant — read
[`AGENTS.md`](./AGENTS.md). It is short, and it is the actual contract:
weigh every request against user safety, end-user clarity, and codebase
clarity before implementing it. Leaving the app simpler than you found it
is part of the job.

Mechanics: `npm run lint && npm run build && npm run test:rules` must pass;
CI enforces the same on every PR.
