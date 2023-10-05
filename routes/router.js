const router = require('express').Router();

const database = include('databaseConnectionMongoDB');
var ObjectId = require('mongodb').ObjectId;

const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');


const cloud_name = process.env.CLOUDINARY_CLOUD_NAME; 

const cloudinary = require('cloudinary');
cloudinary.config({ 
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME, 
  api_key: process.env.CLOUDINARY_CLOUD_KEY,
  api_secret: process.env.CLOUDINARY_CLOUD_SECRET
});
const mongoose = require('mongoose');

const bodyparser = require('body-parser');
const BASE_URL = "http://hcgaikfxpe.us19.qoddiapp.com"; // Replace 'yourdomain.com' with your desired domain.


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
        console.log("user_id: " + user_id);

        // Joi validate
        const schema = Joi.object({
            user_id: Joi.string().alphanum().min(24).max(24).required()
        });

        const validationResult = schema.validate({ user_id });
        if (validationResult.error != null) {
            console.log(validationResult.error);
            res.render('error', { message: 'Invalid user_id' });
            return;
        }
        const medias = await mediaCollection.find({ "user_id": new ObjectId(user_id) }).toArray();

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
      res.redirect(`/showMedia?id=${user_id}`);
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

  function createShortUrl(originalUrl) {
    const id = crypto.randomBytes(4).toString('hex');  // Create a random 8-character identifier
    const shortUrl = `${BASE_URL}/${id}`;
    return shortUrl;
  }

  router.post('/addMedia', upload.single('image'), async (req, res) => {
    try {
        console.log("form submit");
  
        let user_id = req.body.user_id;
        let media_type = req.body.media_type;
        let original_link = req.body.original_link;
        let text_content = req.body.text_content;
        let title = req.body.title;
        let active = req.body.active === 'true';
        let url = `${BASE_URL}/${uuidv4()}`;
        let custom_url = req.body.custom_url;
  
        
        // Create schema for validation
        const schema = Joi.object({
            user_id: Joi.string().alphanum().min(24).max(24).required(),
            media_type: Joi.string().valid('links', 'image', 'text').required(),
            title: Joi.string().min(1).required(),
            shortURL: Joi.string().uri().optional(),
            original_link: Joi.when('media_type', {
                is: 'links',
                then: Joi.string().uri().required(),
                otherwise: Joi.optional()
            }),
            text_content: Joi.when('media_type', {
                is: 'text',
                then: Joi.string().min(1).required(),
                otherwise: Joi.optional()
            }),
            active: Joi.boolean().required(),
            url: Joi.string().uri().required(),
            created: Joi.date(),
            last_hit: Joi.date()
        }).options({ allowUnknown: true });

        if (media_type === 'image' && !req.file) {
          return res.render('error', { message: 'Image file is required for image media type' });
      }
  
        // Validate the request data
        const validationResult = schema.validate({
            user_id,
            media_type,
            title,
            original_link,
            text_content,
            active,
            url,
            shortURL: media_type === 'links' ? createShortUrl(original_link) : undefined,
            created: new Date(),
            last_hit: new Date()
        });
  
        if (validationResult.error != null) {
            console.log(validationResult.error);
            res.render('error', { message: 'Invalid data provided' });
            return;
        }

        if (media_type === 'image') {
          let buf64 = req.file.buffer.toString('base64');
          await cloudinary.uploader.upload("data:image/png;base64," + buf64, function(result) {
              url = result.url;
          });
      }
        // Check if a custom_url is provided
        let shortURL;
        if (custom_url) {
          // Prepend the domain to the custom_url
          shortURL = `${BASE_URL}/${custom_url}`;
        } else {
          // Generate a short URL as before
          shortURL = createShortUrl(original_link);
        }
  
        
        const existingMediaItem = await mediaCollection.findOne({ shortURL: shortURL });
        if (existingMediaItem) {
          let allMedia = await mediaCollection.find({ user_id: new ObjectId(user_id) }).toArray();
          res.render('home', { error: 'Custom URL already exists', user_id: user_id, allMedia: allMedia });
          return;
        }
      
        
  
        // Create a document object with common fields
        const document = {
            user_id: new ObjectId(user_id),
            media_type,
            title,
            active,
            url,
            shortURL: shortURL,
            created: new Date(),
            last_hit: new Date(),
            hits: 0
        };
  
        // Add media-specific fields to the document object
        if (media_type === 'links') {
          document.original_link = original_link;
      } else if (media_type === 'text') {
          document.text_content = text_content;
      } else if (media_type === 'image') {
          document.image_url = url; // Use the Cloudinary URL here
      }
  
        
  
        // MongoDB will automatically create a unique _id for each document
        const result = await mediaCollection.insertOne(document);
        if (media_type === 'text') {
          // Now that the document has been inserted, the _id field has been generated
          // Update the document to set the url field
          const newUrl = `${BASE_URL}/textpage/${result.insertedId}`;
          await mediaCollection.updateOne(
              { _id: result.insertedId },
              { $set: { url: newUrl } }
          );
      }
  
        res.redirect(`/showMedia?id=${user_id}`);
    } catch (ex) {
        res.render('error', { message: 'Error connecting to MongoDB' });
        console.log("Error connecting to MongoDB");
        console.log(ex);
    }
  });
  
  
  
  router.get('/media/:id', async (req, res) => {
    try {
        const shortUrl = `${BASE_URL}/${req.params.id}`;
        const mediaItem = await mediaCollection.findOne({ shortURL: shortUrl });
        if (mediaItem && mediaItem.media_type === 'links') {
            await updateLastHit(mediaItem._id.toString());  // Update the last_hit field
            res.redirect(mediaItem.original_link);
        } else {
            res.status(404).send('Not found');
        }
    } catch (ex) {
        res.render('error', { message: 'Error connecting to MongoDB' });
        console.log("Error connecting to MongoDB");
        console.log(ex);
    }
  });
  
  async function checkActive(req, res, next) {
    const id = req.params.id;
    if (!ObjectId.isValid(id)) {
        res.status(400).send('Invalid id format');
        return;
    }
    const mediaItem = await mediaCollection.findOne({ _id: new ObjectId(id) });
    if (mediaItem && mediaItem.active) {
        next();  // Media item is active, proceed to the next middleware
    } else if (mediaItem) {
        // Media item is not active, redirect back to media page
        let allMedia = await mediaCollection.find({ user_id: new ObjectId(mediaItem.user_id) }).toArray();
        res.render('home', { error: 'Link is disabled', user_id: mediaItem.user_id, allMedia: allMedia });
    } else {
        res.status(404).send('Not found');
    }
  }
  
  
  router.get('/redirect/:id', checkActive, async (req, res) => {
    try {
      const id = req.params.id;
      // Validate id format before creating ObjectId
      if (!ObjectId.isValid(id)) {
        res.status(400).send('Invalid id format');
        return;
      }
      // Fetch the media item from the database
      const mediaItem = await mediaCollection.findOne({ _id: new ObjectId(id) });
      if (mediaItem) {
        if (!mediaItem.active) {
          let allMedia = await mediaCollection.find({ user_id: new ObjectId(mediaItem.user_id) }).toArray();
          res.render('home', { error: 'Link is disabled', user_id: mediaItem.user_id, allMedia: allMedia });
          return;
      }
      
  
        await updateLastHitAndHits(id);  // Update the last_hit and hits fields
        //need to implement the image redirect
      let redirectURL;
      if (mediaItem.media_type === 'image') {
        // If it's an image type, set the redirect URL to the image URL
        redirectURL = mediaItem.image_url;
      } else {
        redirectURL = mediaItem.original_link || `/textpage/${id}`;
      }

      res.render('countdown', {
        shortURL: mediaItem.shortURL,
        customURL: mediaItem.custom_url,  // Assume there's a custom_url field
        url: redirectURL,
        seconds: 5
      });
  
      } else {
        res.status(404).send('Not found');
      }
    } catch (ex) {
      res.render('error', { message: 'Error connecting to MongoDB' });
      console.log("Error connecting to MongoDB");
      console.log(ex);
    }
  });
  
  
  
  
  
  async function updateLastHitAndHits(mediaId) {
    try {
        const result = await mediaCollection.updateOne(
            { _id: new ObjectId(mediaId) },
            {
                $set: { last_hit: new Date() },
                $inc: { hits: 1 }  // Increment the hits field by 1
            }
        );
        console.log(`${result.matchedCount} document(s) matched the filter, updated ${result.modifiedCount} document(s)`);
    } catch (error) {
        console.error(`An error occurred: ${error}`);
    }
  }
  
  
  
  
  
  
  router.get('/showMedia', async (req, res) => {
    console.log("show media hit");
    try {
        let user_id = req.query.id;
        console.log("userId: " + user_id);
  
        // Joi validate
        const schema = Joi.object({
            user_id: Joi.string().alphanum().min(24).max(24).required()
        });
  
        const validationResult = schema.validate({ user_id });
        if (validationResult.error != null) {
            console.log(validationResult.error);
            res.render('error', { message: 'Invalid user_id' });
            return;
        }
  
        // Fetch media based on user_id
        const media = await mediaCollection.find({ "user_id": new ObjectId(user_id) }).toArray();
        if (media === null) {
            res.render('error', { message: 'Error connecting to MongoDB' });
            console.log("Error connecting to media collection");
        }
        else {
            console.log(media);
            res.render('home', { allMedia: media, user_id: user_id });  // _id can be accessed directly in your media.ejs file
        }
    }
    catch (ex) {
        res.render('error', { message: 'Error connecting to MongoDB' });
        console.log("Error connecting to MongoDB");
        console.log(ex);
    }
  });
  
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
  
  
  router.get('/filter/:mediaType', async (req, res) => {
    try {
        const mediaType = req.params.mediaType;
        const userId = req.query.user_id;  // Get user_id from the query parameters
        
        let query = {};  // Default is to fetch all media items
        if (mediaType !== 'all') {
            query.media_type = mediaType;
        }
        
        const filteredMediaItems = await mediaCollection.find(query).toArray();
        res.render('home', { allMedia: filteredMediaItems, user_id: userId });
    } catch (ex) {
        res.render('error', { message: 'Error filtering media items' });
        console.error('Error filtering media items:', ex);
    }
});


  
  
  // Assuming you have already defined your Express app and mediaCollection
  
  router.post('/activateMedia', async (req, res) => {
    try {
        const media_id = req.body.media_id;
        const user_id = req.body.user_id;
  
        // Update the active field of the media item to true
        await mediaCollection.updateOne(
            { _id: new ObjectId(media_id), user_id: new ObjectId(user_id) },
            { $set: { active: true } }
        );
  
        // Redirect back to the /showMedia page
        res.redirect(`/showMedia?id=${user_id}`);
    } catch (ex) {
        res.render('error', { message: 'Error activating media item' });
        console.log("Error activating media item");
        console.log(ex);
    }
  });
  
  router.post('/deactivateMedia', async (req, res) => {
    try {
        const media_id = req.body.media_id;
        const user_id = req.body.user_id;
  
        // Update the active field of the media item to false
        await mediaCollection.updateOne(
            { _id: new ObjectId(media_id), user_id: new ObjectId(user_id) },
            { $set: { active: false } }
        );
  
        // Redirect back to the /showMedia page
        res.redirect(`/showMedia?id=${user_id}`);
    } catch (ex) {
        res.render('error', { message: 'Error deactivating media item' });
        console.log("Error deactivating media item");
        console.log(ex);
    }
  });
  
  
  // Route to activate a media item
  router.post('/activateMedia', async (req, res) => {
    const mediaId = req.body.media_id;
    await mediaCollection.updateOne({ _id: new ObjectId(mediaId) }, { $set: { active: true } });
    res.redirect(`/showMedia?id=${req.body.user_id}`);
  });
  
  // Route to deactivate a media item
  router.post('/deactivateMedia', async (req, res) => {
    const mediaId = req.body.media_id;
    await mediaCollection.updateOne({ _id: new ObjectId(mediaId) }, { $set: { active: false } });
    res.redirect(`/showMedia?id=${req.body.user_id}`);
  });
  
  router.get('/textpage/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const mediaItem = await mediaCollection.findOne({ _id: new ObjectId(id) });
  
        if (!mediaItem || mediaItem.media_type !== 'text') {
            res.render('error', { message: 'Invalid media item ID or type' });
            return;
        }
  
        res.render('textpage', { text_content: mediaItem.text_content });
    } catch (ex) {
        res.render('error', { message: 'Error retrieving text content' });
        console.log("Error retrieving text content:", ex);
    }
  });
  
  router.get('/countdown/:id', checkActive, async (req, res) => {
    try {
      const id = req.params.id;
      // Validate id format before creating ObjectId
      if (!ObjectId.isValid(id)) {
        res.render('error', { message: 'Invalid id format' });
        return;
      }
      const mediaItem = await mediaCollection.findOne({ _id: new ObjectId(id) });
      if (mediaItem) {
        if (!mediaItem.active) {
          let allMedia = await mediaCollection.find({ user_id: new ObjectId(mediaItem.user_id) }).toArray();
          res.render('home', { error: 'Link is disabled', user_id: mediaItem.user_id, allMedia: allMedia });
          return;
        }
        
        // Update the last_hit and hits fields
        await updateLastHitAndHits(id);
        
        // Pass the necessary data to the countdown page
        res.render('countdown', {
          url: mediaItem.original_link,
          shortURL: mediaItem.shortURL,
          customURL: mediaItem.custom_url,  // Assume there's a custom_url field
          seconds: 5
        });
      } else {
        res.render('error', { message: 'Not found' });
      }
    } catch (ex) {
      res.render('error', { message: 'Error connecting to MongoDB' });
      console.log("Error connecting to MongoDB");
      console.log(ex);
    }
  });
  
  
  router.get('/showImage', async (req, res) => {
	console.log("page hit");
	try {
		let user_id = req.query.id;
		console.log("user_id: " + user_id);
  
		// Joi validate
		const schema = Joi.object({
			user_id: Joi.string().alphanum().min(24).max(24).required()
		});
  
		const validationResult = schema.validate({ user_id });
		if (validationResult.error != null) {
			console.log(validationResult.error);
			res.render('error', { message: 'Invalid user_id' });
			return;
		}
  
		// Fetch media based on user_id
		const media = await mediaCollection.find({ "user_id": new ObjectId(user_id) }).toArray();
		if (media === null) {
			res.render('error', { message: 'Error connecting to MongoDB' });
			console.log("Error connecting to media collection");
		}
		else {
			console.log(media);
			res.render('addImage', { allMedias: media, user_id: user_id });  // _id can be accessed directly in your media.ejs file
		}
	}
	catch (ex) {
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
  

  
		res.redirect("/");
	  });
	} catch (ex) {
	  res.render('error', { message: 'Error connecting to MongoDB' });
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
