var socket = io();
socket.emit("new player");

socket.on("add pin", function(pinLat, pinLng) {
    addPin(pinLat, pinLng);
});

socket.on("set landmark area", function(range, radius, landmark) {
    console.log("setting range");
    $("#map").attr("data-range",range, radius);
    drawSearchArea(map, radius);
    drawLandmarkBounds(map, landmark);
});

socket.on("reveal landmark", function(icon, coordinates){
    drawLandmark(icon, coordinates);
});

socket.on("add to leaderboard", function(players) {
    addToLeaderBoard(players);
})