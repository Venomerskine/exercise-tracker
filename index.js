require('dotenv').config()


const mongoose = require('mongoose')
const express = require('express')
const app = express()
const cors = require('cors')

// mongoose.connect(process.env.MONGO_URI, {useNewUrlParser: true, useUnifiedTopology: true })
//   .then(() => console.log('MongoDB Connected!'))
//   .catch(err => console.error('MongoDb connection error:', err))

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
  app.post("/api/users", async (req, res) => {
  try {
    const username = req.body.username;
    const user = new User({ username });
    const data = await user.save();
    res.json({ username: data.username, _id: data._id });
  } catch (err) {
    res.status(500).json({ error: "Error saving user" });
  }
});

//Post user


//Post Exercise
  app.post('/api/users/:_id/exercises', (req, res) => {
    const userId = req.params._id
    const {description, duration, date} = req.body

    User.findById(userId, (err, user) => {
      if(err || !user){
        return res.status(400).json("unknown userId")
      } else {
      
      new Exercise ({
      userId,
      description,
      duration: Number(duration),
      date: date ? new Date(date) : new Date()

    }).save((err, data) => {
      if(err){
        return res.status(500).json({ error: "unknown userId" });
      } else {
        res.json({
        _id: user._id,
        username: user.username,
        description: data.description,
        duration: data.duration,
        date: data.date.toDateString()
      });
      }
    })
      }
    })
  })
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
  const userId = req.params._id;
  const {from, to, limit} = req.query;

  User.findById(userId, (err, user) => {
    if (err || !user){
      return res.status(400).json("unknown user id")
    } else {
      let filter = {userId: userId};

      if (from || to){
        filter.date = {};
        if (from) filter.date.$gte = new Date(from);
        if(to) filter.date.$lte = new Date(to)
      }

      let query = Exercise.find(filter).select('description duration date')
      if(limit) query = query.limit(Number(limit))
        query.exec((err, exercises) => {
      if (err){
        return res.status(500).json({ error: err });
      } else {
        res.json({
        _id: user._id,
        username: user.username,
        count: exercises.length,
        log: exercises.map(e => ({
          description: e.description,
          duration: e.duration,
          date: e.date.toDateString()
        }))
      });
      }
      })
    }
  })
})
//Get user logs


const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
