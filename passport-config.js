
const bcrypt = require('bcrypt');
const User = require('./models/user');
const passport = require("passport");
const localStrategy = require('passport-local').Strategy;

passport.serializeUser((user, done) => {
    done(null, user.id);
});

passport.deserializeUser((id, done) => {
    User.findById(id, (err, user) => {
        done(err, user);
    });
});

passport.use(
    new localStrategy({ usernameField: "username"}, (username, password, done) => {
        User.findOne({username: username})
            .then(user => {
                if(!user) {
                    return done(null, false, { message: 'No user registered with that name.'})                    
                }
                else {
                    bcrypt.compare(password, user.password, (err, isMatch) => {
                        if(err) throw err;

                        if(isMatch) {
                            return done(null, user);
                        }
                        else {
                            return done(null, false, {message: "Incorrect password"});
                        }
                    });
                }
            })
            .catch(err => {
                return done(null, false, { message: err });
            });
    })
)

module.exports = passport; 
/*
function initialise(passport, getUserByUsername, getUserById) {
    const authenticateUser = async (username, password, done) => {
        //const user = getUserByUsername(username);
        const user = User.findOne({ username: username})
        console.log("user.username ", user.username)
        //console.log(user);
        if(user == null) {
            return done(null, false, { message: 'No user registered with that name.'})
        }

        try {
            if(await bcrypt.compare(password, user.password)) {
                return done(null, user);
            } else {
                return done(null, false, { message: 'Incorrect password'});
            }
        } catch (e) {
            return done(e);
        }
    }
    passport.use(new localStrategy({ usernameField: 'username'}, authenticateUser));
    passport.serializeUser((user, done) => done(null, user.id))
    passport.deserializeUser((id, done) => { 
        return done(null, getUserById(id))
    })
}

module.exports = initialise
*/