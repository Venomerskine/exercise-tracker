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
const userSchema = new mongoose.Schema({
  username: { type: String, required: true },
  count: { type: Number, default: 0 },
  log: [{
    description: String,
    duration: Number,
    date: Date
  }]
});

const User = mongoose.model("User", userSchema);



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
  const { description, duration, date } = req.body;

  const exercise = {
    description,
    duration: parseInt(duration),
    date: date ? new Date(date) : new Date()
  };

  User.findByIdAndUpdate(
    userId,
    {
      $push: { log: exercise },
      $inc: { count: 1 }
    },
    { new: true },
    (err, user) => {
      if (err || !user) return res.status(400).json({ error: 'User not found' });

      res.json({
        _id: user._id,
        username: user.username,
        description: exercise.description,
        duration: exercise.duration,
        date: exercise.date.toDateString()
      });
    }
  );
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
app.get('/api/users/:_id/logs', (req, res) => {
  const { from, to, limit } = req.query;
  const userId = req.params._id;

  User.findById(userId, (err, user) => {
    if (err || !user) return res.status(400).json({ error: 'User not found' });

    let logs = user.log.map(log => ({
      description: log.description,
      duration: log.duration,
      date: new Date(log.date).toDateString()
    }));

    if (from) {
      const fromDate = new Date(from);
      logs = logs.filter(log => new Date(log.date) >= fromDate);
    }

    if (to) {
      const toDate = new Date(to);
      logs = logs.filter(log => new Date(log.date) <= toDate);
    }

    if (limit) {
      logs = logs.slice(0, parseInt(limit));
    }

    res.json({
      username: user.username,
      count: user.count,
      _id: user._id,
      log: logs
    });
  });
});

//Get user logs


const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})