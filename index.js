const express = require('express')
const app = express()
const cors = require('cors')
require('dotenv').config()
const mongoose = require('mongoose')
const { Schema } = require('mongoose');
const bodyParser = require('body-parser')

const MONGO_URI = process.env.MONGO_URI;

mongoose.connect(MONGO_URI);

const userSchema = new Schema({
  username: {
    type: String,
    required: true
  },
  log: [{
    date: { type: Date },
    duration: Number,
    description: String,
      }],
  count: Number
})


const User = mongoose.model("User", userSchema)

app.use(cors())
app.use(bodyParser.urlencoded({ extended: false }))
app.use(express.static('public'))
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});

app.route('/api/users')
  .post((req, res) => {
    const username = req.body.username;
    const user = new User({ username, count: 0 });
    user.save( (err, data) => {
      if (err) {
        return res.json({ error: 'Error saving user' });
      }
      res.json({ username: data.username, _id: data._id });

    });
  })
  .get((req, res) => {
    User.find((err, data) => {
      if (data) {
        res.json({ username: data.username, _id: data._id });

      }
    });
})

app.post('/api/users/:_id/exercises', (req, res) => {
  const {description } = req.body;
  const duration = parseInt(req.body.duration)
  const date = req.body.date ? new Date(req.body.date) : new Date();
  const id = req.params._id;

 const exercise = {
  date: date.toDateString(),
  duration,
  description
};


User.findByIdAndUpdate(id, {
  $push: {log: exercise}, 
  $inc:{count:1}}, 
{new:true}, (err, user) => {
  if (user){
    const updatedExericse = {
      username: user.username, 
      _id: id,
      ...exercise}
  console.log(updatedExericse)
  res.json(updatedExericse)
    }
})
})

app.get('/api/users/:_id/logs', (req, res) => {
  const { from, to, limit } = req.query;

  User.findById(req.params._id, (err, user) => {
    if (user) {
     let logs = user.log.map(entry => ({
          description: entry.description,
          duration: entry.duration,
          date: new Date(entry.date).toDateString()
        }));

      if (from) {
        const fromDate = new Date(from);
        logs = logs.filter(e => new Date(e.date) >= fromDate);
      }

      if (to) {
        const toDate = new Date(to);
        logs = logs.filter(e => new Date(e.date) <= toDate);
      }

      if (limit) {
        logs = logs.slice(0, Number(limit));
      }


      res.json({
        username: user.username,
        count: user.count,
        _id: user._id,
        log: logs
  });

    }
  });
});


app.get('/mongo-health', (req, res) => {
  res.json({ status: mongoose.connection.readyState });
})


const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
