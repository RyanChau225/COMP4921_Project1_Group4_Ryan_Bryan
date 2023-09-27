const router = require('express').Router();

const database = include('databaseConnectionMongoDB');
var ObjectId = require('mongodb').ObjectId;

const crypto = require('crypto');
const {v4: uuid} = require('uuid');

const cloud_name = process.env.CLOUDINARY_CLOUD_NAME; 

const cloudinary = require('cloudinary');
cloudinary.config({ 
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME, 
  api_key: process.env.CLOUDINARY_CLOUD_KEY,
  api_secret: process.env.CLOUDINARY_CLOUD_SECRET
});
const mongoose = require('mongoose');

const bodyparser = require('body-parser');

const bcrypt = require('bcrypt');
const {
    render
} = require('express/lib/response');
const session = require('express-session');
const MongoStore = require('connect-mongodb-session')(session);
const express = require('express');
const passwordComplexity = require("joi-password-complexity");

const complexityOptions = {
  min: 10,            // Minimum length
  max: 30,            // Maximum length (adjust as needed)
  lowerCase: 1,       // Require at least 1 lowercase letter
  upperCase: 1,       // Require at least 1 uppercase letter
  numeric: 1,         // Require at least 1 digit
  symbol: 1,          // Require at least 1 special character
  requirementCount: 4, // Total number of requirements to satisfy
};

const req = require('express/lib/request');
const ejs = require('ejs');
const multer  = require('multer')
const storage = multer.memoryStorage()
const upload = multer({ storage: storage })

const mongodb_database = process.env.REMOTE_MONGODB_DATABASE;
const userCollection = database.db(mongodb_database).collection('users');
const mediaCollection = database.db(mongodb_database).collection('Media');


const imageCollection = database.db(mongodb_database).collection('images');
const textCollection = database.db(mongodb_database).collection('text');



const Joi = require("joi");
const mongoSanitize = require('express-mongo-sanitize');

router.use(mongoSanitize(
    {replaceWith: '%'}
));

const secret_token = process.env.SECRET_TOKEN

// router.use(bodyparser.urlencoded({
//     parameterLimit: 100000,
//     limit: '50mb',
//     extended: true
// }));
router.use((req, res, next) => {
	// Set Expires header to a past date
	res.header('Expires', '-1');
	// Set other cache control headers
	res.header('Cache-Control', 'no-cache, private, no-store, must-revalidate');
	next();
  });

router.use(session({
    secret: `${secret_token}`,
    saveUninitialized: true,
    resave: true
}));


router.get('/', async (req, res) => {
	console.log("page hit");
	res.render("index.ejs");
});


router.get('/login', (req, res) => {
    res.render('login'); 
});


router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        const user = await userCollection.findOne({ email });

        if (!user) {
            return res.render('login', { message: 'Invalid email or password' });
        }

    
        const isPasswordValid = await bcrypt.compare(password, user.password);

        if (!isPasswordValid) {
            return res.render('login', { message: 'Invalid email or password' });
        }

req.session.authenticated = true;
req.session.user_id = user._id;    

        res.redirect('/home'); 
    } catch (ex) {
        res.render('error', { message: 'Error connecting to MongoDB' });
        console.error("Error connecting to MongoDB", ex);
    }
});

router.post('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.error('Error destroying session:', err);
        }
        res.redirect('/login'); 
    });
});

