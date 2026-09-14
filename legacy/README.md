# Legacy app (2022–2023)

This folder holds the original course-project version of the app exactly as it was: three static HTML pages with jQuery and Leaflet, and a Flask/GeoPandas backend writing to a PostGIS database. It is kept for reference and for the one-off data migration described in `../docs/modernization-plan.md`. It is not built or deployed.

The database credentials in `py/importToDB.py` are placeholders; the real ones were never committed.

Known bugs in this version are listed in section 0 of `../docs/modernization-plan.md`.
