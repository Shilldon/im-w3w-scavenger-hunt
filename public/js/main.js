//Define global current lat and lng for zoom control
var currentLng;
var currentLat;

//Base Layer with Open Street Maps
var baseMapLayer = new ol.layer.Tile({
  source: new ol.source.OSM()
});

//Construct the Map Object
var map = new ol.Map({
  target: 'map',
  featureEvents: true,  
  layers: [ baseMapLayer],
  view: new ol.View({
          center: ol.proj.fromLonLat([-0.124609, 51.500796]),
          zoom: 15 //Initial Zoom Level
        })
});

/*
var currZoom = map.getView().getZoom();
map.on('moveend', function(e) {
var newZoom = map.getView().getZoom();
if (currZoom != newZoom && currentLng != undefined) {
    currZoom = newZoom;
    map.getView().setCenter(ol.proj.fromLonLat([
        parseFloat(currentLng), parseFloat(currentLat)
    ]));    
}
});
*/

map.on('moveend', function(e) {
    var zoom = map.getView().getZoom();
    console.log("Zoom "+zoom)
})

function setZoom(zoom) {
    map.getView().setZoom(zoom);
}
function addPin(pinLat, pinLng) {
    //Set up an  Style for the marker note the image used for marker
    var iconStyle = new ol.style.Style({
        image: new ol.style.Icon(/** @type {module:ol/style/Icon~Options} */ ({
        anchor: [0.5, 0.5],
        anchorXUnits: 'fraction',
        anchorYUnits: 'fraction',
        src: 'images/map-pin-small.png',
        }))
    });


    //Adding a marker on the map
    var marker = new ol.Feature({
    geometry: new ol.geom.Point(
        ol.proj.fromLonLat([pinLng, pinLat])
    )
    });

    marker.setStyle(function(feature, resolution) {
        iconStyle.getImage().setScale(1/Math.pow(resolution, 1/6));
        return iconStyle;
    });
/*
    marker.setStyle(iconStyle);*/

    var vectorSource = new ol.source.Vector({
    features: [marker]
    });


    var markerVectorLayer = new ol.layer.Vector({
        source: vectorSource,
        style: function(feature, resolution) {
            iconStyle.getImage().setScale(1/Math.pow(resolution, 1/3));
            return iconStyle;
        }
    });
    // add style to Vector layer style map
    map.addLayer(markerVectorLayer);

}


function checkLandmarkClick(e, landmark) {
    var selectedFeatures = e.target.getFeatures().getArray();
    //console.log(selectedFeatures[0].values_.name)
    console.log("checking landmark")
    if(selectedFeatures.length > 0) {
        console.log("found featyres for "+selectedFeatures[0].values_.name )
        if(selectedFeatures[0].values_.name === landmark) {
            var styleNotFound = new ol.style.Style({
                stroke: new ol.style.Stroke({
                  color: 'transparent',
                  width: 1
                }),
                fill: new ol.style.Fill({
                    color: 'transparent'
                })
              });    
            selectedFeatures[0].setStyle(styleNotFound);  
            socket.emit("player found landmark", landmark);
        }
    }    
}

function drawLandmark(playerName, icon, coordinates, landmark) {
    console.log(playerName)
    $(".next-location").removeClass("d-none");
    $(".next-location").addClass("d-flex");
    addPin(coordinates[1],coordinates[0]);
    $(`#leaderboard-${playerName}`).find(".leaderboard--sites-found").append(`<img src='./images/icon-${icon}.png'>`);
    var landmarkLayer;
    map.getLayers().forEach(function (layer) {
        if (layer.get('name') != undefined & layer.get('name') === landmark+"_circle") {
            landmarkLayer = layer;
        }
    });
    map.removeLayer(landmarkLayer)    
    $(".modal-body").find("p").text(congratulationsText);
    $('#congratulations-modal').modal({
        show: true
    });
}


// We track coordinate change each time the mouse is moved
map.on('click', function(evt){
    var lonlat = ol.proj.transform(evt.coordinate, 'EPSG:3857', 'EPSG:4326');
    console.log(lonlat)
})

function updateLeaderBoard(players) {
    $(".leaderboard").find(".contestant").remove();
    console.log("addiong")
    players.sort((a, b) => (a.landmarks < b.landmarks) ? 1 : -1)
    $.each(players, function(key, player) {
        $.each(player, function(key, value){
            if(key === "username") {
                var name = value;
                $(".leaderboard").append(`<div id="leaderboard-${name}" class="leaderboard--contestant row contestant"><div class="col-4 my-auto"><h4 class="contestant-name">${name}</h4></div><div class="col-8 leaderboard--sites-found"></div></div>`);
            }       
        });
    });
}

function updateClues(clues) {
    $(".clues").removeClass("d-none");
    $(".clues").addClass("d-flex");

    $(".guesses").removeClass("d-none");
    $(".guesses").addClass("d-flex");

    $(".next-location").removeClass("d-flex");
    $(".next-location").addClass("d-none");    
    $(".location-hint").removeClass("d-flex");
    $(".location-hint").addClass("d-none");

    $("#hint-1").text(clues[0]);
    $("#hint-2").text(clues[1]);
    $("#hint-3").text(clues[2]);    
}

function showLocationHint(clue) {
    $(".clues").removeClass("d-flex");
    $(".clues").addClass("d-none");
    
    $(".guesses").removeClass("d-flex");
    $(".guesses").addClass("d-none");

    $(".location-hint").removeClass("d-none");
    $(".location-hint").addClass("d-flex");
    $("#location-hint-text").text(clue);
}

function sendMessage(message) {
    $(".message").show();
    $(".message").text(message);
    $(".message").delay(5000).fadeOut(1000);
}
$(document).ready(function() {
    $("input").on('keyup', function(e){
        if(e.keyCode === 13) {
            checkEntry();
        }
    });

    $(".guesses--submit-words").on("click", function() {
        checkEntry();
    });

    $(".logout-button").on("click", function() {
        socket.emit("remove player");
        console.log("logging out")
        $(".logout-form").submit();
    });

    $(".next-location").on("click", function() {
        socket.emit("next location");
    })
})