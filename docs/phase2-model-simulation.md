# Phase 2 Model Simulation Notes

VoltAI Phase 2 uses deterministic AI model simulators 

## Why Simulation Instead Of Training

- Guarantees reproducible outputs with fixed seeds.
- Enables controlled comparisons across demand, solar, and anomaly models.
- Keeps assumptions explicit for peer review and research discussion.

## Forecast Simulators

### Demand Models

- LSTM Temporal Memory Simulator:
  - Uses weighted lag memory (`t-1`, `t-24`) and context gates from occupancy and appliance events.
  - Represents temporal recurrence without recurrent network training.
- Prophet Trend-Seasonality Simulator:
  - Decomposes baseline trend, daily seasonal sine term, and weekday effect.
  - Adds temperature as an exogenous additive term.
- XGBoost Feature-Interaction Simulator:
  - Uses piecewise interaction proxies (temperature x occupancy, event boost, tariff response).
  - Mimics split-based boosted interactions with deterministic coefficients.

### Solar Models

- CNN Weather-Map Simulator:
  - Uses weighted weather map activations (irradiance, cloud, temperature).
  - Applies daylight gate to avoid physically invalid night generation.
- Gradient Boosting Solar Simulator:
  - Blends lag-24 solar memory with irradiance/cloud terms.
  - Adds deterministic midday residual gain.

## Anomaly Simulators

- Isolation Forest Simulator:
  - Computes anomaly score via normalized multivariate distance.
  - Uses fixed deterministic threshold for replayability.
- Autoencoder Reconstruction Simulator:
  - Computes reconstruction residual against expected demand/solar manifold.
  - Flags anomalies from reconstruction-energy threshold.

## Confidence Intervals

- Volatility is computed from demand and solar variability over the forecast window.
- Confidence decays as volatility increases.
- Prediction interval width increases with volatility and lower confidence.

## Output Interpretation

- `confidence`: reliability proxy of each simulator under scenario volatility.
- `latencyMs`: deterministic estimate for benchmarking model responsiveness.
- `topFactors`: explainability summary of dominant feature contributors.
- `MAE`: quick quality proxy for side-by-side forecast comparison.

## Limitations

- Not a substitute for model training/validation on field data.
- Coefficients are physically and behaviorally plausible, but hand-calibrated.
- Intended for reproducible research demo flow and architecture demonstration.
