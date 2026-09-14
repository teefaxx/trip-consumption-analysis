/* ########## INSPIRED BY "LAB 07 & 08" FROM EXERCISE ########## */

// Some Variables
let map;
let track_bool = false; // Check if app is tracking (Default=False)

//Clears Local Storage with every relaod
localStorage.clear();


/* ########## Dictionaries to store collected data ########## */
// Map Settings
let appState = {
	markers: null,
	latLng: null,
	radius: null,
};

//Track State
let trackState = {
	latLng: null,
	accuracy: null,
}

// Trip Information
let trip_dict = {
	user_id: null, //user id (from Name Selector)
	mode_type: null, // set in start_trip() or switch_mode()
	time: Date.now(), // current Time in ms
};

// Tracking Text
let track_dict = {
	car: 1,
	train: 2,
	bus: 3,
	tram: 4,
	bike: 5,
	neutral: 6
}


/*########## TRACK ICON ##########

Used in start_trip() and switch_mode()

*/

/* ####### DROP-DOWN NAME MANIPULATION FOR EACH USER (Hardcode, please don't blame) ########### */

$('a#u1').click(function () {
	trip_dict.user_id = 1;
	drop_id = trip_dict.user_id
	document.getElementById("dropbtn-user").innerHTML = "Current user: Dario"
});

$('a#u2').click(function () {
	trip_dict.user_id = 2;
	drop_id = trip_dict.user_id
	document.getElementById("dropbtn-user").innerHTML = "Current user: Luca";
});

$('a#u3').click(function () {
	trip_dict.user_id = 3;
	drop_id = trip_dict.user_id
	document.getElementById("dropbtn-user").innerHTML = "Current user: Leo";
});

$('a#u4').click(function () {
	trip_dict.user_id = 4;
	drop_id = trip_dict.user_id
	document.getElementById("dropbtn-user").innerHTML = "Current user: Raúl";
});



function drawMarkers() {
	/*
	Draw marker on map
	*/
	if (map && appState.markers && appState.latLng && appState.radius) {
		appState.markers.clearLayers();
		let circle = L.circle(appState.latLng, {
			radius: appState.radius
		});
		appState.markers.addLayer(circle);
	}
}


/* ############# START TRIP ####################*/
function start_trip() {
	/*
	Start trip and start tracking
	*/
	if ("geolocation" in navigator) {
		start_bool = true;
		document.getElementById('track-icon').beginElement(); // Track-icon starts blinking
		navigator.geolocation.watchPosition(startSuccess, geoError, geoOptions);
	} else {
		errMsg.text(errMsg.text() + "Geolocation is leider auf diesem Gerät nicht verfügbar. ");
		errMsg.show();
	}
}

/* ############# SWITCH MODE ####################*/

function switch_mode() {
	/*
	Same as "start_trip()"
	*/
	if ("geolocation" in navigator) {
		document.getElementById('track-icon').beginElement(); // Track-icon starts blinking
		navigator.geolocation.watchPosition(startSuccess, geoError, geoOptions);
	}

}

/* ##########  SUCCESS FUNCTION "watchPosition()" ##########*/
function startSuccess(position) {
	/*
	Saves "trip_dict" information in localStorage 
	*/
	if (track_bool) {
		let usr = trip_dict.user_id;
		let lat = position.coords.latitude;
		let lon = position.coords.longitude;
		let acc = position.coords.accuracy;
		let time = new Date().toUTCString();
		let mtype = trip_dict.mode_type;

		if ('trackpoints' in localStorage) {
			let list = JSON.parse(localStorage['trackpoints']);
			list.push([usr, mtype, time, lat, lon, acc]);
			localStorage['trackpoints'] = JSON.stringify(list);
		} else {
			localStorage["trackpoints"] = JSON.stringify([[usr, mtype, time, lat, lon, acc]])
		}
	}
}

/* ########## START TRIP on click ########## */

$('a#start-car').click(function () {
	track_bool = true;
	trip_dict.mode_type = 1;
	document.getElementById('track-text').innerHTML = 'Car'
	start_trip();
});

$('a#start-train').click(function () {
	track_bool = true;
	trip_dict.mode_type = 2;
	document.getElementById('track-text').innerHTML = 'Train'
	start_trip();
});

$('a#start-tram').click(function () {
	track_bool = true;
	trip_dict.mode_type = 3;
	document.getElementById('track-text').innerHTML = 'Bus'
	start_trip();
});

$('a#start-bus').click(function () {
	track_bool = true;
	trip_dict.mode_type = 4;
	document.getElementById('track-text').innerHTML = 'Tram'
	start_trip();
});

$('a#start-bike').click(function () {
	track_bool = true;
	trip_dict.mode_type = 5;
	document.getElementById('track-text').innerHTML = 'Bike'
	start_trip();
});

