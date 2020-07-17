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
          center: ol.proj.fromLonLat([-4.6, 54.50]),
          zoom: 5.75 //Initial Zoom Level
        })
});

var selectClick = new ol.interaction.Select({
    condition: ol.events.condition.click,
  });
  console.log("adding interaction")
  map.addInteraction(selectClick);
  selectClick.on('select', function(e) {
      if(e != null) {
        console.log("map clicked on a feature")
        checkLandmarkClick(e, currentLandmark);
        //socket.emit("check landmark click", e);
      }
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
            console.log("checking layers")
              map.getLayers().forEach(function(el) {
                if (el.get('name') === landmark+"-layer") {
                  map.removeLayer(el);
                }
              })

            selectedFeatures[0].setStyle(styleNotFound);  
            socket.emit("player found landmark", landmark);
        }
        else {
            console.log("not landmark")
            socket.emit("deduct points", 2);
            e.target.getFeatures().clear();
            var x = event.pageX-$(".score-penalty").width()/2;
            var y = event.pageY-$(".score-penalty").height();

            $(".score-penalty").show();
            $(".score-penalty").fadeOut(2000);
            $(".score-penalty").css({"left":`${x}px`,"top":`${y}px`})

        }
    }    
}
/*
function checkLandmarkClick(e) {

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
            console.log("checking layers")
              map.getLayers().forEach(function(el) {
                if (el.get('name') === landmark+"-layer") {
                  map.removeLayer(el);
                }
              })

            selectedFeatures[0].setStyle(styleNotFound);  
            socket.emit("player found landmark", landmark);
        }
        else {
            console.log("not landmark")
            socket.emit("deduct points", 2);

            var basicStyle = new ol.style.Style({
                stroke: new ol.style.Stroke({
                    color: 'blue',
                    width: 3
                  }),
                  fill: new ol.style.Fill({
                    color: 'rgba(0, 0, 255, 0.1)'
                  })
                });               
            selectedFeatures[0].setStyle(basicStyle); 
        }
    }    
}
*/


function drawLandmark(coordinates, landmark, icon) {
    //console.log(playerName)
    //$(".next-location").removeClass("d-none");
    //$(".next-location").addClass("d-flex");
    addPin(coordinates[1],coordinates[0]);
    //$(`#leaderboard-${playerName}`).find(".leaderboard--sites-found").append(`<img src='./images/icon-${icon}.png'>`);
    var landmarkLayer;
    map.getLayers().forEach(function (layer) {
        if (layer.get('name') != undefined & layer.get('name') === landmark+"_circle") {
            landmarkLayer = layer;
        }
    });
    map.removeLayer(landmarkLayer)    
    congratulationsText = "Congratulations! You found "+landmark+"!";
    $(".modal-image").removeClass("d-none");
    $(".modal-image").addClass("d-flex");
    $(".modal-image").find("img").attr("src",`./images/${icon}-large.jpg`);
    $(".modal-body").find("p").text(congratulationsText);
    $('#congratulations-modal').modal({
        show: true
    });
    landmarkFoundMessage(landmark);
}


// We track coordinate change each time the mouse is moved
map.on('click', function(evt){
    var lonlat = ol.proj.transform(evt.coordinate, 'EPSG:3857', 'EPSG:4326');
    console.log(lonlat)

})

function updateLeaderBoard(players) {
    console.log(JSON.stringify(players))
    $(".leaderboard").find(".contestant").remove();
    //console.log("addiong")
    players.sort((a, b) => (a.score < b.score) ? 1 : -1)
    $.each(players, function(key, player) {
        var sitesFound = "";
        $.each(player.landmarks, function(landmarkName, value) {
            var medalColour = "white";
            switch(value[1]) {
                case 3: medalColour = "#D4AF37"; break;
                case 2: medalColour = "#C0C0C0"; break;
                case 1: medalColour = "#8B4513"; break;
            }
            sitesFound = sitesFound+`<span class="my-auto" style="background-color: ${medalColour}"><img src='./images/icon-${value[0]}.png'></span>`;
            console.log(sitesFound);
        });
        $(".leaderboard").append(`<div id="leaderboard-${player.username}" class="leaderboard--contestant row contestant"><div class="col-3 my-auto"><h4 class="contestant-name">${player.username}</h4></div><div class="col-7 my-auto leaderboard--sites-found">${sitesFound}</div><div class="col-2"><h4 class="contestant-name">${player.score}</h4></div></div>`);
    });
}

