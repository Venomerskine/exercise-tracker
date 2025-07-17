require('dotenv').config();
const express = require('express');
const app = express();
const cors = require('cors');
const mongoose = require('mongoose');

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

// Schemas
const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true }
});
const User = mongoose.model('User', userSchema);

const exerciseSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  description: { type: String, required: true },
  duration: { type: Number, required: true },
  date: { type: Date, default: Date.now }
});
const Exercise = mongoose.model('Exercise', exerciseSchema);

// Middleware
app.use(cors());
app.use(express.json()); // For parsing application/json
app.use(express.urlencoded({ extended: true })); // For parsing application/x-www-form-urlencoded
app.use(express.static('public'));

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html');
});

// API Endpoints
// Create a new user
app.post('/api/users', async (req, res) => {
  try {
    const { username } = req.body;
    const newUser = new User({ username });
    const savedUser = await newUser.save();
    res.json({ username: savedUser.username, _id: savedUser._id });
  } catch (err) {
    if (err.code === 11000) { // Duplicate key error
      return res.json({ error: 'Username already taken' });
    }
    res.status(500).json({ error: err.message });
  }
});

// Get all users
app.get('/api/users', async (req, res) => {
  try {
    const users = await User.find({}, 'username _id');
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Add an exercise
app.post('/api/users/:_id/exercises', async (req, res) => {
  try {
    const userId = req.params._id;
    const { description, duration, date } = req.body;

    const user = await User.findById(userId);
    if (!user) {
      return res.json({ error: 'User not found' });
    }

    const newDate = date ? new Date(date) : new Date();
    if (isNaN(newDate.getTime())) {
      return res.json({ error: 'Invalid Date' });
    }

    const newExercise = new Exercise({
      userId,
      description,
      duration: parseInt(duration),
      date: newDate
    });

    const savedExercise = await newExercise.save();

    res.json({
      _id: user._id,
      username: user.username,
      date: savedExercise.date.toDateString(),
      duration: savedExercise.duration,
      description: savedExercise.description,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get user log
app.get('/api/users/:_id/logs', async (req, res) => {
  const userId = req.params._id;
  const { from, to, limit } = req.query;

  try {
    const user = await User.findById(userId);
    if (!user) {
      return res.status(400).json({ error: "unknown userId" });
    }

    let filter = { userId: userId };

    if (from || to) {
      filter.date = {};
      if (from) {
        const fromDate = new Date(from);
        if (!isNaN(fromDate.getTime())) {
          filter.date.$gte = fromDate;
        }
      }
      if (to) {
        const toDate = new Date(to);
        if (!isNaN(toDate.getTime())) {
          toDate.setDate(toDate.getDate() + 1);
          filter.date.$lt = toDate;
        }
      }
    }

    // *** REMOVE this line as it calculates count BEFORE limit: ***
    // const totalCount = await Exercise.countDocuments(filter);

    let query = Exercise.find(filter).select('description duration date');

    // Keep the sorting we added (this is good practice for logs)
    query = query.sort({ date: 1 });

    if (limit) {
      const parsedLimit = parseInt(limit);
      if (!isNaN(parsedLimit) && parsedLimit > 0) {
        query = query.limit(parsedLimit);
      }
    }

    const exercises = await query; // This 'exercises' array is already limited/filtered

    res.json({
      _id: user._id,
      username: user.username,
      // *** CHANGE THIS LINE TO MATCH THE WORKING SOLUTION'S COUNT LOGIC ***
      count: exercises.length, // Count is now the length of the (potentially) limited log
      log: exercises.map(e => ({
        description: e.description,
        duration: e.duration,
        date: e.date.toDateString()
      }))
    });

  } catch (err) {
    console.error("Error in /api/users/:_id/logs:", err);
    res.status(500).json({ error: err.message || "Error fetching logs" });
  }
});

// Listen for requests
const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port);
});