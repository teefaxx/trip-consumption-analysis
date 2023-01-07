from sqlalchemy import create_engine
import geopandas as gpd

from importToDB import *

import fiona
from shapely.geometry import shape, mapping

import os


################ DB CREDENTIALS (from LAB 02) ################
create_string = f"postgresql://{db_credentials['user']}:{db_credentials['password']}@{db_credentials['host']}:{db_credentials['port']}/{db_credentials['dbname']}"
print("Create string for sqlalchemy engine:", create_string)
engine = create_engine(create_string)


################ CODE ################


def query(user_id, date):
    """
    Query in database

    PARAMS: 
        - user_id: 1-4 (int)
        - date: "YYYY-MM-DD" format

    RETURNS: DataFrame from query
    """
    df_out = gpd.read_postgis(
        "SELECT * FROM tripleg WHERE date='"+date+"' AND user_id ="+str(user_id), engine, geom_col="geometry")
    return df_out


# Count the trips done on date
def tripsToday(df_in):
    """ 
    NOT USED

    Conunts total trip on specific date 

    """
    tripcount = 1
    tmp_trip = df_in.trip_id[0]
    for index, row in df_in.iterrows():
        if row['trip_id'] != tmp_trip:
            tripcount += 1
            tmp_trip = df_in.trip_id[index]
        else:
            pass
    return tripcount


def geomList(df_in):
    """
    Creates a list with shapely geometry and modetype

    RETURNS: List
    """
    geo_list = [[], []]

    for index, row in df_in.iterrows():
        geo_list[0].append(row['geometry'])
        geo_list[1].append(row['mode_type_id'])

    return geo_list


def createJSON(df_in):
    """
    Creates JSON from GeoDataFrame

    RETURNS: JSON
    """
    df_in.crs = "EPSG:2056"
    df_out = df_in.to_crs(epsg=4326)
    df_out = df_out[['mode_type_id', 'geometry']]
    json_out = df_out.to_json(drop_id=True, show_bbox=False)
    return json_out


def createShape(path, date, geom_list):
    """
    Not used
    """

    # Checks if .shp file already exists
    if os.path.exists(path):
        print('File already exists')
    else:
        # create a new shapefile
        schema = {'geometry': 'LineString',
                  'properties': {'id': 'int', 'mtype': 'int'}}
        with fiona.open('../local_data/SHP/SHP_Export_'+str(user_id) +
                        '_'+str(date)+'.shp', 'w', 'ESRI Shapefile', schema) as c:
            # add the geometries to the shapefile
            for i in range(len(geom_list[0])):
                c.write({
                    'geometry': mapping(geom_list[0][i]),
                    'properties': {'id': i, 'mtype': geom_list[1][i]},
                })
        print("Created ShapeFile successfully")


# Returns total emissions and total km traveled on date
def emissions(df_in):
    """
    RETURNS: Total emissions and total km traveled on date
    """
    df_len = len(df_in)-1
    mj = round(df_in['tot_mj'].sum(), 2)
    co2 = round(df_in['tot_co2'].sum(), 2)
    total_km = round(df_in.geometry.length.sum() / 1000, 2)

    s_time = df_in['start_time'][0]
    e_time = df_in['end_time'][df_len]
    tot_time = e_time - s_time
    total_seconds = tot_time.total_seconds()
    hours = int(total_seconds // 3600)
    minutes = int((total_seconds % 3600) // 60)
    seconds = int(total_seconds % 60)
    # print(f'{hours}:{minutes}:{seconds}')

    return mj, co2, total_km, [hours, minutes, seconds]
