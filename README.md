# Trip Consumption Analysis

A small web app for tracking personal trips (GPS-based) and estimating the distance and CO₂ emissions per transport mode. Built as a course project for "Geoinformationstechnologien und -analysen" at ETH Zürich.

## How it works

- **Frontend** (`index.html`, `feedback.html`, `about.html`, `js/`, `css/`): a Leaflet-based map tracks the user's location and lets them tag trip legs with a transport mode; a feedback page visualizes past trips and stats.
- **Backend** (`py/`): a Flask API receives tracked points, reconstructs trip legs with GeoPandas/Shapely, and stores/queries them in a PostgreSQL/PostGIS database.
- Emissions are estimated per tripleg from distance and mode of transport.

## Stack

Leaflet, jQuery · Python, Flask · GeoPandas, Shapely, Fiona · PostgreSQL/PostGIS

## Status

This was a fixed-scope student project and is not actively maintained. The database is not publicly hosted, so the backend isn't runnable out of the box without your own PostGIS instance and credentials in `py/importToDB.py`.

## Contributors

Dario De Luca, Luca Dominiak, Leonard Haas, Raúl Lara

## License

See [LICENSE](LICENSE).
