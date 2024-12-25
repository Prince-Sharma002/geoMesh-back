const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

// Initialize the app
const app = express();
const PORT = 5000;

// Middleware
app.use(cors());
app.use(bodyParser.json());

// MongoDB Connection
const MONGO_URI = 'mongodb+srv://prince:albert5060prince@cluster.ynomqgq.mongodb.net/polygon_data?retryWrites=true&w=majority&appName=cluster'; // Replace with your MongoDB URI
mongoose
  .connect(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.log(err));

// Define a Schema and Model
const PolygonSchema = new mongoose.Schema({
  coordinates: { type: [[[Number]]], required: true }, // Nested array for GeoJSON coordinates
  description: { type: String, required: true },
  color: { type: String, required: true , default: '#FF0000' },
  area: { type: Number, required: true , default: 0 },
  date: { type: Date, required: true },
  reviews: { type: [String], default: [] },
  likes: { type: Number, default: 0 },
  name : { type: [String], default: "" },
  email : { type: [String], default: "" },
  tag : { type: String, default: "none"  },
});

const Polygon = mongoose.model('Polygon', PolygonSchema);

// Define a Schema and Model for Marker
const MarkerSchema = new mongoose.Schema({
  coordinates: { type: [Number], required: true }, // [lat, lng]
  description: { type: String, required: true },
  date: { type: Date, required: true }
});

const Marker = mongoose.model('Marker', MarkerSchema);


const PersonInfoSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true }, // You should hash passwords before saving them
  dateOfBirth: { type: Date },
  isAdmin : { type: Boolean, default: false},
  createdAt: { type: Date, default: Date.now },
});

const PersonInfo = mongoose.model('PersonInfo', PersonInfoSchema);



// Routes
// 1. Save Polygon Data
app.post('/api/polygon', async (req, res) => {
  try {
    const polygon = new Polygon(req.body);
    const savedPolygon = await polygon.save();
    res.status(201).json(savedPolygon);
  } catch (err) {
    res.status(400).json({ message: 'Error saving data', error: err.message });
  }
});

// 2. Fetch All Polygons
app.get('/api/polygons', async (req, res) => {
  try {
    const polygons = await Polygon.find();
    res.status(200).json(polygons);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching data', error: err.message });
  }
});

// 3. Update Polygon Reviews and Likes
app.put('/api/polygon/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updatedPolygon = await Polygon.findByIdAndUpdate(id, req.body, { new: true });
    res.status(200).json(updatedPolygon);
  } catch (err) {
    res.status(400).json({ message: 'Error updating data', error: err.message });
  }
});

// Like a Polygon
app.put('/api/polygon/:id/like', async (req, res) => {
  try {
    const polygon = await Polygon.findById(req.params.id);
    if (!polygon) return res.status(404).json({ message: 'Polygon not found' });

    polygon.likes += 1;
    await polygon.save();

    res.status(200).json({ likes: polygon.likes });
  } catch (err) {
    res.status(500).json({ message: 'Error updating likes', error: err.message });
  }
});

// Add a Review to a Polygon
app.put('/api/polygon/:id/review', async (req, res) => {
  try {
    const polygon = await Polygon.findById(req.params.id);
    if (!polygon) return res.status(404).json({ message: 'Polygon not found' });

    const { review } = req.body;
    if (!review) return res.status(400).json({ message: 'Review content is required' });

    polygon.reviews.push(review);
    await polygon.save();

    res.status(200).json({ reviews: polygon.reviews });
  } catch (err) {
    res.status(500).json({ message: 'Error updating reviews', error: err.message });
  }
});

// Add this route in your server.js file
// Delete a Polygon
app.delete('/api/polygon/:id', async (req, res) => {
  try {
    const polygon = await Polygon.findByIdAndDelete(req.params.id);
    if (!polygon) return res.status(404).json({ message: 'Polygon not found' });

    res.status(200).json({ message: 'Polygon deleted successfully', deletedPolygon: polygon });
  } catch (err) {
    res.status(500).json({ message: 'Error deleting polygon', error: err.message });
  }
});


// Fetch Polygons by Email
app.get('/api/polygons/email', async (req, res) => {
  const { email } = req.query; // Get email from query params
  if (!email) {
    return res.status(400).json({ message: 'Email is required' });
  }

  try {
    const polygons = await Polygon.find({ email }); // Fetch polygons by email
    if (!polygons || polygons.length === 0) {
      return res.status(404).json({ message: 'No polygons found for this email' });
    }

    res.status(200).json(polygons);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching polygons', error: err.message });
  }
});