function requireAuthentication(req, res, next) {
	if (req.session.authenticated) {

	  next();
	} else {

	  console.log("REQUIRE AUTH")
	  res.redirect('/login'); 
	}
  }
  

  router.get('/home', requireAuthentication, async (req, res) => {

	try {
		let user_id = req.session.user_id;
		console.log("user_id: "+user_id);

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
		const medias = await mediaCollection.find({"user_id": new ObjectId(user_id)}).toArray();

		if (medias === null) {
			res.render('error', {message: 'Error connecting to MongoDB'});
			console.log("Error connecting to userModel");
		}
		else {
			medias.map((item) => {
				item.media_id = item._id;
				return item;
			});			
			console.log(medias);
			res.render('home', {allMedias: medias, user_id: user_id});
		}
	}
	catch(ex) {
		res.render('error', {message: 'Error connecting to MongoDB'});
		console.log("Error connecting to MongoDB");
		console.log(ex);

	}


 // GETS ALL MEDIA (NOT JUST THE USERS, NEED TO SWAP TO "showpets" version)
	// try {
	// 	const media = await mediaCollection.find().project({_id: 1}).toArray();

	// 	if (media === null) {
	// 		// res.render('error', {message: 'Error connecting to MongoDB'});
	// 		console.log("Error connecting to user collection");
	// 	}
	// 	else {
	// 		media.map((item) => {
	// 			item.user_id = item._id;
	// 			return item;
	// 		});
	// 		console.log(media);

	// 		res.render('home', {allMedias: media});
	// 	}
	// }
	// catch(ex) {
	// 	res.render('error', {message: 'Error connecting to MySQL'});
	// 	console.log("Error connecting to MySQL");
	// 	console.log(ex);
	// }

	
  });


  router.post('/addMedia', async (req, res) => {
	try {
		console.log("form submit");
  
		let user_id = req.body.user_id;
		let media_type = req.body.media_type;
		let original_link = req.body.original_link;
		let text_content = req.body.text_content;  // Extract text content from the request
		let active = req.body.active === 'true';  // Convert the active field to a boolean value
		// let url = req.body.url;  // Assuming url is generated elsewhere and passed in the request
		// let shortURL = req.body.shortURL;  // Assuming shortURL is generated elsewhere and passed in the request
		let url = 'https://example.com';  // Replace with your default URL
		let shortURL = 'https://example.com/short';  // Replace with your default short URL
		
  
		// Create schema for validation
		const schema = Joi.object({
		  user_id: Joi.string().alphanum().min(24).max(24).required(),
		  media_type: Joi.string().valid('links', 'image', 'text').required(),
		  original_link: Joi.when('media_type', {
			  is: 'links',
			  then: Joi.string().uri().required(),
			  otherwise: Joi.optional()  // Make this field optional when media_type is not 'links'
		  }),
		  text_content: Joi.when('media_type', {
			  is: 'text',
			  then: Joi.string().required(),
			  otherwise: Joi.optional()  // Make this field optional when media_type is not 'text'
		  }),
		  active: Joi.boolean().required(),
		  url: Joi.string().uri().required(),
		  shortURL: Joi.string().uri().required(),
		  created: Joi.date(),
		  last_hit: Joi.date()
	  }).options({ allowUnknown: true });  // Allow unknown keys
  
		// Validate the request data
		const validationResult = schema.validate({
			user_id,
			media_type,
			original_link,
			text_content,  // Include text_content in the validation
			active,
			url,
			shortURL,
			created: new Date(),
			last_hit: new Date()  // Assuming last_hit is updated to the current date when the media is created
		});
  
		if (validationResult.error != null) {
			console.log(validationResult.error);
			res.render('error', { message: 'Invalid data provided' });
			return;
		}
  
		// Create a document object with common fields
		const document = {
			user_id: new ObjectId(user_id),
			media_type,
			active,
			url,
			shortURL,
			created: new Date(),
			last_hit: new Date()
		};
  
		// Add media-specific fields to the document object
		if (media_type === 'links') {
			document.original_link = original_link;
		} else if (media_type === 'text') {
			document.text_content = text_content;
		}
  
		// MongoDB will automatically create a unique _id for each document
		await mediaCollection.insertOne(document);
  
		res.redirect(`/showMedia?id=${user_id}`);
	} catch (ex) {
		res.render('error', { message: 'Error connecting to MongoDB' });
		console.log("Error connecting to MongoDB");
		console.log(ex);
	}
  });
  
  
  
//   router.get('/showMedia', async (req, res) => {
// 	console.log("page hit");
// 	try {
// 		let user_id = req.query.id;
// 		console.log("user_id: " + user_id);
  
// 		// Joi validate
// 		const schema = Joi.object({
// 			user_id: Joi.string().alphanum().min(24).max(24).required()
// 		});
  
