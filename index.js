//Define the include function for absolute file name
global.base_dir = __dirname;
global.abs_path = function(path) {
	return base_dir + path;
}
global.include = function(file) {
	return require(abs_path('/' + file));
}

require('dotenv').config(); // FOR ENV ENVIORMENT 

const database = include('databaseConnectionMongoDB');

const express = require('express');
const app = express(); 

const mongoose = require('mongoose');

const bodyparser = require('body-parser');

const bcrypt = require('bcrypt');
const {
    render
} = require('express/lib/response');

const router = include('routes/router');

var session = require('express-session');
const req = require('express/lib/request');
app.set('view engine', 'ejs');

const port = process.env.PORT || 3000; // place port in variable 


// const mongodb_host = process.env.REMOTE_MONGODB_HOST;
// const mongodb_user = process.env.REMOTE_MONGODB_USER;
// const mongodb_password = process.env.REMOTE_MONGODB_PASSWORD;

const secret_token = process.env.SECRET_TOKEN

app.use(bodyparser.urlencoded({
    parameterLimit: 100000,
    limit: '50mb',
    extended: true
}));


app.use('/',router);

// // Route to render login.ejs when website is initially visited.
// app.get('/', (req, res) => {
//     res.render("index.ejs");
// })


// Use the session middleware
app.use(session({
    secret: `${secret_token}`,
    saveUninitialized: true,
    resave: true
}));

// instead of using app.get() for every file, use this middleware instead. It serves all the required files to the client for you.
app.use(express.static('public'));

// // Connect mongoose to server
// mongoose.connect(`mongodb+srv://${mongodb_user}:${mongodb_password}@${mongodb_host}?retryWrites=true&w=majority`, {
//     useNewUrlParser: true,
//     useUnifiedTopology: true
// });


const userSchema = new mongoose.Schema({
    username: String,
    password: String,
    name: String,
    admin: Boolean
})

const userModel = mongoose.model("users", userSchema);



// Render login.ejs.
app.get('/login', (req, res) => {
    res.render("login.ejs");
})

// Render signup.ejs
app.get('/signup', (req, res) => {
    res.render("signup.ejs");
})

// Render signup.ejs
app.get('/home', (req, res) => {
    res.render("home.ejs");
})

// Route that sends all user data to client
app.get('/loadAllUsers', (req, res) => {
    userModel.find({}, (err, data) => {
        if (err) {
            console.log(err);
        } else {
            res.send(data);
        }
    })
})

// Check if the username exists in the database.
// I need to do this callback fuction thing only in server.js for some reason. I googled it and I don't understand why.
function isUsernameInDb(user, callback) {
    userModel.find({
        username: user
    }, (err, data) => {
        if (err) {
            console.log(err)
        }

        return callback(data.length != 0);
    })
}

// Signs up the user. Stores their credentials into the database. Then adds the user into the session.
app.post('/userSignUp', (req, res) => {
    let isUsernameInDbVariable;
    // I need to do this callback fuction thing only in server.js for some reason. I googled it and I don't understand why.
    isUsernameInDb(req.body.username, (response) => {
        isUsernameInDbVariable = response;
    })

    const plaintextPassword = req.body.password;
    const saltRounds = 10;

    bcrypt.hash(plaintextPassword, saltRounds, (err, hash) => {
        if (!isUsernameInDbVariable) {
            userModel.create({
                username: req.body.username,
                password: hash,
                name: req.body.name,
                admin: false
            }, (err, data) => {
                if (err) {
                    console.log(err);
                }

                // Login user via express-session
                req.session.authenticated = true;
                req.session.username = data.username;
                req.session.uid = data._id;

                res.send(data.name);
            })
        } else {
            res.render("index.ejs");
        }
    })
})

// Adds a users into the databse. only for admin.
app.post('/addUser', (req, res) => {
    let isUsernameInDbVariable;
    // I need to do this callback fuction thing only in server.js for some reason. I googled it and I don't understand why.
    isUsernameInDb(req.body.username, (response) => {
        isUsernameInDbVariable = response;
    })

    const plaintextPassword = req.body.password;
    const saltRounds = 10;

    bcrypt.hash(plaintextPassword, saltRounds, (err, hash) => {
        if (!isUsernameInDbVariable) {
            userModel.create({
                username: req.body.username,
                password: hash,
                name: req.body.name,
                admin: req.body.admin
            }, (err, data) => {
                if (err) {
                    console.log(err);
                }

                res.send(data.name);
            })
        } else {
            res.send(true);
        }
    })
})

app.post('/checkUserCredentials', (req, res) => {
    let usernameToCheck = req.body.username;
    let passwordToCheck = req.body.password; // This password is in plaintext.
    let expectedHashedPassword = "";

    userModel.find({
        username: usernameToCheck
    }, (err, data) => {
        if (err) {
            console.log(err);
        } else {
            if (data.length > 0) {
                expectedHashedPassword = data[0].password;
            }


            bcrypt.compare(passwordToCheck, expectedHashedPassword, (err, result) => {
                if (err) {
                    console.log(err);
                } else if (result) {
                    req.session.authenticated = true;
                    req.session.username = data[0].username;
                    req.session.uid = data[0]._id;
    
                    res.send(true);
                } else {
                    res.send(false);
                }
            })
        }
    })
})

// This route updates the user info.
app.post('/updateUser', (req, res) => {
    let admin;

    // Swaps format of admin back to database format.
    if (req.body.admin.toLowerCase() == "yes") {
        admin = true;
    } else {
        admin = false;
    }

    userModel.updateOne({
        _id: req.body._id
    }, {
        username: req.body.username,
        name: req.body.name,
        admin: admin
    }, (err, data) => {
        if (err) {
            console.log(err);
        } else {
            res.send(data);
        }
    })
})

// Route to delete user.
app.post('/deleteUser', (req, res) => {
    if (req.body._id == req.session.uid) {
        res.send(false);
    } else {
        userModel.deleteOne({
            _id: req.body._id
        }, (err, data) => {
            if (err) {
                console.log(err);
            } else {
                res.send(true);
            }
        })
    }


})

app.get('/isUserAnAdmin', (req, res) => {
    let loggedInUser = req.session.username;

    userModel.find({
        username: loggedInUser
    }, (err, data) => {
        if (err) {
            console.log(err);
        } else {
            res.send(data[0].admin);
        }
    })
})

// Check if user is logged in.
app.get('/isUserLoggedIn', (req, res) => {
    if (req.session.authenticated) {
        res.send(true);
    } else {
        res.send(false);
    }
})

// Ends the user session.
app.get('/logout', (req, res) => {
    req.session.authenticated = false;
    req.session.username = undefined;
    req.session.uid = undefined;

    res.render('login.ejs');
})


app.get("*", (req,res) => {
	res.status(404);
	res.render("404");
})

app.listen(port, function (err) {
    console.log("Node application listening on port "+port);
    if (err)
        console.log(err);
})