// 4. Save Marker Data
app.post('/api/marker', async (req, res) => {
  try {
    const marker = new Marker(req.body);
    const savedMarker = await marker.save();
    res.status(201).json(savedMarker);
  } catch (err) {
    res.status(400).json({ message: 'Error saving marker data', error: err.message });
  }
});

// 5. Fetch All Markers
app.get('/api/markers', async (req, res) => {
  try {
    const markers = await Marker.find();
    res.status(200).json(markers);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching markers', error: err.message });
  }
});


app.post('/api/signup', async (req, res) => {
  try {
    const { name, email, password, dateOfBirth  } = req.body;

    // Check if email already exists
    const existingUser = await PersonInfo.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'Email already exists' });
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create a new user
    const person = new PersonInfo({
      name,
      email,
      password: hashedPassword, // Save the hashed password
      // Set default isAdmin to false (you can change this to true if you want to make users admins)
      dateOfBirth,
    });

    const savedPerson = await person.save();
    res.status(201).json({ 
      message: 'Signup successful', 
      person: {
        id: savedPerson._id,
        name: savedPerson.name,
        email: savedPerson.email,
        dateOfBirth: savedPerson.dateOfBirth,
      }
    });
  } catch (err) {
    res.status(500).json({ message: 'Error during signup', error: err.message });
  }
});


app.post('/api/signin', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user by email
    const person = await PersonInfo.findOne({ email });
    if (!person) return res.status(400).json({ message: 'Invalid email or password' });

    // Compare passwords
    const isMatch = await bcrypt.compare(password, person.password);
    if (!isMatch) return res.status(400).json({ message: 'Invalid email or password' });

    // Generate a token
    const token = jwt.sign({ id: person._id }, 'your_jwt_secret', { expiresIn: '1h' });

    res.status(200).json({ message: 'Sign in successful', token ,  });
  } catch (err) {
    res.status(500).json({ message: 'Error during sign in', error: err.message , "admin" : person.isAdmin });
  }
});


// user data
app.get('/api/user', async (req, res) => {
  const email = req.query.email; // Get email from query params
  if (!email) {
    return res.status(400).json({ message: 'Email is required' });
  }

  try {
    const person = await PersonInfo.findOne({ email }); // Fetch user details from the database
    if (!person) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Send user details as response
    res.status(200).json({
      id: person._id,
      name: person.name,
      email: person.email,
      dateOfBirth: person.dateOfBirth,
    });
  } catch (err) {
    res.status(500).json({ message: 'Error fetching user details', error: err.message });
  }
});


// Fetch all users
app.get('/api/users', async (req, res) => {
  try {
    const users = await PersonInfo.find();
    res.status(200).json(users);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching users', error: err.message });
  }
});


// Fetch Polygons by Tag
app.get('/api/polygons/tag', async (req, res) => {
  const { tag } = req.query; // Get the tag from query params
  if (!tag) {
    return res.status(400).json({ message: 'Tag is required' });
  }

  try {
    const polygons = await Polygon.find({ tag }); // Fetch polygons by tag
    if (!polygons || polygons.length === 0) {
      return res.status(404).json({ message: 'No polygons found for this tag' });
    }

    res.status(200).json(polygons);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching polygons', error: err.message });
  }
});

// update the polygon
// app.put('/api/polygon/:id', async (req, res) => {
//   const { id } = req.params;

//   try {
//     const updatedPolygon = await Polygon.findByIdAndUpdate(
//       id,                 // The ID of the polygon to update
//       req.body,           // The updated data from the request body
//       { new: true, runValidators: true } // Return the updated document and validate
//     );

//     if (!updatedPolygon) {
//       return res.status(404).json({ message: 'Polygon not found' });
//     }

//     res.status(200).json({ 
//       message: 'Polygon updated successfully',
//       polygon: updatedPolygon
//     });
//   } catch (err) {
//     res.status(500).json({ message: 'Error updating polygon', error: err.message });
//   }
// });



// Update a Polygon by ID
app.put('/api/polygon/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const updatedPolygon = await Polygon.findByIdAndUpdate(
      id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!updatedPolygon) {
      return res.status(404).json({ message: 'Polygon not found' });
    }

    res.status(200).json({ 
      message: 'Polygon updated successfully',
      polygon: updatedPolygon
    });
  } catch (err) {
    res.status(500).json({ message: 'Error updating polygon', error: err.message });
  }
});


// Start the server
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
