var socket = io();

/*
$("#winners-modal").modal({
    show: true
});    
*/
socket.emit("new player");

socket.on("add pin", function(pinLat, pinLng) {
    addPin(pinLat, pinLng);
});

socket.on("set landmark area", function(zoom, radius, landmark, hint) {
    $(".guesses--words").val('');
    $(".modal-image").removeClass("d-flex");
    $(".modal-image").addClass("d-none");
    congratulationsText = "Now find the landmark. Hint: "+hint;
    $(".modal-body").find("p").text(congratulationsText);
    $('#congratulations-modal').modal({
        show: true
    });    
    showLocationHint(hint);
    setZoom(zoom);
    drawSearchArea(map, radius, landmark);
    drawLandmarkBounds(map, landmark);
});

socket.on("reveal landmark", function(coordinates, landmark, icon){
    drawLandmark(coordinates, landmark, icon);
});

socket.on("update leaderboard", function(players) {
    console.log("updating leaderboard")
    updateLeaderBoard(players);
});

socket.on("update clues", function(clues) {
    updateClues(clues);
});

socket.on("send message", function(message) {
    sendMessage(message);
});

socket.on("question complete", function(landmark, winners) {
    hideClues(landmark, winners);
});

socket.on("mark words", function(answerArray) {
    markAnswers(answerArray);
});

socket.on("draw landmarks", function(landmarkArray) {
    $.each(landmarkArray, function(coordinates, value) {
        addPin(value[1],value[0]);
    });
});

socket.on("win", function() {
    $(".location-hint").find("h2").hide();
    showLocationHint("Congratulations! You have found all the landmarks.");
    zoomTo(54.50, -4.6);
    setZoom(5.75);
});

socket.on("mark answer", function(correct, position) {
    console.log("marking answer",position+1," correct? ",correct)
    var mark = "";
    if(correct) { mark = "tick"; }
    else { mark = "cross" }
    $(`#mark-${position+1}`).find("img").attr("src",`/images/${mark}.png`);
});

socket.on("redirect to duplicate", function() {
    window.location.href = "duplicate";
});

socket.on("landmark already found", function(landmark) {
    console.log("game ",landmark)
    landmarkFoundMessage(landmark);
});

socket.on("check landmark", function(feature, landmark) {
    checkLandmarkClick(feature,landmark);
});

socket.on("winning message", function(players) {
    console.log("displaying winner message?")
    displayWinnerMessage(players);
});