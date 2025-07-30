const express = require('express')
const app = express()
const cors = require('cors')
require('dotenv').config()
const mongoose = require('mongoose')
const {Schema} = mongoose

mongoose.connect(process.env.MONGO_URI)

const UserSchema = new Schema({
    username: String,
})
const User = mongoose.model("USer", UserSchema)

const ExerciseSchema = new Schema({
    user_id: { type: String, required: true},
    description: String,
    duration: Number,
    date: Date,
})
const Exercise = mongoose.model("Exercise", ExerciseSchema)

app.use(cors())
app.use(express.static('public'))
app.use(express.urlencoded({extended: true}))
app.get('/', (req, res) => {
    res.sendFile(__dirname + '/views/index.html')
})

app.get("/api/users", async (req, res) => {
    const users = await User.find({}).select("_id username")
    if (!users) {
        res.send("No users")
    } else {
        res.json(users) 
    }
})

app.post("/api/users", async (req, res) => {

    const userObj = new User({
   username: req.body.username
})

try{
const user = await userObj.save()

res.json(user)
}catch(err){
    console.log(err)
}

})

app.post("/api/users/:_id/exercises", async (req, res) => {
    const id = req.params._id
    const {description, duration, date} = req.body
    
    try{
        const user = await User.findById(id)
        if(!user){
            res.send("Could not find user")
        } else {
            const exerciseObj = new Exercise({
                user_id: user._id,
                description,
                duration,
                date: date ? new Date(date)  : new Date()
            })
            const exercise = await exerciseObj.save()
            res.json({
                username: user.username,
                description: exercise.description,
                date: new Date(exercise.date).toDateString(),
                duration: exercise.duration,
                _id: user._id,

            })
        }
    }catch (err){
        console.log(err)
        res.send("There was an error saving the exercise")
    }
})


app.get("/api/users/:_id/logs", async (req, res) => {
    const { from, to, limit } = req.query;
    const id = req.params._id;

    const user = await User.findById(id);
    if (!user) {
        return res.json({ error: "Could not find user" }); // Consistent error response
    }

    let filter = { user_id: id };
    let dateObj = {};

    if (from) {
        const fromDate = new Date(from);
        if (isNaN(fromDate.getTime())) {
            return res.json({ error: "Invalid 'from' date format" });
        }
        dateObj["$gte"] = fromDate;
    }

    if (to) {
        const toDate = new Date(to);
        if (isNaN(toDate.getTime())) {
            return res.json({ error: "Invalid 'to' date format" });
        }
        // Crucial for 'to' filter to include the entire day
        toDate.setDate(toDate.getDate() + 1); // Add one day
        dateObj["$lt"] = toDate; // Use $lt (less than)
    }

    if (Object.keys(dateObj).length > 0) {
        filter.date = dateObj;
    }

    let exercisesQuery = Exercise.find(filter)
                                 .sort({ date: 1 }) // Crucial: Sort by date ascending
                                 .select('description duration date'); // Good practice to select specific fields

    if (limit) {
        const parsedLimit = parseInt(limit);
        if (!isNaN(parsedLimit) && parsedLimit > 0) { // Ensure it's a positive number
            exercisesQuery = exercisesQuery.limit(parsedLimit);
        }
    }

    try {
        const exercises = await exercisesQuery.exec(); // Execute the Mongoose query

        const log = exercises.map(e => ({
            description: e.description,
            duration: e.duration,
            date: e.date.toDateString()
        }));

        res.json({
            _id: user._id,
            username: user.username,
            count: log.length, // Use log.length
            log
        });
    } catch (err) {
        console.error("Error fetching exercise log:", err); // More informative error logging
        res.status(500).json({ error: "Error fetching exercise log" });
    }
});

const listener = app.listen(process.env.PORT || 3000, () => {
    console.log('Your app is listening on port ' + listener.address().port)
})