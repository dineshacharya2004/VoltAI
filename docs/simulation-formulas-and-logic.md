# Simulation Formulas And Logic

## Scope

This document captures the deterministic formulas and rules used across Phases 1 to 4.

## Deterministic Seed Protocol

- Primary control variable: `seed`.
- All pseudo-random draws are generated through seeded RNG utilities.
- Repeating `(seed, months, scenario)` yields equivalent outputs for dataset, forecasts, evaluation, optimization, and market matching.

## Phase 1: Synthetic Dataset Logic

For each hour:

- Demand baseline is a function of:
  - occupancy profile
  - appliance-event signal
  - time-of-day periodic component
  - scenario multipliers
- Solar baseline is a function of:
  - daylight sinusoid
  - cloud cover and irradiance terms
  - scenario multipliers
- Grid tariff is scenario-sensitive and time-sensitive.
- Battery state of charge evolves by charge/discharge constraints and bounded capacity.
- Anomaly labels are deterministic injections from scenario-specific rates and patterns.

## Phase 2: Model Simulation Logic

Weather adapter protocol:

- Forecast routes accept a weather provider selector.
- Current providers:
  - `synthetic`: deterministic weather from seeded scenario equations.
  - `open-meteo-sim`: API-style deterministic perturbation to emulate forecast ingestion uncertainty.
- Provider metadata (`provider`, `mode`, `confidence`, `note`) is returned in forecast outputs.

Demand models:

- LSTM proxy: stronger temporal carry-over behavior.
- Prophet proxy: trend and seasonality emphasis.
- XGBoost proxy: nonlinear feature interaction emphasis.

Solar models:

- CNN-weather proxy: weather-shape sensitivity.
- GBM proxy: tabular feature interactions.

Anomaly models:

- Isolation Forest proxy: outlier-style score shaping.
- Autoencoder proxy: reconstruction-error style score shaping.

Confidence and uncertainty:

- Confidence is bounded in [0, 1].
- Prediction intervals are generated around point predictions.
- Wider intervals imply lower operational certainty.

Sufficiency intelligence:

- Hourly demand and solar forecasts are compared to classify slots as `surplus`, `deficit`, or `balanced`.
- Risk levels (`low`, `medium`, `high`) are derived from deficit magnitude and confidence.
- Expected grid fallback is estimated per slot and aggregated into:
  - `solarSufficiencyPct`
  - `expectedGridDependencyPct`
  - `highRiskHours`

## Phase 3: Evaluation And Benchmarking

Forecast metrics:

- MAE: average absolute error.
- RMSE: root mean square error.
- MAPE: mean absolute percentage error.

Anomaly metrics:

- Precision, recall, F1.
- AUROC proxy for ranking behavior.

Composite score:

- Combines accuracy and latency terms.
- Used for leaderboard ranking and downstream policy signal.

Ablation:

- Controlled feature removals:
  - weather
  - temporal
  - occupancy
- Degradation deltas recorded against baseline.

Stress testing:

- Models are re-scored across scenario presets.
- Robustness score summarizes cross-scenario stability.

## Phase 4: Optimization Engine

Policy selection:

- Uses top Phase 3 forecast model by composite score.
- Maps scenario and top-model profile to policy family:
  - balanced
  - battery-priority
  - solar-priority
  - cost-shift

Hourly energy allocation:

1. Serve demand with available solar.
2. Use battery discharge subject to policy-specific limits and SoC constraints.
3. Charge battery from solar surplus under charge limits and efficiency coefficient.
4. Remaining demand is imported from grid.

Summary indicators:

- projectedCostInr
- projectedCarbonSavedKg
- selfSufficiencyScore
- gridDependencyPct
- batteryCycleUtilizationPct

Recommendations:

- Triggered by high-solar windows, high-tariff windows, and low-confidence windows.
- Each recommendation carries confidence for uncertainty-aware guidance.

## Phase 4: Market Intelligence

Household slot generation:

- Each household has seeded demand scale, solar scale, reliability, and location.
- Hourly slot role is determined by net generation:
  - seller if net surplus exceeds threshold
  - buyer if net deficit exceeds threshold
  - neutral otherwise
- This enables time-dependent role switching: a household can be seller at midday and buyer during evening peaks.

Matching constraints:

- buyer bid >= seller ask
- distance <= strictness-dependent distance limit
- reliability >= minimum gating threshold

Clearing and settlement:

- Clearing price is a weighted blend of bid and ask with reliability adjustment.
- Trades are recorded into deterministic lightweight ledger entries with `settled` status.
- Blockchain is optional and external to this simulation core.

## Traceability Contract

All simulation APIs include:

- `traceId`
- `seed`
- `modelVersion`
- `assumptions`
- `validationSummary`

This contract supports review reproducibility and technical Q and A.