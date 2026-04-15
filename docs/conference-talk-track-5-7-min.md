# Conference Talk Track (5 To 7 Minutes)

## 0:00 To 0:45 - Problem And Positioning

- Introduce community energy management challenge: forecasting, reliability, and coordination.
- Position VoltAI as AI-first simulation platform for reproducible research demos.
- Clarify: blockchain is optional settlement infrastructure, not the intelligence core.

## 0:45 To 1:45 - Forecast Lab

- Show deterministic controls: seed, months, scenario.
- Explain synthetic protocol and anomaly injection.
- Highlight traceability fields and why they matter for reproducibility.
- Point to multi-model simulation and explainability factors.
- Show sufficiency panel: deficit windows, high-risk hours, and expected grid dependency.

## 1:45 To 3:00 - Validation Lab

- Walk through forecast leaderboard and anomaly benchmarking.
- Explain MAE, RMSE, MAPE, precision, recall, F1, AUROC proxy.
- Show calibration chart and describe confidence reliability.
- Demonstrate ablation toggles and discuss degradation evidence.

## 3:00 To 4:15 - Optimization Lab

- Explain that policy is selected from validation ranking signal.
- Show 24h allocation chart: solar, battery, grid mix.
- Emphasize uncertainty-aware recommendations and scenario sensitivity.
- Report projected cost and self-sufficiency outcomes.

## 4:15 To 5:30 - Market Intelligence

- Show AI matching constraints: price compatibility, distance, reliability.
- Demonstrate dual-role households (same participant buyer and seller at different times).
- Explicitly answer "who buys if everyone sells": buyers are deficit households in those slots; roles switch by time and price.
- Review trade evidence and matching strictness rationale.
- Reiterate optional lightweight settlement layer.

## 5:30 To 6:30 - Research Credibility And Future Path

- Summarize deterministic replay and traceability contract.
- Discuss limitations of synthetic-only assumptions.
- Present real-data roadmap: smart meters, weather streams, human labels.

## 6:30 To 7:00 - Closing

- Restate key innovations:
  - multi-model simulation
  - validation-first policy selection
  - explainable uncertainty-aware recommendations
  - dual-role prosumer market intelligence
- Invite technical Q and A on formulas, metrics, and assumptions.

## Backup Q And A Prompts

- How do you guarantee reproducibility across all modules?
- Why is policy chosen from leaderboard score rather than static rules?
- How is uncertainty propagated into recommendations?
- What evidence proves dual-role buyer-seller behavior?
- What changes are needed for deployment with real utility data?

## Scripted Demo Path (Evidence Checklist)

- Baseline scenario: `normal-summer-day`, seed `2026`, show forecast sufficiency and low-risk profile.
- High-demand scenario: `festival-high-demand`, same horizon, show increased deficits and grid fallback.
- Validation ranking shift: toggle scenario and ablation controls, show leaderboard reorder.
- Optimization policy change: move to `grid-price-spike`, show policy transition and recommendation shift.
- Dual-role market proof: show household table with non-zero buyer and seller slots in same participant set.