// 		const validationResult = schema.validate({ user_id });
// 		if (validationResult.error != null) {
// 			console.log(validationResult.error);
// 			res.render('error', { message: 'Invalid user_id' });
// 			return;
// 		}
  
// 		// Fetch media based on user_id
// 		const media = await mediaCollection.find({ "user_id": new ObjectId(user_id) }).toArray();
// 		if (media === null) {
// 			res.render('error', { message: 'Error connecting to MongoDB' });
// 			console.log("Error connecting to media collection");
// 		}
// 		else {
// 			console.log(media);
// 			res.render('media', { allMedias: media, user_id: user_id });  // _id can be accessed directly in your media.ejs file
// 		}
// 	}
// 	catch (ex) {
// 		res.render('error', { message: 'Error connecting to MongoDB' });
// 		console.log("Error connecting to MongoDB");
// 		console.log(ex);
// 	}
//   });
  
  router.get('/media/:id', async (req, res) => {
	try {
		const mediaId = req.params.id;
		const mediaItem = await mediaCollection.findOne({ _id: new ObjectId(mediaId) });
  
		if (mediaItem) {
			if (mediaItem.media_type === 'text') {
				res.render('textPage', { textContent: mediaItem.text_content });
			} else if (mediaItem.media_type === 'links') {
				res.redirect(mediaItem.original_link);
			} else {
				res.render('error', { message: 'Invalid media type' });
			}
		} else {
			res.render('error', { message: 'Media item not found' });
		}
	} catch (ex) {
		res.render('error', { message: 'Error connecting to MongoDB' });
		console.log("Error connecting to MongoDB");
		console.log(ex);
	}
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

				console.log("user_id: "+user_id);


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

// router.get('/showMedia', async (req, res) => {
// 	console.log("page hit");
// 	try {
// 		let user_id = req.query.id;
// 		console.log("user_id: "+user_id);

// 		// Joi validate
// 		const schema = Joi.object(
// 			{
// 				user_id: Joi.string().alphanum().min(24).max(24).required()
// 			});
		
// 		const validationResult = schema.validate({user_id});
// 		if (validationResult.error != null) {
// 			console.log(validationResult.error);

// 			res.render('error', {message: 'Invalid user_id'});
// 			return;
// 		}				
// 		const Media = await mediaCollection.find({"user_id": new ObjectId(user_id)}).toArray();

// 		if (Media === null) {
// 			res.render('error', {message: 'Error connecting to MongoDB'});
// 			console.log("Error connecting to userModel");
// 		}
// 		else {
// 			Media.map((item) => {
// 				item.media_id = item._id;
// 				return item;
// 			});			
// 			console.log(Media);
// 			res.render('Media', {allMedia: Media, user_id: user_id});
// 		}
// 	}
// 	catch(ex) {
// 		res.render('error', {message: 'Error connecting to MongoDB'});
// 		console.log("Error connecting to MongoDB");
// 		console.log(ex);
// 	}
// });


// router.get('/deletemediaImage', async (req, res) => {
// 	try {
// 		console.log("delete media image");

// 		let media_id = req.query.id;
// 		let user_id = req.query.user;

// 		const schema = Joi.object(
// 			{
// 				user_id: Joi.string().alphanum().min(24).max(24).required(),
// 				media_id: Joi.string().alphanum().min(24).max(24).required(),
// 			});
		
// 		const validationResult = schema.validate({user_id, media_id});
		
// 		if (validationResult.error != null) {
// 			console.log(validationResult.error);

// 			res.render('error', {message: 'Invalid user_id or media_id'});
// 			return;
// 		}				

// 		if (media_id) {
// 			console.log("mediaId: "+media_id);
// 			const success = await mediaCollection.updateOne({"_id": new ObjectId(media_id)},
// 				{$set: {image_id: undefined}},
// 				{}
// 			);

// 			console.log("delete media Image: ");
// 			console.log(success);
// 			if (!success) {
// 				res.render('error', {message: 'Error connecting to MongoDB'});
// 				return;
// 			}
// 		}
// 		res.redirect(`/showMedia?id=${user_id}`);
// 	}
// 	catch(ex) {
// 		res.render('error', {message: 'Error connecting to MongoDB'});
// 		console.log("Error connecting to MongoDB");
// 		console.log(ex);	
// 	}
// });

router.post('/addUser', async (req, res) => {
	try {
	  console.log("form submit");
  
	  const saltRounds = 10;
	  const schema = Joi.object({
		first_name: Joi.string().alphanum().min(2).max(50).required(),
		last_name: Joi.string().alphanum().min(2).max(50).required(),
		email: Joi.string().email().min(2).max(150).required(),
		password: passwordComplexity(complexityOptions).required(),
	  });
	  const validationResult = schema.validate({
		first_name: req.body.first_name,
		last_name: req.body.last_name,
		email: req.body.email,
		password: req.body.password,
	  });
  
	  if (validationResult.error != null) {
		console.log(validationResult.error);
  
		res.render('error', { message: validationResult.error.details[0].message });
		return;
	  }
  
	  // Check if the user already exists in the database
	  const existingUser = await userCollection.findOne({ email: req.body.email });
	  if (existingUser) {
		return res.render('error', { message: 'User with this email already exists' });
	  }
  
	  bcrypt.hash(req.body.password, saltRounds, async (err, hash) => {
		if (err) {
		  console.log(err);
		  return res.render('error', { message: 'An error occurred' });
		}
  
		await userCollection.insertOne({
		  first_name: req.body.first_name,
		  last_name: req.body.last_name,
		  email: req.body.email,
		  password: hash
		});
  
		// Login user via express-session
		// req.session.username = req.body.username;
  
		res.redirect("/");
	  });
	} catch (ex) {
	  res.render('error', { message: 'Error connecting to MongoDB' });
	  console.log("Error connecting to MongoDB");
	  console.log(ex);
	}
  });
  
// Function to check if the username exists in the database
// async function isUsernameInDb(username) {
//     const user = await userCollection.findOne({ username });
//     return !!user;
// }





// router.post('/addmedia', async (req, res) => {
// 	try {
// 		console.log("form submit");

// 		let user_id = req.body.user_id;

// 		const schema = Joi.object(
// 			{
// 				user_id: Joi.string().alphanum().min(24).max(24).required(),
// 				name: Joi.string().alphanum().min(2).max(50).required(),
// 				media_type: Joi.string().alphanum().min(2).max(150).required()
// 			});
		
// 		const validationResult = schema.validate({user_id, name: req.body.media_name, media_type: req.body.media_type});
		
// 		if (validationResult.error != null) {
// 			console.log(validationResult.error);

// 			res.render('error', {message: 'Invalid username, name'});
// 			return;
// 		}				


// 		await mediaCollection.insertOne(
// 			{	
// 				name: req.body.media_name,
// 				user_id: new ObjectId(user_id),
// 				media_type: req.body.media_type,
// 			}
// 		);

// 		res.redirect(`/showMedia?id=${user_id}`);
// 	}
// 	catch(ex) {
// 		res.render('error', {message: 'Error connecting to MongoDB'});
// 		console.log("Error connecting to MongoDB");
// 		console.log(ex);	
// 	}
// });

// Render addText.ejs
router.get('/addText', (req, res) => {
	const user_id = req.session.user_id;
    res.render("addText.ejs", { user_id: user_id });
})


router.get('/addImage', (req, res) => {
	const user_id = req.session.user_id;
	const medias = mediaCollection.find({"user_id": new ObjectId(user_id)}).toArray();
	res.render('addImage.ejs', {allMedias: medias, user_id: user_id});
});

// Render customURL.ejs
router.get('/addCustomURL', (req, res) => {
	const user_id = req.session.user_id;
    res.render("customURL.ejs", { user_id: user_id });
})


// Render signup.ejs
router.get('/signup', (req, res) => {
    res.render("signup.ejs");
})


router.get("*", (req,res) => {
	res.status(404);
	res.render("404");
})

module.exports = router;
