require('dotenv').config()


const mongoose = require('mongoose')
const express = require('express')
const app = express()
const cors = require('cors')

mongoose.connect(process.env.MONGO_URI, {useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('MongoDB Connected!'))
  .catch(err => console.error('MongoDb connection error:', err))

app.use(express.urlencoded({ extended: true }));
app.use(cors())
app.use(express.static('public'))


app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});


//schema variables
let userSchema = new mongoose.Schema({
  username: {type: String, required: true},
});

let exerciseSchema = new mongoose.Schema({ 
  userId: {type: mongoose.Schema.Types.ObjectId, ref: 'User'},
  description: String,
  duration: Number,
  date: Date
});
//schema variables



let User = mongoose.model("User", userSchema)
let Exercise = mongoose.model("Exercise", exerciseSchema);


//Post user
  app.post("/api/users", (req, res) => {
   const username = req.body.username;
   new User ({
    username,
   }).save() 
    .then(data => { 
      res.json({
        username: data.username,
        _id: data._id
      });
    })
    .catch(err => { 
            return res.status(500).json({err: err.message || "Error saving user"});
    });
});

//Post user


//Post Exercise
app.post('/api/users/:_id/exercises', (req, res) => {
    const userId = req.params._id;
    const {description, duration, date} = req.body;

    User.findById(userId) 
      .then(user => {
        if (!user){ 
            return res.status(400).json({ error: "User not found" }); 
        }

        new Exercise ({
            userId,
            description,
            duration: Number(duration),
            date: date ? new Date(date) : new Date()
        }).save() 
          .then(data => { 
            res.json({
                _id: user._id,
                username: user.username,
                description: data.description,
                duration: data.duration,
                date: data.date.toDateString()
            });
          })
          .catch(err => { 
            return res.status(500).json({ error: err.message || "Error saving exercise" });
          });
      })
      .catch(err => { 
        return res.status(500).json({ error: err.message || "Error finding user" });
      });
});
//Post Exercise



//Get users
app.get('/api/users', async (req, res) => {
  try {
    const users = await User.find({});
    res.json(users.map(user => ({
      username: user.username,
      _id: user._id
    })));
  } catch (err) {
    res.status(500).json({ error: 'Error fetching users' });
  }
});

//Get users


//Get user logs
app.get('/api/users/:_id/logs', async (req, res) => {
  const userId = req.params._id;
  const { from, to, limit } = req.query;

  try {
    // Find user first to verify existence
    const user = await User.findById(userId);
    if (!user) {
      return res.status(400).json({ error: "unknown userId" });
    }

    // Build the filter
    let filter = { userId: userId };
    
    // Date filtering
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
          filter.date.$lte = toDate; // Changed from $lt to $lte
        }
      }
    }

    // Get total count (unfiltered by limit)
    const totalCount = await Exercise.countDocuments(filter);

    // Build query
    let query = Exercise.find(filter)
      .select('description duration date -_id')
      .sort({ date: 'asc' }); // Sort by date ascending

    // Apply limit if valid
    if (limit) {
      const parsedLimit = parseInt(limit);
      if (!isNaN(parsedLimit)) {
        query = query.limit(parsedLimit);
      }
    }

    // Execute query
    const exercises = await query;

    // Format response
    res.json({
      _id: user._id,
      username: user.username,
      count: exercises.length, // Use actual returned count instead of totalCount
      log: exercises.map(e => ({
        description: e.description,
        duration: e.duration,
        date: e.date.toDateString() // Ensure this matches exactly
      }))
    });

  } catch (err) {
    console.error("Error in /api/users/:_id/logs:", err);
    res.status(500).json({ error: err.message || "Error fetching logs" });
  }
});
//Get user logs


const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})