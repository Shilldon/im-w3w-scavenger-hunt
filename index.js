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

initialisePassport(
    passport,
    username => users.find(user => user.username === username),
    id => users.find(user => user.id === id)    
)

var express = require('express'),
    app = express(),
    server = require('http').createServer(app),
    io = require('socket.io').listen(server)

server.listen(process.env.PORT || 8080);
/*
var http = require('http').Server(app);
var io = require('socket.io')(http);
var port = process.env.PORT || 8080;
*/
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
app.use(flash())
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false
}))
app.use(passport.initialize())
app.use(passport.session())
app.use(methodOverride('_method'))


// Render Main ejs files
app.get('/', checkAuthenticated, (req, res) => {
    res.render('index.ejs');
});

app.get('/register', checkNotAuthenticated, function (req, res) {
    res.render('register.ejs', {errorMessage: ""});
});

app.post('/register', checkNotAuthenticated, async (req, res) => {
    var registrationErrorMessage ='';
    if(req.body.password1 !== req.body.password2) {
        registrationErrorMessage ='Passwords did not match.';
    }
    else {
        for(i=0; i<users.length; i++) {
            if(users[i].username === req.body.username) {
                registrationErrorMessage ='Username already taken.';
                break;                
            }
        }
    }
    if(registrationErrorMessage !== '') {
        req.flash('registrationerror',registrationErrorMessage);
        res.redirect('/register') 
    }
    else {
            try {
                const hashedPassword = await bcrypt.hash(req.body.password1, 10);
                users.push({
                    id: Date.now().toString(),
                    username: req.body.username,
                    password: hashedPassword,
                    landmarks: 0
                })
                console.log(users);
                res.redirect('/login')
            } catch {
                res.redirect('/register')     
            }
        }
});

app.get('/login', checkNotAuthenticated, (req,res) => {
    res.render('login.ejs');
})

app.post('/login', 
    checkNotAuthenticated,    
    setUserName,
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
    return next()
}

function setUserName(req, res, next) {
        console.log("setting session");
        session["username"] = req.body.username;
        return next();
}

//load in raw data
let rawdata = fs.readFileSync('public/data/landmarks.json');
let clues = JSON.parse(rawdata);

var keys = Object.keys(clues);
for(i=0; i<keys.length; i++) {
    console.log("key "+keys[i])
    console.log("name value "+clues[keys[i]]["name"])
}

// Add the WebSocket handlers
//io.on('connection', function(socket) {
io.sockets.on('connection', function(socket) {
    //console.log(socket)


    var players = {};

    socket.on('new player', function() {
        for(i=0; i<users.length; i++) {
            if(users[i].username == session["username"]) {
                users[i]["socket"] = socket.id;   
                users[i]["landmarks"] = 0;
            }
        }
        io.sockets.emit("update leaderboard", users);
        var cluesKeys = Object.keys(clues);
        io.to(socket.id).emit("update clues",clues[cluesKeys[0]].clues);
    });

    socket.on('remove player', function() {
        var players = [];
        for(i=0; i<users.length; i++) {
            if(users[i].socket != socket.id) {
                players.push(users[i]);    
            }
        }

        io.sockets.emit("update leaderboard", players);
    });

    socket.on('correct guess', function(threeWords) {
        player = players[socket.id];
        var zoom = clues[threeWords].zoom;
        var radius = clues[threeWords].radius;
        var landmark = clues[threeWords].name;
        var hint = clues[threeWords].clue;
        console.log("landmark bounds to draw ",landmark)
        io.to(socket.id).emit("set landmark area", zoom, radius, landmark, hint);        
    });
/*
    socket.on('found landmark', function(pinLat, pinLng){

        //console.log("users[socket.id].landmarks "+users[socket.id].landmarks)
        //users[socket.id].landmarks = users[socket.id].landmarks+1;
        io.sockets.emit("add pin", pinLat, pinLng);
    });
*/
    socket.on('player found landmark', function(landmark) {
        var icon;
        var coordinates = [];
        var keys = Object.keys(clues);
        for(i=0; i<keys.length; i++) {
            if(clues[keys[i]].name === landmark) {
                icon = clues[keys[i]]["icon"];
                coordinates = clues[keys[i]]["coordinates"];
            }
        }
        console.log("reveal landmark "+icon+" "+coordinates[0]+" "+coordinates[1])
        var player;
        var userKeys = Object.keys(users);
        for(i=0; i<userKeys.length; i++) {
            if(users[userKeys[i]].socket === socket.id) {
                player = users[userKeys[i]];
            }
        }        
        player["landmarks"] = player["landmarks"]+1;
        //console.log("users[socket.id].landmarks "+users[socket.id].landmarks)
        io.to(socket.id).emit("reveal landmark", player.username, icon, coordinates, landmark);
        io.sockets.emit("send message", player.username+" has found "+landmark);
    });

    socket.on('next location', function() {
        var userKeys = Object.keys(users);
        console.log("userKeys ",userKeys)
        var clueID;
        for(i=0; i<userKeys.length; i++) {
            console.log("users socket ", users[userKeys[i]].socket)
            if(users[userKeys[i]].socket === socket.id) {
                clueID = users[userKeys[i]]["landmarks"];
            }
        }             
        
        var cluesKeys = Object.keys(clues);
        console.log("clues Keys ", cluesKeys)
        var clue = clues[cluesKeys[clueID]].clues;  
        console.log("clue ",clue)
        for(i=0; i<userKeys.length; i++) {
            if(users[userKeys[i]].socket === socket.id) {
                io.to(socket.id).emit("update clues", clue);    
            }
        }
    });

});