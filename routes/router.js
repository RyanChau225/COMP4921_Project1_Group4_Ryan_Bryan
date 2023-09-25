const router = require('express').Router();

const database = include('databaseConnectionMongoDB');
var ObjectId = require('mongodb').ObjectId;

const crypto = require('crypto');
const {v4: uuid} = require('uuid');

const passwordPepper = "SeCretPeppa4MySal+";

const cloud_name = process.env.CLOUDINARY_CLOUD_NAME; 

const cloudinary = require('cloudinary');
cloudinary.config({ 
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME, 
  api_key: process.env.CLOUDINARY_CLOUD_KEY,
  api_secret: process.env.CLOUDINARY_CLOUD_SECRET
});




const multer  = require('multer')
const storage = multer.memoryStorage()
const upload = multer({ storage: storage })

const mongodb_database = process.env.REMOTE_MONGODB_DATABASE;
const userCollection = database.db(mongodb_database).collection('users');
const mediaCollection = database.db(mongodb_database).collection('Media');

const Joi = require("joi");
const mongoSanitize = require('express-mongo-sanitize');

router.use(mongoSanitize(
    {replaceWith: '%'}
));

const mongoose = require('mongoose');

const bodyparser = require('body-parser');

const bcrypt = require('bcrypt');
const {
    render
} = require('express/lib/response');
const session = require('express-session');
const MongoStore = require('connect-mongodb-session')(session);
const express = require('express');


const req = require('express/lib/request');
const ejs = require('ejs');

const secret_token = process.env.SECRET_TOKEN

// router.use(bodyparser.urlencoded({
//     parameterLimit: 100000,
//     limit: '50mb',
//     extended: true
// }));

// Use the session middleware
router.use(session({
    secret: `${secret_token}`,
    saveUninitialized: true,
    resave: true
}));
const db = mongoose.connection;
const userSchema = new mongoose.Schema({
	username: String,
	password: String,
	name: String,
	admin: Boolean
})

const userModel = mongoose.model("users", userSchema);

router.get('/', async (req, res) => {
	console.log("page hit");
	res.render("index.ejs");

	// try {
	// 	const users = await userCollection.find().project({username: 1, email: 1, _id: 1}).toArray();

	// 	if (users === null) {
	// 		res.render('error', {message: 'Error connecting to MongoDB'});
	// 		console.log("Error connecting to user collection");
	// 	}
	// 	else {
	// 		users.map((item) => {
	// 			item.user_id = item._id;
	// 			return item;
	// 		});
	// 		console.log(users);

	// 		res.render('index', {allUsers: users});
	// 	}
	// }
	// catch(ex) {
	// 	res.render('error', {message: 'Error connecting to MongoDB'});
	// 	console.log("Error connecting to MongoDB");
	// 	console.log(ex);
	// }
});

