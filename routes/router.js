const router = require('express').Router();

const database = include('databaseConnectionMongoDB');
var ObjectId = require('mongodb').ObjectId;

const crypto = require('crypto');
const {v4: uuid} = require('uuid');

const passwordPepper = "SeCretPeppa4MySal+";

// const cloud_name = process.env.CLOUDINARY_CLOUD_NAME; Never Read

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

router.get('/', async (req, res) => {
	console.log("page hit");
	res.render("index.ejs");

	// try {
	// 	const users = await userCollection.find().project({username: 1, name: 1, _id: 1}).toArray();

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

// router.get('/deleteUser', async (req, res) => {
// 	try {
// 		console.log("delete user");

// 		let user_id = req.query.id;

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

// 		if (user_id) {
// 			console.log("userId: "+user_id);
// 			const result1 = await mediaCollection.deleteMany({"user_id": new ObjectId(user_id)});
// 			const result2 = await userCollection.deleteOne({"_id": new ObjectId(user_id)});

// 			console.log("deleteUser: ");
// 		}
// 		res.redirect("/");
// 	}
// 	catch(ex) {
// 		res.render('error', {message: 'Error connecting to MongoDB'});
// 		console.log("Error connecting to MongoDB");
// 		console.log(ex);	
// 	}
// });

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

module.exports = router;
