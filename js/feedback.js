// SOME VARIABLES
const map = L.map('map');
let emissions = null;
let traj = null;


// PICKING TODAY'S DATE 
document.getElementById('trip-date').valueAsDate = new Date();


function feedback() {
  /*
  Database query with parameters: date and user id
  
  RETURNS Dict:
    - Total MJ
    - Total CO2
    - Total km travelled
    - JSON with geometries (LineString and Modetype)
  */

  var dateVar = new Date($("#trip-date").val());
  var date = dateVar.toUTCString();
  var user_id = $("#user-id-select-fb").val();


  let data = {
    id: user_id,
    date: date,
  };



  $.ajax({
    type: 'POST',
    url: 'http://localhost:8989/feedback',
    contentType: 'application/json;charset=UTF-8',
    dataType: 'json',
    success: function (data) {
      emissions = data
      mj = emissions[0][0];
      co2 = emissions[0][1];
      km = emissions[0][2];
      hours = emissions[0][3][0]
      minutes = emissions[0][3][1]
      sec = emissions[0][3][2]

      // Returned Data from database
      document.getElementById("mj").innerHTML = `${mj} mJ`
      document.getElementById("co2").innerHTML = `${co2} kg`
      document.getElementById("km").innerHTML = `${km} km`

      if (hours > 0) {
        document.getElementById("time").innerHTML = `${hours} Hours and ${emissions[0][3][1]} Minutes`;
      }
      else {
        document.getElementById("time").innerHTML = `${minutes} Minutes and ${sec} Seconds`;
      }

      // DOM-Manipulation for summary-text
      document.getElementById("return-text").innerHTML = `The energy used for your trips, ${mj} MegaJoules, is enough to power a lightbulb for ${Math.round((mj * Math.pow(10, 6) / 86400) / 60)} days. The CO2 footprint of your trips, ${co2} grams, can be absorbed by a growing tree for ${Math.round((co2 * 1000) / 136.9)} day(s).`
      traj = JSON.parse(emissions[1])

      // Setting view depending on trajectory
      let newView = traj.features[0].geometry.coordinates[0]
      map.setView([newView[1], newView[0]], 10)

      L.geoJSON(traj, {
        style: function (feature) {
          //console.log(feature.properties.mode_type_id);
          //console.log(traj.features[0].geometry.coordinates[0])
          switch (feature.properties.mode_type_id) {
            case 1: return { color: '#000000' };
            case 2: return { color: '#FF0000' };
            case 3: return { color: '#0000CC' };
            case 4: return { color: '#0080FF' };
            case 5: return { color: '#6600CC' };
            case 6: return { color: '#0B8658' };
          }
        }
      }).addTo(map);
    },
    data: JSON.stringify(data)
  });
}




$('#user_id_select-fb').change(function () {
  /*
  DOM Manipulation of "Daily Energy Consumption Table"
  */

  document.getElementById("km-travelled").innerHTML = emissions[0];
  document.getElementById("energy-consumption").innerHTML = emissions[1];
  document.getElementById("energy-consumption-per-km").innerHTML = emissions[2];
})




function onload() {
  /*
  For Leaflet tilelayer
  */

  L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
    maxZoom: 19,
    attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
  }).addTo(map);
  map.setView([47.3719779865722, 8.543945277556965], 8);
}
