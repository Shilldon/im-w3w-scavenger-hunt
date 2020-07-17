if(process.env.NODE_ENV !== 'production') {
    require('dotenv').config()
}

// Dependencies
//const express = require('express');
//const app = express();
const fs = require('fs');
const bcrypt = require('bcrypt');
const passport = require('passport');
const initialisePassport = require('./passport-config')
const flash = require('express-flash')
const session = require('express-session')
const methodOverride = require('method-override')

const mongoose = require('mongoose')
mongoose.connect(process.env.DATABASE_URL, { useNewUrlParser: true })

const db = mongoose.connection;

db.on('error', (error) => console.error(error))
db.once('open', () => console.log("connected to database"))

/*
initialisePassport(
    passport, 
    username => User.findOne(user => user.username === username), 
    id => User.findOne(user => user._id === id)
)*/

var express = require('express'),
    app = express(),
    server = require('http').createServer(app),
    io = require('socket.io').listen(server)

server.listen(process.env.PORT || 5000);

const User = require('./models/user')
const users = [];

// Start the Server
/*
http.listen(port, function () {
    console.log('Server Started. Listening on *:' + port);
});*/

// Express Middleware
app.set('view-engine', 'ejs');
app.use(express.urlencoded({extended: false}));
app.use(express.static('public'));
app.use(express.json());

const usersRouter = require('./views/users');
app.use('/users', usersRouter);

app.use(flash());

expressSession = require("express-session");
var sessionMiddleware = expressSession({
    name: "IMW3WSESSION",
    secret: process.env.SESSION_SECRET,
    store: new (require("connect-mongo")(expressSession))({
        url: process.env.DATABASE_URL
    })
});

/*
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false
}))*/
app.use(sessionMiddleware);
app.use(passport.initialize());
app.use(passport.session());
app.use(methodOverride('_method'));


// Render Main ejs files
app.get('/', checkAuthenticated, (req, res) => {
    console.log("USERNAME ", req.user.username)
    res.render('index.ejs', {
        username: req.user.username
    });
});

app.get('/register', checkNotAuthenticated, function (req, res) {
    res.render('register.ejs', {errorMessage: ""});
});

app.post('/register', checkNotAuthenticated, async (req, res) => {
    //check passwords match and check if username already registered.
    try {
        if(req.body.password1 !== req.body.password2) throw new Error('Passwords did not match.');
        if(await User.exists({ username: req.body.username }) == true) throw new Error('Username already registered.') ;
        const hashedPassword = await bcrypt.hash(req.body.password1, 10);
        user = new User({
            username: req.body.username,   
            password: hashedPassword,
            landmarks: [],
            socketId: "0",
            score: 0                   
        });
        const newUser = await user.save();
        res.redirect('/login')           
    }
    catch (err) {
        req.flash('registrationerror',err.message);
        res.redirect('/register') 
    }       
});

app.get('/login', checkNotAuthenticated, (req,res) => {
    res.render('login.ejs');
})

app.post('/login', 
    checkNotAuthenticated, 
    passport.authenticate('local', { 
            successRedirect: '/',
            failureRedirect: '/login',
            failureFlash: true
        })
);

app.delete('/logout', (req,res) => {
    req.logOut();
    res.redirect('/login');
});

app.get('/duplicate', checkAuthenticated, (req,res) => {
    res.render('duplicate.ejs');
})

function checkAuthenticated(req, res, next) {
    if(req.isAuthenticated()) {
        return next()
    }
    res.redirect('/login')
}

function checkNotAuthenticated(req, res, next) {
    if(req.isAuthenticated()) {
        return res.redirect('/') 
    }
    return next();
}

/*
function setUserName(req, res, next) {
    console.log("setting session");
    session["username"] = req.body.username;
    return next();
}*/

//load in raw data
let rawdata = fs.readFileSync('public/data/landmarks.json');
let clues = JSON.parse(rawdata);


var loggedInUsers = {};
var currentClue = -1;
var winners = 3;
var successfulPlayers = [];
io.use(function(socket, next){
    sessionMiddleware(socket.request, {}, next);
});

