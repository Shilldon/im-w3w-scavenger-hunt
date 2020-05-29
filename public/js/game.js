var socket = io();
socket.emit("new player");

socket.on("add pin", function(pinLat, pinLng) {
    addPin(pinLat, pinLng);
});

socket.on("set landmark area", function(zoom, radius, landmark, hint) {
    //$("#map").attr("data-range",range, radius);
    showLocationHint(hint);
    setZoom(zoom);
    drawSearchArea(map, radius, landmark);
    drawLandmarkBounds(map, landmark);
});

socket.on("reveal landmark", function(playerName, icon, coordinates, landmark){
    drawLandmark(playerName, icon, coordinates, landmark);
});

socket.on("update leaderboard", function(players) {
    updateLeaderBoard(players);
});

socket.on("update clues", function(clues) {
    console.log(clues)
    updateClues(clues);
});

socket.on("send message", function(message) {
    sendMessage(message);
})
