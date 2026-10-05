# @molecule/api-geolocation-photon

## 1.1.0

### Minor Changes

- c641785: New bond: Photon, the open-source OpenStreetMap geocoder, as a `GeolocationProvider` — geocode, reverse geocode, Haversine distance and search-as-you-type autocomplete against any Photon instance (`PHOTON_BASE_URL` defaults to the low-volume public instance; self-host for production). Serves an OSM extract, so coverage is the loaded region and out-of-region queries return an empty array; results require "© OpenStreetMap contributors" attribution.
