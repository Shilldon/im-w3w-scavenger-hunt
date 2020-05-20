if(process.env.NODE_ENV !== 'production') {
    require('dotenv').config()
}

// Dependencies
const express = require('express');
const app = express();
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


var http = require('http').Server(app);
var io = require('socket.io')(http);
var port = process.env.PORT || 3000;

const users = [];

// Start the Server
http.listen(port, function () {
    console.log('Server Started. Listening on *:' + port);
});


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
                    password: hashedPassword
                })
                res.redirect('/login')
            } catch {
                res.redirect('/register')     
            }
            console.log(users)
        }
});

app.get('/login', checkNotAuthenticated, (req,res) => {
    res.render('login.ejs');
})

app.post('/login', checkNotAuthenticated, passport.authenticate('local', {
    successRedirect: '/',
    failureRedirect: '/login',
    failureFlash: true
}));

app.delete('/logout', (req,res) => {
    req.logOut();
    res.redirect('/login');
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
    return next()
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
io.on('connection', function(socket) {
    var players = {};
    socket.on('new player', function() {
        players[socket.id] = {};
        console.log("welcome");
    });

    socket.on('correct guess', function(threeWords) {
        player = players[socket.id];
        var range = clues[threeWords].range;
        var radius = clues[threeWords].radius;
        var landmark = clues[threeWords].name;
        console.log("range = "+range);
        io.to(socket.id).emit("set landmark area", range, radius, landmark);        
    });

    socket.on('found landmark', function(pinLat, pinLng){
        console.log("found landmark");
        io.sockets.emit("add pin", pinLat, pinLng);
    });

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
        io.to(socket.id).emit("reveal landmark", icon, coordinates);
    })
});