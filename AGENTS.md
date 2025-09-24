# AGENTS.md — CommodiTrade

This file guides AI agents and developers working on **CommodiTrade**, a commodity trading & operations platform. It standardizes project structure, coding style, business rules, and integration patterns so generated code fits the existing system without surprises.

> **Scope**: Physical commodity & stock movements and operational workflows (trading, inventory, logistics, contracts, counterparties, settlement UI). **Out of scope**: Risk management/hedging/futures.

---

## 1) Tech Stack & Architecture

- **Framework**: Next.js (App Router) + TypeScript
- **UI**: Tailwind CSS + **shadcn/ui** (Radix under the hood)
- **State/Data**: TanStack React Query
- **Database**: PostgreSQL (Supabase) via **Prisma**
- **Runtime**: Server Actions for DB calls; client hooks for UI data
- **Charts**: Recharts (when needed)
- **Mocking**: In-memory mock layer for demos/fallbacks

### Key Packages

- `@prisma/client`, `prisma`
- `@supabase/supabase-js`
- `@tanstack/react-query`
- `next`, `react`, `zod` (validation), `date-fns` (dates), `lucide-react` (icons)
- `tailwindcss`, `class-variance-authority`, `clsx`

---

## 2) Environment & Scripts

Create `.env` from `.env.example`:

```
DATABASE_URL="postgresql://postgres:password@localhost:5432/commoditrade?schema=public"
NEXTAUTH_SECRET="SedoFSUzGjwzWbLsJJs1p4145NjY5Q6o"
NEXTAUTH_URL="http://localhost:3000"
NODE_ENV="development"
```

**Scripts** (typical):

```
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "db:generate": "prisma generate",
    "db:push": "prisma db push",
    "db:migrate": "prisma migrate dev",
    "db:studio": "prisma studio"
  },
```

> **Agents** must keep secrets server-only. Never expose `SUPABASE_SERVICE_ROLE_KEY` to the client.

---

## 3) Design Prompt

For all designs I ask you to make, have them be beautiful, not cookie cutter. Make webpages that are fully featured and worthy for production.

When using client-side hooks (useState and useEffect) in a component that's being treated as a Server Component by Next.js, always add the "use client" directive at the top of the file.

Do not write code that will trigger this error: "Warning: Extra attributes from the server: %s%s""class,style"

By default, this template supports JSX syntax with Tailwind CSS classes, the shadcn/ui library, React hooks, and Lucide React for icons. Do not install other packages for UI themes, icons, etc unless absolutely necessary or I request them.

Use icons from lucide-react for logos.

---

## 4) Data Model (essentials)

_Primary entities and relations (summarized):_

- **Commodity** ↔ **Trade**, **InventoryItem**, **Contract**, **Shipment**
- **Trade** (BUY/SELL) ↔ **Commodity**, **Counterparty**, [0..*] **Shipment**
- **InventoryItem** (lot-based) ↔ **Commodity**
- **Contract** (PURCHASE/SALE) ↔ **Commodity**, **Counterparty**
- **Shipment** ↔ **Commodity**, optional **Trade**, logistics fields
- **Counterparty** ↔ credit fields, aggregates

### Core Enums (typical)

- `TradeStatus = OPEN | EXECUTED | SETTLED | CANCELLED`
- `TradeType = BUY | SELL`
- `ShipmentStatus = PLANNED | IN_TRANSIT | DELIVERED | DELAYED | CANCELLED`
- `ContractType = PURCHASE | SALE`
- `ContractStatus = DRAFT | ACTIVE | COMPLETED | CANCELLED`

---

## 5) Business Rules (must enforce)

1. **Credit limits**: Creating/Executing trades/contracts must validate counterparty credit usage ≤ limit (transactional).
2. **Inventory cannot go negative**: OUT movements and SELL executions must check available quantity.
3. **Lot merging**: BUY executions may merge into existing lots by (commodity, warehouse, quality) or create a new lot.
4. **Unique identifiers**: Shipment `trackingNumber` must be unique. Duplicates are rejected.
5. **Date correctness**: `endDate >= startDate` for contracts/shipments; shipped/delivered timestamps are monotonic.
6. **Cascade updates**:
   - Price updates ⇒ inventory valuation refresh (unrealized P&L).
   - Trade/Contract executions ⇒ inventory adjustments + counterparty credit usage.
7. **Idempotency**: Executing/cancelling the same trade twice must be safe (no double effects).
8. **Transactions**: Multi-write flows (e.g., executeTrade) are atomic using `prisma.$transaction`.
9. **Validation**: Use **Zod** input schemas in the server layer. Surface friendly errors to the UI.
10. **Access**: Server-only DB layer. Client never imports Prisma directly.

---

## 6) Server Database Layer (Prisma + Supabase)

_All functions live under `lib/database/*.ts` and are **server-only**._

- **Trades**: `createTrade`, `executeTrade`, `cancelTrade`, `getTrades`, `getTradeStatistics`
- **Inventory**: `createInventoryItem`, `processInventoryMovement`, `getInventoryValuation`, `getLowStockAlerts`, `updateMarketValues`
- **Contracts**: `createContract`, `executeContract`, `getExpiringContracts`, `getContractStatistics`
- **Shipments**: `createShipment`, `updateShipmentStatus`, `getDelayedShipments`, `getArrivingSoonShipments`
- **Counterparties**: `createCounterparty`, `updateCreditAssessment`, `getCreditRiskCounterparties`, `getCounterpartyPerformance`
- **Commodities**: `updateCommodityPrice`, `batchUpdateCommodityPrices`, `getCommodityMarketSummary`, `getCommodityPriceHistory`
- **Dashboard**: `getDashboardStatistics`, `getTradingPerformance`, `getCommodityExposure`, `getSystemHealthMetrics`

