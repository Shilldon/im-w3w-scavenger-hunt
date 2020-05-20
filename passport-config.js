const localStrategy = require('passport-local').Strategy
const bcrypt = require('bcrypt')

function initialise(passport, getUserByUsername, getUserById) {
    const authenticateUser = async (username, password, done) => {
        const user = getUserByUsername(username);
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