# Phase 4: Optimization + AI Market Intelligence

## Goal

Implement an AI-first optimization and peer-matching simulation layer that uses Phase 3 evaluation ranking as the control policy signal, while keeping settlement logic lightweight and deterministic.

## Implemented Components

- `lib/simulation/phase4.ts`
  - `runOptimizationEngine(...)`
  - `runMarketIntelligence(...)`
- `app/api/simulate/optimization/route.ts`
- `app/api/simulate/market/route.ts`
- `lib/simulation/schema.ts`
  - `optimizationApiResponseSchema`
  - `marketApiResponseSchema`
- `app/page.tsx`
  - Forecast tab now includes a Phase 4 panel for optimization and AI peer matching outputs.

## Optimization Engine Logic

1. Phase 3 leaderboard (`sortBy=score`) chooses top-ranked model signal.
2. Policy is selected deterministically (`balanced`, `battery-priority`, `solar-priority`, `cost-shift`) from scenario + top model identity.
3. For each forecast hour, demand is allocated across:
   - solar direct use
   - battery discharge/charge
   - grid import fallback
4. Confidence score is adjusted by interval uncertainty width.
5. Recommendations are generated from:
   - high-solar windows
   - high-tariff windows
   - low-confidence windows

## AI Market Matching Logic

1. Household slot profiles are generated deterministically for each hour.
2. A household can become dual-role (seller in some slots, buyer in others).
3. Matches are gated by:
   - price compatibility (`bid >= ask`)
   - distance threshold from strictness level
   - reliability floor
4. Clearing price is computed from bid/ask blend with reliability adjustment.
5. Settlement is represented as deterministic ledger entries (`status: settled`).

## API Contracts

- `GET /api/simulate/optimization`
  - Returns policy, selected models, 24h allocations, optimization summary, and recommendation set.
- `GET /api/simulate/market`
  - Returns strictness signal, households, trades, market summary, and ledger entries.

Both responses are validated by Zod schemas before returning.

## Validation Coverage

- `lib/simulation/phase4.test.ts`
  - deterministic reproducibility for optimization output
  - dual-role and trade sanity checks for market output
- `app/api/simulate/optimization/route.test.ts`
  - response structure and 24h allocations
- `app/api/simulate/market/route.test.ts`
  - response structure and summary constraints

All Phase 4-focused tests pass.
