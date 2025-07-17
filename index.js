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
app.get('/api/users/:_id/logs', async (req, res) => {
  const userId = req.params._id;
  const { from, to, limit } = req.query;

  try {
    // Verify user exists first
    const user = await User.findById(userId);
    if (!user) {
      return res.status(400).json({ error: "unknown userId" });
    }

    // Build date filter
    let dateFilter = {};
    if (from) {
      const fromDate = new Date(from);
      if (!isNaN(fromDate.getTime())) {
        dateFilter.$gte = fromDate;
      }
    }
    if (to) {
      const toDate = new Date(to);
      if (!isNaN(toDate.getTime())) {
        dateFilter.$lte = toDate;
      }
    }

    // Build the complete filter
    let filter = { userId: userId };
    if (Object.keys(dateFilter).length > 0) {
      filter.date = dateFilter;
    }

    // Get unfiltered count for all exercises
    const totalCount = await Exercise.countDocuments({ userId: userId });

    // Build query
    let query = Exercise.find(filter)
      .select('description duration date')
      .sort({ date: 'asc' });

    // Apply limit if valid
    if (limit && !isNaN(parseInt(limit))) {
      query = query.limit(parseInt(limit));
    }

    // Execute query
    const exercises = await query;

    // Format response with proper type casting
    res.json({
      _id: user._id,
      username: user.username,
      count: exercises.length, // Count of returned exercises
      log: exercises.map(e => ({
        description: String(e.description), // Ensure string
        duration: Number(e.duration),      // Ensure number
        date: e.date.toDateString()        // Formatted date string
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