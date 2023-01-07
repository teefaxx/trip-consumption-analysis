# README - Trip Consumption Analysis

This project which was completed as part of the course ”Geoinformationstechnologien und -analysen” at ETH Zürich.
Contributers to the project:

* Dario De Luca
* Luca Dominiak
* Leonard Haas
* Raúl Lara

### Folder Structure

```
.
├── index.html
├── feedback.html
├── about.html
├── README.md
├── py/
│   ├── analysis_tpls_flask.py
│   ├── app.py
│   ├── exportFromDB.py
│   └── importToDB.py
├── js/
│   ├── feedback.js
│   ├── jquery-ui.min.js
│   └── main.js
└── css/
    ├── containers.css
    ├── drop-down.css
    ├── drop-up.css
    ├── feedbackpage.css
    ├── about.css
    ├── jquery-ui.min.css
    ├── jquery-ui.structure.min.css
    ├── jquery-ui.theme.min.css
    └── main.css
```

## Users

The following table shows the users and their user_id:

| user_id | name |
|---|---|
| 1 | Dario|
| 2 | Luca |
| 3 | Leo |
| 4 | Raúl |

## Data

All the data has been processed and stored in our database. However we haven't found a way to give public access to the database.

## Python

#### analysis_tpls_flask.py

This file contains functions for reading data from a list of points. The `read_data` function takes in a list of points and transforms it into a GeoDataFrame with specified coordinates, removes trackpoints with accuracy over 500 meters, and removes duplicates. The `createTriplegs` function takes in a list of points and creates triplegs. The `calcTriplegs` function calculates the total distance and emissions for each tripleg in a list and returns a list of dictionaries containing the tripleg's user, mode of transportation, start time, end time, distance, and emissions data.

#### exportFromDB.py

This file contains functions to interact with the database using geopandas, and for creating and exporting shapefiles using Fiona and Shapely. The `query` function retrieves data from the database for a specific user and date, and returns a GeoDataFrame. The `geomList` function creates a list of shapely geometries and mode types from a GeoDataFrame. The `emissions` function calculates the total emissions and distance traveled for a GeoDataFrame.

#### importToDB.py

This file contains functions to interact with the database. The `count_items` function returns the number of items in a specified table. The `insertPKTripCount` function increases the primary key of the `trip_id` column in the `trip` table. The `insert_df` function takes a DataFrame as input and inserts its contents into the `tripleg` table in the database.

#### app.py

This is file contains functions to run Python Flask. The app has two routes: '/feedback', '/.
'/feedback' is a POST route that takes in JSON data, converts it to a dictionary, and returns a DataFrame. '/tp' is a POST route that takes in JSON data, processes it, and inserts the resulting dataframe into the database.

## JavaScript

#### feedback.js

This file contains functions to retreive data from the database and display them on the website.

#### main.js

This file contains functions to track the user's location, displaying the current location and saving the gathered information to the database.

## CSS

#### containers.css

This file defines the styling and layout of containers for buttons, top-container, stats, and dropdown-user.

#### drop-down.css

Thisfile defines the styling and layout of the dropdown menu and the "Go to feedback Page" button.

#### drop-up.css

This file defines the styling and layout of the dropup menu: "start" and "switch mode".

#### feedbackpage.css

This file defines the styling and  layout of the feedback page.

#### about.css

This file defines the styling and layout of the about page.

#### main.css

This file defines the styling and layout of the body, headings, etc. It also defines the styling for the tracking icon for different states ("go" and "stop").
