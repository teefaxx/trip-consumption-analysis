from flask import Flask, render_template, request
from flask import Flask, jsonify, request, after_this_request
import json
from flask_cors import CORS, cross_origin

from exportFromDB import *
from importToDB import *
from analysis_tpls_flask import *


app = Flask(__name__)
CORS(app)


def toJSON(json_string):
    # Convert the JSON string to a dictionary
    dict = json.loads(json_string)
    id = dict['id']
    date = dict['date']

    return id, date


@app.route('/feedback', methods=['POST', 'GET'])
def posting():
    if request.method == "POST":
        data = request.data.decode("utf-8")
        user_id, date = toJSON(data)

        date = toDateTime(date).date()
        date = date.strftime("%Y-%m-%d")

        print(type(date), date)

        df_json = createJSON(query(user_id, date))
        # print(df_json)

        df = emissions(query(user_id, date))
        # print(df)

        response = jsonify(user_id)
        response.headers.add('Access-Control-Allow-Origin', '*')

    return(jsonify(df, df_json))


@app.route('/tp', methods=['POST', 'GET', 'OPTIONS'])
def sendData():
    if request.method == "POST":
        data = request.data.decode("utf-8")
        tp = json.loads(data)

        df = read_data(tp)

        df_tps = createTriplegs(df)
        df_RH = doesStuff(df_tps)
        df_values = condition(df_RH)
        df_back = multiplicator(df_values)
        df_DB = insert_df(df_back)

        #print(df_tps, type(df_tps))
        print(type(df_DB))
        print()
        print()
        print(df_DB)

        response = jsonify(df_DB)
        response.headers.add('Access-Control-Allow-Origin', '*')
        response.headers['Access-Control-Allow-Origin'] = 'http://127.0.0.1:5500'
        response.headers['Access-Control-Allow-Methods'] = 'GET, POST, OPTIONS'
        response.headers['Access-Control-Allow-Headers'] = 'Content-Type'
    return jsonify('Data successfully submitted to Database!')


@app.route('/send', methods=['OPTIONS'])
def send_options():
    response = None
    response.headers['Access-Control-Allow-Origin'] = 'http://127.0.0.1:5500'
    response.headers['Access-Control-Allow-Methods'] = 'GET, POST, OPTIONS'
    response.headers['Access-Control-Allow-Headers'] = 'Content-Type'
    return response


def toInt(site_string):
    user_id = int(site_string)
    print(type(user_id), user_id+1)
    return user_id


if __name__ == '__main__':
    # run
    app.run(debug=True, host='localhost', port=8989)
