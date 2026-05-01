# @molecule/app-hero-metric-card-react

React hero metric card primitives for the top of dashboards.

Exports:
- `<HeroMetricCard>` — large-format hero card with title / value / unit / trend / progress-ring slot.
- `<HeroMetricTrendChip>` — directional ▲/▼ + delta chip used inside the card.
- Type aliases: `HeroMetricCardProps`, `HeroMetricTrend`, `HeroMetricTrendDirection`, `HeroMetricAccent`.

Replaces the bespoke `*HeroCard` components found across flagship dashboards (CalorieRingCard, TodayHeroCard, MoodHeroCard, SleepScoreHeroCard, PetSnapshotHero, NextAppointmentCard, WorkoutHeroCard, VitalsHeroCard, …) with a single composable primitive.

## Type
`feature`

## Installation
```bash
npm install @molecule/app-hero-metric-card-react
```

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/app-i18n` ^1.0.0
- `@molecule/app-react` ^1.0.0
- `@molecule/app-ui` ^1.0.0
- `@molecule/app-ui-react` ^1.0.0
- `react` ^18.0.0 || ^19.0.0