**Conventions**

- Prefix with `"use server"`; validate input with Zod; wrap multi-step flows in `prisma.$transaction`.
- Narrow selects: return only fields the UI needs.
- Use explicit `ORDER BY`, `LIMIT`, pagination cursors where relevant.
- Throw typed errors with stable `code` strings (e.g., `CREDIT_LIMIT_EXCEEDED`).

---

## 7) Client Data Layer (TanStack Query)

Hooks in `lib/hooks/*` wrap server functions.

**Patterns**

- Queries: stable keys, e.g., `["trades", filters]`, `["inventory", { commodityId }]`
- Mutations: optimistic updates where safe; otherwise invalidate narrow scopes.
- Invalidation matrix (examples):
  - `createTrade` ⇒ `["trades"]`, `["dashboard"]`, `["counterparties", id]`
  - `executeTrade` ⇒ `["trades"]`, `["inventory"]`, `["dashboard"]`
  - `updateCommodityPrice` ⇒ `["commodities"]`, `["inventoryValuation"]`, `["dashboard"]`
- Loading: skeletons/spinners via shadcn/ui; errors via toast with actionable text.
- Never import Prisma in client code.

---

## 8) UI / Styling Conventions

- **Design tone**: Professional trading platform.
- **Palette** (reference): primary **#2563eb**, success **#059669**, warning **#d97706**, danger **#dc2626**.
- Use shadcn/ui primitives: `Button`, `Card`, `Table`, `Dialog`, `Badge`, `Progress`, `Tabs`, `DropdownMenu`, `Toast`.
- File names: **PascalCase.tsx** for components; colocate component-specific styles if needed.
- Components are **functional** with hooks; props are **typed**; prefer composition over inheritance.
- Accessibility: label inputs, keyboard-focusable dialogs, use `aria-*` as needed.

---

## 9) Mock vs. Real Data

- **Default**: Use real DB functions.
- **Fallback**: If `DATABASE_URL` is missing or `USE_MOCKS=true`, hooks can switch to `lib/db-operations.ts` & `lib/mock-data.ts` for demos.
- Keep API signatures identical between real & mock layers.

---

## 10) Testing & Quality Gates

**Unit**: Test server functions with an ephemeral Postgres (or Prisma SQLite shadow) and seeded fixtures.  
**Integration**: Exercise server actions via Next route handlers or server functions.  
**E2E** (optional): Playwright for critical flows (trade execute, inventory adjust, shipment status).

**Commands**

```
npm test
npm run lint
npm run type-check
npm run build
```

PRs must pass: **lint**, **type-check**, **build**, and **tests**. For DB changes: include migration and update seed script.

---

## 11) Pull Request Guidelines

1. **Describe** the change, include screenshots/GIFs for UI.
2. **Link issues** and note affected domains (trades/inventory/etc.).
3. **Migration note**: call out Prisma schema changes & run instructions.
4. **Testing**: list what you tested + steps to reproduce.
5. Keep PRs focused on a **single concern**; avoid mixed refactors.
6. Follow commit style: `domain: concise change`, e.g., `trades: enforce idempotency on executeTrade`.

---

## 12) Performance, Observability, Security

- Prefer batched reads & indexed filters; add DB indexes for frequent queries (commodityId, status, createdAt).
- Avoid N+1: use `include/select` strategically; denormalize aggregates when needed.
- Add **server-side** logging (domain, op, duration, result) and wrap errors with context—never leak secrets to client.
- PII: store minimal partner info; gate sensitive fields server-side; use RLS if adopting Supabase policies.
- Rate-limit public endpoints if added in the future.

---

## 13) Domain Checklists (quick cues for agents)

### Trades

- [ ] Validate commodity + counterparty exist
- [ ] Enforce credit usage ≤ limit (txn)
- [ ] BUY: create/merge inventory lot
- [ ] SELL: ensure sufficient stock & decrement
- [ ] Idempotent execute/cancel

### Inventory

- [ ] Movements never produce negative qty
- [ ] Merge by (commodity, warehouse, quality)
- [ ] Recompute avg cost where required
- [ ] Update marketValue and P&L on price change

### Contracts

- [ ] remainingQty = totalQty - executedQty (≥ 0)
- [ ] Execution adjusts inventory by type
- [ ] End date ≥ start date

### Shipments

- [ ] Unique trackingNumber
- [ ] Optional link to Trade; quantity ≤ trade (if linked)
- [ ] Status transitions valid; delayed detection with ETA

### Counterparties

- [ ] Maintain creditUsage & performance metrics
- [ ] Expose helpers: getCreditRiskCounterparties, performance KPIs

---

## 14) Onboarding Notes for New Contributors

1. Install deps, copy `.env.example` → `.env`, set Supabase creds.
2. `npm run prisma:migrate` → `npm run prisma:generate`
3. `npm run dev` and open http://localhost:3000
4. Explore hooks in `lib/hooks` and server ops in `lib/database`.
5. Start with a small change (e.g., add a dashboard card), then a mutation (e.g., shipment status update).

---

## 15) Glossary

- **BUY/SELL Trade**: A single purchase/sale order affecting inventory.
- **Lot**: A quantity of a commodity with shared attributes (warehouse, quality, cost).
- **Contract**: Long-term agreement; can be executed partially in tranches.
- **Movement**: Inventory adjustment IN/OUT/ADJUSTMENT.
- **Credit Usage**: Sum of outstanding exposures against a counterparty’s limit.

---

#

_This AGENTS.md is the single source of truth for agent behavior in CommodiTrade. Keep it updated when architecture or rules change._
