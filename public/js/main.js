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

/*
map.on('click', function(evt) {
    checkLandmark(evt);
});*/

function addPin(pinLat, pinLng) {
    console.log("adding pin")
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
console.log("map: "+map)
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
                  color: 'red',
                  width: 1
                }),
                fill: new ol.style.Fill({
                    color: 'transparent'
                })
              });    
            selectedFeatures[0].setStyle(styleNotFound);                      
            console.log("name === landmark")
            socket.emit("player found landmark", landmark);
        }
    }    
}

function drawLandmark(icon, coordinates) {
    console.log("coordinates "+coordinates)
    addPin(coordinates[1],coordinates[0]);
    $(".leaderboard--sites-found").append(`<img src='./images/icon-${icon}.png'>`)
    console.log("foujnd")
}


/*
$.getJSON( "../data/map.geojson", function( data ) {
    $.each(data, function(key, value) {
        var features = data["features"];
        for(j=0; j<features.length; j++) {
            console.log(JSON.stringify(features[j]))
            if(features[j].properties.Landmark === "Big Ben") {
                var area = [];
                var coordinates = data.features[0].geometry.coordinates[0];
                for(i=0; i<coordinates.length; i++) {
                    var coordinate = coordinates[i];
                    area.push(coordinate);
                }
                var polygon = new ol.geom.Polygon([area]);
                polygon.transform('EPSG:4326', 'EPSG:3857');
                var feature = new ol.Feature(polygon);
                
                // Create vector source and the feature to it.
                var vectorSource = new ol.source.Vector();
                vectorSource.addFeature(feature);
                
                // Create vector layer attached to the vector source.
                var vectorLayer = new ol.layer.Vector({
                  source: vectorSource,
                });                
                var styleNotFound = new ol.style.Style({
                    stroke: new ol.style.Stroke({
                      color: 'transparent',
                      width: 1
                    }),
                    fill: new ol.style.Fill({
                        color: 'transparent'
                    })
                  });

                var styleFound = new ol.style.Style({
                    stroke: new ol.style.Stroke({
                      color: 'red',
                      width: 1
                    }),
                    fill: new ol.style.Fill({
                        color: 'transparent'
                    })
                  });                  

                feature.setStyle(styleNotFound);
                feature.setProperties({"name":"Big Ben"})

                // Add the vector layer to the map.
                map.addLayer(vectorLayer);

                var selectClick = new ol.interaction.Select({
                    condition: ol.events.condition.click,
                  });
                  map.addInteraction(selectClick);
                  selectClick.on('select', function(e) {
                      console.log(e)
                      if(e != null) {
                        var selectedFeatures = e.target.getFeatures().getArray();
                        if(selectedFeatures.length > 0) {
                            if(selectedFeatures[0].values_.name === "Big Ben") {
                                selectedFeatures[0].setStyle(styleFound);
                            }
                        }
                      }
                  });
                                    
            }
        }
    });
});
*/

function addToLeaderBoard(players) {
    console.log("players="+JSON.stringify(players))
    console.log(players)
    players.sort((a, b) => (a.landmarks < b.landmarks) ? 1 : -1)
    console.log(players)
    console.log(players[0].landmarks)
    console.log(players[1].landmarks)
    $.each(players, function(key, player) {
        //console.log("player "+JSON.stringify(player))
        $.each(player, function(key, value){
            //console.log(key)
            //console.log(JSON.stringify(value))
            if(key === "username") {
                var name = value;
                if($(`#leaderboard-${name}`).length===0) {
                    $(".leaderboard").append(`<div id="leaderboard-${name}" class="leaderboard--contestant row"><div class="col-4 my-auto"><h4 class="contestant-name">${name}</h4></div><div class="col-8 leaderboard--sites-found"></div></div>`);
                } 
            }       
        });
    });

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
})