function updateClues(clues) {
    $(".clues").removeClass("d-none");
    $(".clues").addClass("d-flex");

    $(".guesses").removeClass("d-none");
    $(".guesses").addClass("d-flex");
  
    $(".location-hint").removeClass("d-flex");
    $(".location-hint").addClass("d-none");

    $("#hint-1").text(clues[0]);
    $("#hint-2").text(clues[1]);
    $("#hint-3").text(clues[2]);    

    $(".guesses--mark").find("img").attr("src","./images/box.png");

    //reset view
    map.getView().setCenter(ol.proj.fromLonLat([-4.6, 54.50]));   
    setZoom(5.75);

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

function hideClues(landmark, winners) {
    $(".clues").removeClass("d-flex");
    $(".clues").addClass("d-none");
    
    $(".guesses").removeClass("d-flex");
    $(".guesses").addClass("d-none");

    $(".location-hint").removeClass("d-none");
    $(".location-hint").addClass("d-flex");
    $("#location-hint-text").text(`${landmark} has been found by ${winners[0]}, ${winners[1]}, and ${winners[2]}`);    
}

function markAnswers(answerArray) {
    console.log("answer array "+answerArray)
    var firstWordGuess = $("#what-1").val().toLowerCase();
    console.log(firstWordGuess)
    var secondWordGuess = $("#what-2").val().toLowerCase();
    var thirdWordGuess = $("#what-3").val().toLowerCase();    
    if(firstWordGuess === answerArray[0]) {
        console.log("answer 1 right")
        $("#mark-1").find("img").attr("src",'./images/tick.png');
    } else {
        console.log("answer 1 wrong")
        $("#mark-1").find("img").attr("src",'./images/cross.png');
    }
    if(secondWordGuess === answerArray[1]) {
        console.log("answer 2 right")
        $("#mark-2").find("img").attr("src",'./images/tick.png');
    } else {
        console.log("answer 2 wrong")
        $("#mark-2").find("img").attr("src",'./images/cross.png');
    }
    if(thirdWordGuess === answerArray[2]) {
        console.log("answer 3 right")
        $("#mark-3").find("img").attr("src",'./images/tick.png');
    } else {
        console.log("answer 3 wrong")
        $("#mark-3").find("img").attr("src",'./images/cross.png');
    }    


}

function landmarkFoundMessage(landmark) {
    $(".clues").removeClass("d-flex");
    $(".clues").addClass("d-none");
      
    $(".guesses").removeClass("d-flex");
    $(".guesses").addClass("d-none");
   
    $(".location-hint").removeClass("d-none");
    $(".location-hint").addClass("d-flex");
    $("#location-hint-text").text("You have found "+landmark);
}

function displayWinnerMessage(winners) {
    winners.sort((a, b) => (a.score < b.score) ? 1 : -1)
    winners.sort((a, b) => (a.score < b.score) ? 1 : -1)
    $.each(winners, function(key, winner) {
        var sitesFound = "";
        $.each(winner.landmarks, function(landmarkName, value) {
            var medalColour = "white";
            switch(value[1]) {
                case 3: medalColour = "#D4AF37"; break;
                case 2: medalColour = "#C0C0C0"; break;
                case 1: medalColour = "#8B4513"; break;
            }
            sitesFound = sitesFound+`<span class="my-auto" style="background-color: ${medalColour}"><img src='./images/icon-${value[0]}.png'></span>`;
            console.log(sitesFound);
        });
        $(".winner-modal-body").append(`<div class="winnerboard--contestant row contestant"><div class="col-3 my-auto"><h4 class="contestant-name">${winner.username}</h4></div><div class="col-7 my-auto winnerboard--sites-found">${sitesFound}</div><div class="col-2"><h4 class="contestant-name">${winner.score}</h4></div></div>`);
    });
    $("#winners-modal").modal({
        show: true
    });    
}


$(document).ready(function() {
    /*
    $("input").on('keyup', function(e){
        if(e.keyCode === 13) {
            checkEntry();
        }
    });*/

    $(".guesses--submit-words").on("click", function() {
        checkEntry();
    });

    $(".logout-button").on("click", function() {
        socket.emit("remove player");
        console.log("logging out")
        $(".logout-form").submit();
    });

    /*
    $(".next-location").on("click", function() {
        $("#congratulations-modal").modal('hide');
        $(".guesses--mark").find("img").attr("src","./images/box.png");
        socket.emit("next location");
    });
    */

    $(".guesses--words").on('keydown', function(e) {
        var keyCode = e.keyCode || e.which;
        if(keyCode === 9 || keyCode === 13) {
            getAnswer($(this));
        }
    });

    $(".guesses--words").on('focusout', function(e) {
        getAnswer($(this));
    });    

    $(".guesses--next-question").on('click', function() {
        socket.emit("next location");
    })
});

function checkAnswer(answer, answerNumber) {
    socket.emit("check answer", answer, answerNumber-1);
}

function getAnswer(el) {
    var answer = el.val().toLowerCase();
    if(answer) {
        var id = el.attr("id");
        answerNumber = id.split("-")[1];
        checkAnswer(answer, answerNumber);
    }    
}
