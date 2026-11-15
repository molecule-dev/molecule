/**
 * Wiring for the optional `@molecule/app-charts` bond.
 *
 * Its own module + subpath export so a bundler only resolves these providers when
 * an app actually imports them — see `./realtime-socketio.js` for the full
 * rationale.
 *
 * @module
 */

/**
 * Wires `@molecule/app-charts-chartjs` (Chart.js) to `@molecule/app-charts` — real
 * line/bar/pie/etc. charts instead of the core's placeholder panel.
 */
export async function setupAppChartsChartjs(): Promise<void> {
  const [{ setProvider: setCharts }, { provider }] = await Promise.all([
    import('@molecule/app-charts'),
    import('@molecule/app-charts-chartjs'),
  ])
  setCharts(provider)
}
