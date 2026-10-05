# @molecule/api-geolocation-molecule

## 1.1.0

### Minor Changes

- c641785: New bond: molecule.dev hosted geocoding — `geocode` and `reverseGeocode` billed to your molecule project (scope `broker:maps`, no maps-vendor account), served by molecule's self-hosted OpenStreetMap geocoder at zero upstream cost. Local pre-checks refuse oversized or out-of-range calls before any request; errors are `MoleculeServiceError` with `status` and `errorKey`.
