require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');

const app = express();

// Basic Configuration
const port = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(express.static('public'));

// Database Connection
mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/exercise-tracker', {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

// Models
const User = require('./models/User');
const Exercise = require('./models/Exercise');

// Routes
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html');
});

// Create a new user
app.post('/api/users', async (req, res) => {
  const { username } = req.body;
  
  try {
    const user = new User({ username });
    await user.save();
    res.json({ username: user.username, _id: user._id });
  } catch (err) {
    res.status(400).json({ error: err.message });
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

// Add exercise
app.post('/api/users/:_id/exercises', async (req, res) => {
  const { _id } = req.params;
  let { description, duration, date } = req.body;
  
  try {
    // Validate input
    if (!description || !duration) {
      throw new Error('Description and duration are required');
    }
    
    // Find user
    const user = await User.findById(_id);
    if (!user) {
      throw new Error('User not found');
    }
    
    // Parse date or use current date
    const exerciseDate = date ? new Date(date) : new Date();
    
    // Create exercise
    const exercise = new Exercise({
      userId: _id,
      description,
      duration: parseInt(duration),
      date: exerciseDate
    });
    
    await exercise.save();
    
    // Return user with exercise data
    res.json({
      _id: user._id,
      username: user.username,
      description: exercise.description,
      duration: exercise.duration,
      date: exercise.date.toDateString()
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Get exercise log
app.get('/api/users/:_id/logs', async (req, res) => {
  const { _id } = req.params;
  const { from, to, limit } = req.query;
  
  try {
    // Find user
    const user = await User.findById(_id);
    if (!user) {
      throw new Error('User not found');
    }
    
    // Build query
    let query = { userId: _id };
    let dateFilter = {};
    
    if (from) {
      dateFilter['$gte'] = new Date(from);
    }
    if (to) {
      dateFilter['$lte'] = new Date(to);
    }
    if (from || to) {
      query.date = dateFilter;
    }
    
    // Get exercises
    let exercisesQuery = Exercise.find(query);
    
    if (limit) {
      exercisesQuery = exercisesQuery.limit(parseInt(limit));
    }
    
    const exercises = await exercisesQuery.exec();
    
    // Format response
    const log = exercises.map(ex => ({
      description: ex.description,
      duration: ex.duration,
      date: ex.date.toDateString()
    }));
    
    res.json({
      _id: user._id,
      username: user.username,
      count: log.length,
      log
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Database connection and server start
const listener = app.listen(port, () => {
  console.log('Your app is listening on port ' + listener.address().port);
});