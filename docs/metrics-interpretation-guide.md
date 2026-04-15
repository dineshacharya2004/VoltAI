# Metrics Interpretation Guide

## Purpose

This guide helps conference reviewers and judges interpret outputs consistently.

## Forecast Metrics

### MAE

- Units: kWh.
- Lower is better.
- Best for intuitive average error magnitude.

### RMSE

- Units: kWh.
- Lower is better.
- Penalizes large misses more strongly than MAE.

### MAPE

- Units: percent.
- Lower is better.
- Useful for relative error comparison across different load levels.

## Anomaly Metrics

### Precision

- Fraction of flagged anomalies that were true anomalies.
- Higher precision means fewer false alarms.

### Recall

- Fraction of true anomalies that were correctly flagged.
- Higher recall means fewer missed events.

### F1

- Harmonic mean of precision and recall.
- Balanced summary when both false positives and false negatives matter.

### AUROC Proxy

- Ranking quality indicator for anomaly scores.
- Higher values indicate better separation between anomaly and normal behavior.

## Calibration Reliability

- Compare average confidence against observed error per confidence bucket.
- Good calibration means confidence reflects realized performance.
- Large confidence-error gaps suggest overconfidence or underconfidence.

## Composite Score

- Aggregates quality and latency behavior.
- Used for leaderboard ranking and policy signal in optimization and market modules.
- Should be interpreted together with raw metrics, not in isolation.

## Ablation Deltas

- Positive error deltas after feature removal indicate those features were informative.
- Strong degradation under weather ablation suggests weather sensitivity.
- Strong degradation under temporal ablation suggests time-pattern dependence.
- Strong degradation under occupancy ablation suggests usage-profile dependence.

## Stress Test Summary

- `mostRobustModel`: best stability across scenarios.
- `averageForecastMae`: mean predictive error across stressed settings.
- `maxScenarioDriftPct`: worst-case behavior shift.
- `robustnessScore`: compact stability indicator; higher is better.

## Optimization Metrics

- `selfSufficiencyScore`: higher means less external dependency.
- `gridDependencyPct`: lower means stronger local balancing.
- `batteryCycleUtilizationPct`: operational intensity of storage usage.
- `projectedCostInr`: economic objective under selected policy.
- `projectedCarbonSavedKg`: sustainability proxy from local energy use.

## Market Metrics

- `totalMatchedKwh`: useful local energy exchanged through AI matching.
- `totalUnmatchedDemandKwh`: residual demand not matched peer-to-peer.
- `averageClearingPrice`: market outcome for participants.
- `dualRoleHouseholds`: evidence that participants can switch buyer/seller roles by time.
- `marketConfidence`: confidence proxy combining matching success and anomaly reliability signal.

## Reviewer Checklist

- Verify deterministic replay under fixed seed.
- Compare top-ranked models against raw MAE/RMSE/MAPE and anomaly metrics.
- Check calibration and ablation evidence before trusting recommendations.
- Confirm policy rationale aligns with ranking signal.
- Confirm dual-role evidence in market panel for buyer-seller switching behavior.