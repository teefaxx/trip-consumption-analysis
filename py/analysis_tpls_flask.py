from datetime import datetime

import numpy as np
import pandas as pd
import geopandas as gpd

from shapely.geometry import LineString

##################################################################


def toDateTime(timestring):
    """ Takes in timestring in specified formate and returns datetime object """
    return datetime.strptime(timestring, "%a, %d %b %Y %H:%M:%S %Z")


def dfToTime(df_in):
    """ Turns every timestring in dataframe into datetime object """
    for index, row in df_in.iterrows():
        row['time'] = df_in._set_value(index, 'time', toDateTime(row['time']))
    return df_in


def read_data(in_list):
    """
    Transforms WGS 84 to LV95, drops trackpoints with accuracy > 500 m, drops duplicates

    RETURNS: List with shapely LineStrings
    """
    df = pd.DataFrame(
        in_list, columns=['usr', 'mtype', 'time', 'lat', 'lon', 'acc'])
    df['usr'] = df['usr'].astype(int)

    data = dfToTime(df)

    data = gpd.GeoDataFrame(
        data, crs=4326, geometry=gpd.points_from_xy(data.lon, data.lat))

    # data = pd.DataFrame(data) #Back to Pandas DF
    data = data.loc[data.acc < 500]

    # Column 'acc' maybe used later...
    data = data.drop(['lat', 'lon'], axis=1)

    data.drop_duplicates(inplace=True, ignore_index=True)

    data = data.to_crs(2056)

    return data[['usr', 'mtype', 'time', 'geometry', 'acc']].values.tolist()


############################ CREATING TRIPLEGS ################################


def get_tripleg_geometry_from_points(list_of_points):
    """
    Transforms a list of loints to LineString

    RETURNS: Shapely LineString

    (From LAB 10)
    """

    # If tripleg invalid, leave the loop. At least two points.
    if len(list_of_points) < 2:
        return None
    coords = [(point.x, point.y) for point in list_of_points]
    return LineString(coords)


def getDistance(current, next):
    """
    NOT NEEDED
    """
    dist = current.distance(next)
    if dist < 500:
        return True
    else:
        return False


def createTriplegs(in_list):
    """
    Creates triplegs from a list of points

    RETURNS: GeoDataFrame with shapely LineString

    (Inspired by LAB 10)

    """
    trackpoints_list = in_list
    n = len(trackpoints_list)
    tripleg_list = []
    i = 0
    current_mode = trackpoints_list[0][1]
    user = trackpoints_list[0][0]
    start_time = trackpoints_list[0][2]
    end_time = start_time

    # Iterate over all trackpoints
    while (i < (n-2)):
        tmp_list = []

        # Check if current mode is the same as the next, if not next tripleg is created
        while i < (n-2) and trackpoints_list[i][1] == current_mode:
            tripleg_geometry = trackpoints_list[i][3]
            end_time = trackpoints_list[i][2]
            tmp_list.append(tripleg_geometry)
            i += 1
        i += 1

        tripleg_list.append([user, current_mode, start_time,
                            end_time, get_tripleg_geometry_from_points(tmp_list)])
        current_mode = trackpoints_list[i][1]
        user = trackpoints_list[i][0]
        start_time = trackpoints_list[i][2]

    tripleg_gdf = pd.DataFrame(tripleg_list, columns=[
                               'user_id', 'mtype', 'start', 'end', 'geometry'])
    tripleg_gdf = gpd.GeoDataFrame(
        tripleg_gdf, geometry=tripleg_gdf.geometry, crs=2056)

    return tripleg_gdf


def doesStuff(tripleg_gdf):
    """ 
    RETURNS: DataFrame with with all columns from tripleg_gdf + 'RH' column

    """

    def toTime(date_in):
        """
        Converts date to hour of the day 
        """
        return date_in.time()

    for index, row in tripleg_gdf.iterrows():
        tripleg_gdf._set_value(index, 'occ_time', toTime(row['start']))

    def categorise(index):
        """
        Catergorizes each tripleg if it was done during Rushhour (RH) or not

        RETURNS: Boolean

        """

        ### RUSHHOUR TIMES ####
        mor = datetime(2000, 1, 1, 7, 0, 0)
        mor = mor.time()

        mid = datetime(2000, 1, 1, 10, 0, 0)
        mid = mid.time()

        eve = datetime(2000, 1, 1, 16, 30, 0)
        eve = eve.time()

        late = datetime(2000, 1, 1, 19, 30, 0)
        late = late.time()

        ############################

        if tripleg_gdf.occ_time[index] > mor or tripleg_gdf.occ_time[index] < mid:
            return True
        elif tripleg_gdf.occ_time[index] > eve or tripleg_gdf.occ_time[index] < late:
            return True
        else:
            return False

    for index, row in tripleg_gdf.iterrows():
        tripleg_gdf._set_value(index, 'RH', categorise(index))

    return tripleg_gdf


def condition(df_in):
    """
    Assigns Mobitool data to row (Rushhour occupancy or normal occupancy)

    RETURNS: DataFrame with with all columns from df_in + 'MJ/pkm' and 'CO2/pkm'

    """
    conditions = [
        (df_in['mtype'] == 1),  # Car
        (df_in['mtype'] == 2) & (df_in['RH'] == True),  # Train RH
        (df_in['mtype'] == 2) & (df_in['RH'] == False),  # Train Norm
        (df_in['mtype'] == 4) & (df_in['RH'] == True),  # Tram RH
        (df_in['mtype'] == 4) & (df_in['RH'] == False),  # Tram Norm
        (df_in['mtype'] == 3) & (df_in['RH'] == True),  # Bus RH
        (df_in['mtype'] == 3) & (df_in['RH'] == False),  # Bus Norm
        (df_in['mtype'] == 5),  # E-Bike
        (df_in['mtype'] == 6)  # Foot / Neutral
    ]

    values_MJ = [3.2, 0.22, 0.51, 0.50, 1.18, 0.82, 1.79, 0.45, 0.0]
    values_CO2 = [0.19, 0.003, 0.007, 0.007, 0.016, 0.016, 0.037, 0.024, 0.0]

    df_in['MJ/pkm'] = np.select(conditions, values_MJ)
    df_in['CO2/pkm'] = np.select(conditions, values_CO2)

    return df_in


def multiplicator(df_in):
    """
    Calculates energy consumption and CO2 emissions per km

    RETURNS: DataFrame with all columns from df_in + 'tot_MJ' and 'tot_C02'

    """

    length = df_in.geometry.length

    mj = df_in['MJ/pkm']
    co2 = df_in['CO2/pkm']

    #x = round(length / 1000 * value,3)

    df_in['tot_MJ'] = round((length / 1000) * mj, 3)
    df_in['tot_C02'] = round((length / 1000) * co2, 3)

    df_out = df_in.drop(df_in.columns[[7, 8]], axis=1)

    return df_out


def returnDF(df_in):
    """
    RETURNS: DataFrame with all calculations needed for trip analysis

    """
    df_tps = createTriplegs(df_in)
    df_RH = doesStuff(df_tps)
    df_condition = condition(df_RH)
    df_values = multiplicator(df_condition)

    return df_values

