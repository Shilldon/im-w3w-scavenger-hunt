//
var currentLandmark = "";

function checkPasswordMatch(form) {
  var password1 = form.password1.value;
  var password2 = form.password2.value;
  if(password1 != password2) {
    $(".registration-error").text("Passwords do not match");
    password1.val('');
    password2.val('');
  }
  else {
    form.submit();
  }
}

//handle moving map to co-ordinates
function zoomTo(lat,lng) {
    //reset the map position to centre on co-ordinates passed
    map.getView().setCenter(ol.proj.fromLonLat([
        parseFloat(lng), parseFloat(lat)
    ]));
}

//take the words input and check against the W3w API. Return the co-ordinates if valid word combination
function checkEntry() {
    var firstWord = $("#what-1").val().toLowerCase();
    var secondWord = $("#what-2").val().toLowerCase();
    var thirdWord = $("#what-3").val().toLowerCase();
    console.log(firstWord+"."+secondWord+"."+thirdWord)
    what3words.api.convertToCoordinates(`${firstWord}.${secondWord}.${thirdWord}`).then(function(response) {
        console.log("[convertToCoordinates]", response);
        currentLat = response.coordinates.lat;
        currentLng = response.coordinates.lng;
        socket.emit("submit guess", firstWord+"."+secondWord+"."+thirdWord);
        zoomTo(currentLat, currentLng);
        //$(".guesses--words").val('');
    })
    .catch(function(error) { // catch errors here
        console.log("[code]", error.code);
        console.log("[message]", error.message);
        $("#error-modal").modal({
          show: true
        })
    });
}

/*
  function checkLandmark(evt) {
    var lonlat = ol.proj.transform(evt.coordinate, 'EPSG:3857', 'EPSG:4326');
    var lon = lonlat[0];
    var lat = lonlat[1];
    if(getDistanceBetween(lat, lon, currentLat, currentLng)) {
        socket.emit('found landmark', currentLat, currentLng);                  
    }    
  }*/

  function drawSearchArea(map, radius, landmark){

    var centerLongitudeLatitude = map.getView().getCenter();
    var layer = new ol.layer.Vector({
      source: new ol.source.Vector({
        projection: 'EPSG:4326',
        features: [new ol.Feature(new ol.geom.Circle(centerLongitudeLatitude, radius))]
      }),
      style: [
        new ol.style.Style({
          stroke: new ol.style.Stroke({
            color: 'blue',
            width: 3
          }),
          fill: new ol.style.Fill({
            color: 'rgba(0, 0, 255, 0.1)'
          })
        })
      ],
      name: landmark+"_circle"      
    });


    /*
    var selectClick = new ol.interaction.Select({
      condition: ol.events.condition.click,
    });

    console.log("adding circle interaction")
    map.addInteraction(selectClick);
    selectClick.on('select', function(e) {
        if(e != null) {
          checkLandmarkClick(e, landmark);
        }
    });    
*/
    console.log("layer ", layer);
    //onsole.log("layer features ", layer.getFeatures());
    console.log("source ", layer.getSource());
    console.log("source features ", layer.getSource().getFeatures());
/*
    layer.source.features[0].setStyle({
      stroke: new ol.style.Stroke({
        color: 'blue',
        width: 3
      }),
      fill: new ol.style.Fill({
        color: 'rgba(0, 0, 255, 0.1)'
      })
    });*/


    map.addLayer(layer);
}    

function drawLandmarkBounds(map, landmark) {
  var coordinates;
  currentLandmark = landmark;
  console.log("running landmark bounds")
  $.getJSON( "../data/map.geojson", function( data ) {
        var features = data["features"];
        for(j=0; j<features.length; j++) {
            console.log(JSON.stringify("j "+j,features[j]))
            if(features[j].properties.Landmark === landmark) {
                var area = [];
                var coordinates = data.features[j].geometry.coordinates[0];
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
                  name: landmark+"-layer"
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

                feature.setStyle(styleNotFound);
                feature.setProperties({"name":landmark})

                // Add the vector layer to the map.
                map.addLayer(vectorLayer);
/*
                var selectClick = new ol.interaction.Select({
                    condition: ol.events.condition.click,
                  });
                  console.log("adding interaction")
                  map.addInteraction(selectClick);
                  selectClick.on('select', function(e) {
                      if(e != null) {
                        checkLandmarkClick(e, landmark);
                      }
                  });*/
                                    
            }
        }
  });
}


/*drawLandmarkBounds(map, "Big Ben");*/