router.get('/login', (req, res) => {
	res.render('login.ejs', { message: req.session.message });
  });

  router.post('/login', (req, res) => {
	let usernameToCheck = req.body.email;
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

  router.get('/home', (req, res) => {
	if (!req.session.authenticated) {
	  return res.redirect('/login');
	}
  
	User.findById(req.session.userId, (err, user) => {
	  if (err || !user) {
		return res.render('error', { message: 'User not found' });
	  }
  
	  res.render('home.ejs', { user });
	});
  });
  
  router.get('/logout', (req, res) => {
	req.session.destroy((err) => {
	  if (err) {
		console.error(err);
	  }
	  res.redirect('/login');
	});
  });
  

router.get('/pic', async (req, res) => {
	  res.send('<form action="picUpload" method="post" enctype="multipart/form-data">'
    + '<p>Public ID: <input type="text" name="title"/></p>'
    + '<p>Image: <input type="file" name="image"/></p>'
    + '<p><input type="submit" value="Upload"/></p>'
    + '</form>');
});

router.post('/picUpload', upload.single('image'), function(req, res, next) {
	let buf64 = req.file.buffer.toString('base64');
  stream = cloudinary.uploader.upload("data:image/png;base64," + buf64, function(result) { //_stream
    console.log(result);
    res.send('Done:<br/> <img src="' + result.url + '"/><br/>' +
             cloudinary.image(result.public_id, { format: "png", width: 100, height: 130, crop: "fit" }));
  }, { public_id: req.body.title } );
  console.log(req.body);
  console.log(req.file);

});

function sleep(ms) {
	return new Promise(resolve => setTimeout(resolve, ms));
}

router.post('/setmediaPic', upload.single('image'), function(req, res, next) {
	let image_uuid = uuid();
	let media_id = req.body.media_id;
	let user_id = req.body.user_id;
	let buf64 = req.file.buffer.toString('base64');
	stream = cloudinary.uploader.upload("data:image/octet-stream;base64," + buf64, async function(result) { 
			try {
				console.log(result);

				console.log("userId: "+user_id);


				// Joi validate
				const schema = Joi.object(
				{
					media_id: Joi.string().alphanum().min(24).max(24).required(),
					user_id: Joi.string().alphanum().min(24).max(24).required()
				});
			
				const validationResult = schema.validate({media_id, user_id});
				if (validationResult.error != null) {
					console.log(validationResult.error);

					res.render('error', {message: 'Invalid media_id or user_id'});
					return;
				}				
				const success = await mediaCollection.updateOne({"_id": new ObjectId(media_id)},
					{$set: {image_id: image_uuid}},
					{}
				);

				if (!success) {
					res.render('error', {message: 'Error uploading media image to MongoDB'});
					console.log("Error uploading media image");
				}
				else {
					res.redirect(`/showMedia?id=${user_id}`);
				}
			}
			catch(ex) {
				res.render('error', {message: 'Error connecting to MongoDB'});
				console.log("Error connecting to MongoDB");
				console.log(ex);
			}
		}, 
		{ public_id: image_uuid }
	);
	console.log(req.body);
	console.log(req.file);
});

router.get('/showMedia', async (req, res) => {
	console.log("page hit");
	try {
		let user_id = req.query.id;
		console.log("userId: "+user_id);

		// Joi validate
		const schema = Joi.object(
			{
				user_id: Joi.string().alphanum().min(24).max(24).required()
			});
		
		const validationResult = schema.validate({user_id});
		if (validationResult.error != null) {
			console.log(validationResult.error);

			res.render('error', {message: 'Invalid user_id'});
			return;
		}				
		const Media = await mediaCollection.find({"user_id": new ObjectId(user_id)}).toArray();

		if (Media === null) {
			res.render('error', {message: 'Error connecting to MongoDB'});
			console.log("Error connecting to userModel");
		}
		else {
			Media.map((item) => {
				item.media_id = item._id;
				return item;
			});			
			console.log(Media);
			res.render('Media', {allMedia: Media, user_id: user_id});
		}
	}
	catch(ex) {
		res.render('error', {message: 'Error connecting to MongoDB'});
		console.log("Error connecting to MongoDB");
		console.log(ex);
	}
});


router.get('/deletemediaImage', async (req, res) => {
	try {
		console.log("delete media image");

		let media_id = req.query.id;
		let user_id = req.query.user;

		const schema = Joi.object(
			{
				user_id: Joi.string().alphanum().min(24).max(24).required(),
				media_id: Joi.string().alphanum().min(24).max(24).required(),
			});
		
		const validationResult = schema.validate({user_id, media_id});
		
		if (validationResult.error != null) {
			console.log(validationResult.error);

			res.render('error', {message: 'Invalid user_id or media_id'});
			return;
		}				

		if (media_id) {
			console.log("mediaId: "+media_id);
			const success = await mediaCollection.updateOne({"_id": new ObjectId(media_id)},
				{$set: {image_id: undefined}},
				{}
			);

			console.log("delete media Image: ");
			console.log(success);
			if (!success) {
				res.render('error', {message: 'Error connecting to MongoDB'});
				return;
			}
		}
		res.redirect(`/showMedia?id=${user_id}`);
	}
	catch(ex) {
		res.render('error', {message: 'Error connecting to MongoDB'});
		console.log("Error connecting to MongoDB");
		console.log(ex);	
	}
});

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
    router.post('/addUser', (req, res) => {
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
                res.send(true);
            }
        })
    })


router.post('/addmedia', async (req, res) => {
	try {
		console.log("form submit");

		let user_id = req.body.user_id;

		const schema = Joi.object(
			{
				user_id: Joi.string().alphanum().min(24).max(24).required(),
				name: Joi.string().alphanum().min(2).max(50).required(),
				media_type: Joi.string().alphanum().min(2).max(150).required()
			});
		
		const validationResult = schema.validate({user_id, name: req.body.media_name, media_type: req.body.media_type});
		
		if (validationResult.error != null) {
			console.log(validationResult.error);

			res.render('error', {message: 'Invalid username, name'});
			return;
		}				


		await mediaCollection.insertOne(
			{	
				name: req.body.media_name,
				user_id: new ObjectId(user_id),
				media_type: req.body.media_type,
			}
		);

		res.redirect(`/showMedia?id=${user_id}`);
	}
	catch(ex) {
		res.render('error', {message: 'Error connecting to MongoDB'});
		console.log("Error connecting to MongoDB");
		console.log(ex);	
	}
});




// Render signup.ejs
router.get('/signup', (req, res) => {
    res.render("signup.ejs");
})





router.get("*", (req,res) => {
	res.status(404);
	res.render("404");
})

module.exports = router;
