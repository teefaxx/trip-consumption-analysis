import psycopg2
from psycopg2.extensions import AsIs

# Import the Json adapter
from psycopg2.extras import Json

from analysis_tpls_flask import *

################ DB CREDENTIALS ################
db_credentials = {"dbname": 'database name',
                  "port": 'port',
                  "user": 'user',
                  "password": 'password',
                  "host": 'host'}


def count_items(tablename, dbname, port, user, password, host):
    """
    count all items in a database

    (From LAB 02)
    """

    conn = psycopg2.connect(dbname=dbname, port=port,
                            user=user, password=password, host=host)
    cur = conn.cursor()
    cur.execute("select count(*) from %s", (AsIs(tablename),))
    conn.commit()

    results = cur.fetchall()
    conn.close()

    return results


def insertPKTripCount(trip_id_count):
    """
    Increases primary key of "trip_id" in database
    """

    # ESTABLISH DB CONNECTION
    conn = psycopg2.connect(**db_credentials)
    cur = conn.cursor()

    # CREATE NEW TRIP_ID
    count = cur.mogrify(
        "INSERT INTO trip(trip_id) VALUES (%s)", [trip_id_count])
    cur.execute(count)

    # COMMIT AND CLOSE CONNECTION
    conn.commit()
    cur.close()


def insert_df(df_in):
    """
    Submit analyzed data to database

    RETURNS: String (If successfully submitted to database)

    """
    trip_id_count = count_items("trip", **db_credentials)[0][0] + 1

    # INSERT PK "trip_id":
    insertPKTripCount(trip_id_count)

    # ESTABLISH DB CONNECTION
    conn = psycopg2.connect(**db_credentials)
    cur = conn.cursor()

    # INSERT TO DB
    for key, data in df_in.iterrows():
        current = cur.mogrify("INSERT INTO tripleg(user_id, mode_type_id, trip_id, tot_mj, tot_co2, start_time, date, end_time, geometry) VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s)",
                              (data['user_id'], data['mtype'], trip_id_count, data['tot_MJ'], data['tot_C02'], data['start'], data['start'], data['end'], Json(data['geometry'].__geo_interface__)))
        cur.execute(current)

    # COMMIT AND CLOSE CONNECTION
    conn.commit()
    conn.close()

    return ('Data sucessfully submitted to Database!')


if __name__ == "__main__":
    """
    None
    """