io.sockets.on('connection', function(socket) {
    var userId = socket.request.session.passport.user;
    console.log("Your User ID is", userId);
    //console.log("passport ", JSON.stringify(socket.request.session.passport))

    socket.on('disconnect', function() {
        console.log("disconnect logged in user "+JSON.stringify(loggedInUsers))
        console.log("disconnect called by ", socket.id)
        try {
            console.log("disconnected "+loggedInUsers[socket.id].name)
            
            delete loggedInUsers[socket.id];  
            updateLeaderBoard();
        }
        catch (err) {
            console.error("error on disccontect: "+err.message)
        }
    
    });

    socket.on('new player', function() {
        
        var userId = socket.request.session.passport.user;
        
        let playerListSockets = Object.keys(loggedInUsers);
        let playerIDs = [];
        console.log("new player connected")

        playerListSockets.forEach(item => {
            console.log("socketID in player list ",item)
            playerIDs.push(loggedInUsers[item]["id"]);   
        });
        
        console.log("player ids ", playerIDs);
        if(playerIDs.indexOf(userId) === -1) {

            console.log("player not already logged in")
            //find the player logging in and update their map with the landmarks they have found so far

            var landmarksFound = 0;
            async function updateMapWithLandmarks() {
            await User.findOne({ _id: userId }, function (err, obj) {
                try {
                        loggedInUsers[socket.id] = { 
                            "name": obj.username,
                            "id": userId
                        };
                        console.log("loggedInUsers ",JSON.stringify(loggedInUsers))

                        if(obj.score == undefined) { 
                            console.log("saving score")
                            obj.score = 0; 
                            obj.save();
                        }

                        var landmarks = obj.landmarks;
                        landmarksFound = landmarks.length;
                        var listOfLandmarksFound = [];
                        //get coordinates of all landmarks already located by user
                        var coordinatesArray = [];
                        var keys = Object.keys(clues);
                        for(j=0; j<landmarksFound; j++) {
                            var landmark = landmarks[j];

                            listOfLandmarksFound.push(landmark[0]);                            
                            for(i=0; i<keys.length; i++) {
                                if(clues[keys[i]].idname === landmark[0]) {
                                    coordinatesArray.push(clues[keys[i]]["coordinates"]);
                                }
                            } 
                        }
                        console.log("update the leaderboard")
                        updateLeaderBoard();                            
                        //send array of coordinates and draw landmarks found on map
                        io.to(socket.id).emit("draw landmarks", coordinatesArray); 

                            let currentLandmark = clues[keys[currentClue]].name;  
                            let currentLandmarkId = clues[keys[currentClue]].idname; 
                            console.log("currentLandmark ", currentLandmark);
                            console.log("currentLandmarkId ", currentLandmarkId);
                            console.log("list of landmarks found by player "+obj.username+": "+listOfLandmarksFound)
                            if(winners === 0) {
                                io.to(socket.id).emit("question complete", currentLandmark, successfulPlayers);
                            }
                            else if(listOfLandmarksFound.indexOf(currentLandmarkId) != -1) {
                                io.to(socket.id).emit("landmark already found", currentLandmark)
                            }                                                   
                }
                catch (err) {

                    console.log("error reading name ",err.message);
                }
             });
        
           }
           console.log("update the map")
            updateMapWithLandmarks();

            //check the current clue that is being displayed and update the clues on the player
            //page with that clue
            if(currentClue >= 0 && currentClue < 10) {
                var cluesKeys = Object.keys(clues);
                var clue = clues[cluesKeys[currentClue]].clues;    
                io.to(socket.id).emit("update clues", clue);   
            }     
        }    
        else {
            console.log("already logged in another window fire duplicate message")
            io.to(socket.id).emit("redirect to duplicate");
        }      
    });

    socket.on('remove player', function() {
        
        //delete loggedInUsers[socket.id];
        console.log("removed player by logout")
        //create a list of users from players logged in (excluding admin) and
        //push that to the player page to update the leaderboard
  
        //updateLeaderBoard();
    });

    socket.on('submit guess', function(threeWords) {
        //check if the words submitted match the clue, if so draw a search area for the landmark
        //and pass in the hint to the landmark they should be looking for
        if(threeWords in clues) {
            var zoom = clues[threeWords].zoom; //this is the zoom to set on the map to encompass the search area
            var radius = clues[threeWords].radius; //this is the radius of the search area
            var landmark = clues[threeWords].name; //this is the name of the landmark
            var hint = clues[threeWords].clue; //this is the hint to the landmark the player needs to search for
            io.to(socket.id).emit("set landmark area", zoom, radius, landmark, hint);  
        }      
        else {
            //if the player's guess was incorrect find the answer for the current question then pass that,
            //as an array, to the player page so the answers can be marked
            var answer = Object.keys(clues)[currentClue];
            var answerArray = answer.split(".");
            io.to(socket.id).emit("mark words", answerArray);
        }
    });

    socket.on('check landmark click', function(feature) {
        let currentLandmark = clues[keys[currentClue]].name;  
        io.to(socket.id).emit("check landmark", feature, landmark)
    })

    socket.on('player found landmark', function(landmark) {
        var icon;
        var coordinates = [];
        console.log("playuer found ", landmark)
        //get the icon and coordinates of the landmark found from the clues JSON
        var cluesKeys = Object.keys(clues);
        var icon = clues[cluesKeys[currentClue]]["icon"];    
        var coordinates= clues[cluesKeys[currentClue]]["coordinates"]; 

        //add the landmkark to the player object and pass the icon and coordinates to the player page
        //to update the leaderboard and map


        async function addLandmarkToPlayerList(id, coordinates, landmark) {
            console.log("called addLandmark")
            await User.findOne({ _id : id }, function (err, obj) {
                try {
                    var landmarks = obj.landmarks;
                    landmarks.push([icon,winners]);
                    obj.landmarks = landmarks;
                    obj.score = obj.score + (winners * 5);

                    //wait for the user data to save then update the leaderboard
                    callUpdateLeaderBoard = async() => {
                        let saveUser = await obj.save();
                        updateLeaderBoard(saveUser);
                    }
                    callUpdateLeaderBoard();
                    if(winners === 3) {
                        successfulPlayers = [obj.username];
                    }
                    else {
                        successfulPlayers.push(obj.username);
                    }
                    winners -= 1;
                    io.to(socket.id).emit("reveal landmark", coordinates, landmark, icon);
                    io.sockets.emit("send message", username+" has found "+landmark);    
                    if(winners === 0) {
                        io.sockets.emit("question complete", landmark, successfulPlayers);
                    }
                    console.log("finished adding landmark");                                            
                }
                catch (err) {
                    console.error(err.message)
                }
            })
        }
        var userId = socket.request.session.passport.user;
        addLandmarkToPlayerList(userId, coordinates, landmark);
    });

    socket.on("deduct points", function(penalty) {
        var userId = socket.request.session.passport.user;
        reduceScore(userId);      
        console.log("deducting points")  
        async function reduceScore(userId) {
            await User.findOne({_id: userId}, function (err, obj) {
                try {
                    obj.score = obj.score - penalty;
                    obj.save;
                    callUpdateLeaderBoard = async() => {
                        let saveUser = await obj.save();
                        updateLeaderBoard(saveUser);
                    }
                    callUpdateLeaderBoard();
                }
                catch {
                    console.err(err.message)
                }
            })
        }
    })

    socket.on('next location', function() {
        updateLeaderBoard();        
        //increase the number of the current clue by 1
        currentClue += 1;
        winners = 3;

        //PUT A CHECK IN HERE TO SEE WHAT PLAYERS HAVE FOUND THE LANDMARK THAT THE NEXT CLUE IS GOING TO REVEAL
        //IF THEY HAVE FOUND IT MOVE DISPLAY THE CONGRATS MESSAGE ELSE DISPLAY THE CLUE
        //IF ALREADY HAVE 3 WINNERS MOVE ON
        //PERHAPS A BETTER SOLUTION IS TO STORE THE CURRENT CLUE PERMANENTLY IN CASE OF SERVER RESET?
        //OF COURSE CAN MANUALLY CONTROL THROUGH ADMIN MOVING ON TO NEXT CLUE
        /*
        //getlist of landmarks found by each player
        var userId = socket.request.session.passport.user;
        async function checkLandmarkFoundByPlayer(userId, newLandmark) {
            await User.findOne({ _id : userId }, function (err, obj) {
            try {
                var landmarks = obj.landmarks;
                landmarksFound = landmarks.length;
                var listOfLandmarksFound = [];     
                for(j=0; j<landmarksFound; j++) {
                    var landmark = landmarks[j];
                    listOfLandmarksFound.push(landmark[0]);                            
                }
                if(listOfLandmarksFound)*/


        //send the new clue to all players
        try {
            var cluesKeys = Object.keys(clues);
            if(currentClue < 10) {
                var clue = clues[cluesKeys[currentClue]].clues;                   
                io.sockets.emit("update clues", clue);  
            } 
            else {
                var listOfUsers = [];
                for(var user in loggedInUsers) {
                    console.log("readig name")
                    if(loggedInUsers[user].name !== "Admin") {
                        listOfUsers.push(loggedInUsers[user].name);
                    }
                }                   
                let getPlayerList = async () => {
                    console.log("doing winner message")
                    io.sockets.emit("winning message", await processArray(listOfUsers));
                }    
                getPlayerList();                
                
            }
        }
        catch (err) {
            console.log("error on next location "+err.message);
        }
                             

    });

    socket.on("check answer", function(answer, position) {
        var cluesKeys = Object.keys(clues);
        var answers = cluesKeys[currentClue];    
        var answerArray = answers.split("."); 
        io.to(socket.id).emit("mark answer", answerArray[position] === answer, position);    
    });

    function updateLeaderBoard() {
        console.log("updating leaderboard")
        var listOfUsers = [];
        console.log("list of users ", listOfUsers)
        try {
            for(var user in loggedInUsers) {
                console.log("readig name")
                if(loggedInUsers[user].name !== "Admin") {
                    listOfUsers.push(loggedInUsers[user].name);
                }
            }        
            let emitUpdatedLeaderBoard = async () => {
                io.sockets.emit("update leaderboard", await processArray(listOfUsers));
            }    
            emitUpdatedLeaderBoard();
        }
        catch (err) {
            console.log("error in update leaderboard "+err.message)
        }

    }
});

function processArray(array) {
    return User.find({username: array }, function (err, obj) {
        //console.log("objects returned: ", obj)
        try {
            players = obj;
        }
        catch (err) {
            console.log("error in processing array "+err.message)
        }
    });
}


  