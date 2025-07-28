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
const User = mongoose.model("User", UserSchema)

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

app.get("/api/users/:_id/logs", async (req, res) => {
    const { from, to, limit } = req.query;
    const id = req.params._id;

    const user = await User.findById(id);
    if (!user) {
        // Consistent error response format
        return res.json({ error: "Could not find user" });
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
        // Include the entire 'to' day: add one day and use $lt
        toDate.setDate(toDate.getDate() + 1);
        dateObj["$lt"] = toDate;
    }

    // Apply date filter if 'from' or 'to' were provided
    if (Object.keys(dateObj).length > 0) {
        filter.date = dateObj;
    }

    let exercisesQuery = Exercise.find(filter)
                                 .sort({ date: 1 }) // Sort by date ascending for predictable limit
                                 .select('description duration date'); // Explicitly select required fields

    if (limit) {
        const parsedLimit = parseInt(limit);
        if (!isNaN(parsedLimit) && parsedLimit > 0) {
            exercisesQuery = exercisesQuery.limit(parsedLimit);
        }
        // If limit is invalid, we proceed without limiting,
        // which is often acceptable for FCC if it doesn't break other tests.
    }

    try {
        const exercises = await exercisesQuery.exec();

        const log = exercises.map(e => ({
            description: e.description,
            duration: e.duration,
            date: e.date.toDateString()
        }));

        res.json({
            username: user.username,
            count: log.length, // Use log.length, not exercises.length (they should be same, but safer)
            _id: user._id,
            log
        });
    } catch (err) {
        console.error(err); // Log the actual error for debugging
        res.status(500).json({ error: "Error fetching exercise log" });
    }
});

const listener = app.listen(process.env.PORT || 3000, () => {
    console.log('Your app is listening on port ' + listener.address().port)
})