$('a#start-neutral').click(function () {
	track_bool = true;
	trip_dict.mode_type = 6;
	document.getElementById('track-text').innerHTML = 'CO&#8322 Neutral'
	start_trip();
});

/* ########## SWITCH MODE on click ########## */

$('a#switch-car').click(function () {
	track_bool = true;
	trip_dict.mode_type = 1;
	document.getElementById('track-text').innerHTML = 'Car'
	switch_mode();
});

$('a#switch-train').click(function () {
	track_bool = true;
	trip_dict.mode_type = 2;
	document.getElementById('track-text').innerHTML = 'Train'
	switch_mode();
});

$('a#switch-tram').click(function () {
	track_bool = true;
	trip_dict.mode_type = 3;
	document.getElementById('track-text').innerHTML = 'Bus'
	switch_mode();
});

$('a#switch-bus').click(function () {
	track_bool = true;
	trip_dict.mode_type = 4;
	document.getElementById('track-text').innerHTML = 'Tram'
	switch_mode();
});

$('a#switch-bike').click(function () {
	track_bool = true;
	trip_dict.mode_type = 5;
	document.getElementById('track-text').innerHTML = 'Bike'
	switch_mode();
});

$('a#switch-neutral').click(function () {
	track_bool = true;
	trip_dict.mode_type = 6;
	document.getElementById('track-text').innerHTML = 'CO&#8322 Neutral'
	switch_mode();
});

/* ########## END TRIP ########## */

$('button.dropbtn-end').click(function () {
	/*
	Ends trip and "POST" to Python Flask
	
	IMPORTANT: 
		- User has to be selected!
		- LocalStorage must no be empty!
		- Otherwise error due to parsing null property
	*/
	if (confirm("Do you want to end your trip?")) {
		track_bool = false;
		document.getElementById('track-icon').endElement();
		document.getElementById('track-text').innerHTML = 'NOT TRACKING'

		var tp = JSON.parse(localStorage['trackpoints']) //Trackpoints from localStorage

		$.ajax({
			type: 'POST',
			url: 'http://localhost:8989/tp',
			contentType: 'application/json;charset=UTF-8',
			dataType: 'json',
			success: function (tp) {
				window.alert(tp);
			},
			data: JSON.stringify(tp)
		});
	}
});


/**
 * Function to be called whenever a new position is available.
 * @param position The new position.
 */
function geoSuccess(position) {
	let lat = position.coords.latitude;
	let lng = position.coords.longitude;
	appState.latLng = L.latLng(lat, lng);
	appState.radius = position.coords.accuracy / 2;
	drawMarkers();

	if (map) {
		map.setView(appState.latLng, 16);
	}
}


/* ########## DOWNLOAD CSV-FILE ########## */
/*
Not used anymore with Python Flask


$('a#download_file').click(function () {
	var trackpoints_header = "usr;mtype;time;lat;lon;acc%0D%0A";
	let trackpoints_output = trackpoints_header;
	let trackpoints = JSON.parse(localStorage['trackpoints']);
	let i;
	for (i = 0; i < trackpoints.length; i += 5) {
		trackpoints_output = trackpoints_output + trackpoints[i][0] + ";" + trackpoints[i][1] + ";" + trackpoints[i][2] + ";" + trackpoints[i][3] + ";" + trackpoints[i][4] + ";" + trackpoints[i][5] + "%0D%0A";
	}
	this.href = "data:text/csv;charset=UTF-8," + trackpoints_output;
});
*/


/**
 * Function to be called if there is an error raised by the Geolocation API.
 * @param error Describing the error in more detail.
 */
function geoError(error) {
	let errMsg = $("#error-messages");
	errMsg.text(errMsg.text() + "Fehler beim Abfragen der Position (" + error.code + "): " + error.message + " ");
	errMsg.show();
}

let geoOptions = {
	enableHighAccuracy: true,
	maximumAge: 15000,  // The maximum age of a cached location (15 seconds).
	timeout: 12000   // A maximum of 12 seconds before timeout.
}

/* ########## ONLOAD FUNCTION ########## */

function onload() {
	let errMsg = $("#error-messages");

	if ("geolocation" in navigator) {
		navigator.geolocation.watchPosition(geoSuccess, geoError, geoOptions);
	} else {
		errMsg.text(errMsg.text() + "Geolocation is leider auf diesem Gerät nicht verfügbar. ");
		errMsg.show();
	}

	//Voyager Leaflet Map Layer
	map = L.map('map').setView([47.376750, 8.540721], 9);
	appState.markers = L.layerGroup();
	L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
		attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
	}).addTo(map);
	map.addLayer(appState.markers);

}
