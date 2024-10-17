const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.static('public'));
app.use(express.urlencoded({ extended: false }));
app.use(express.json());

mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log('Connected to MongoDB Atlas');
  })
  .catch(err => {
    console.error('Error connecting to MongoDB Atlas: ', err);
  });

const userSchema = new mongoose.Schema({
  username: { type: String, required: true },
  log: [
    {
      description: { type: String, required: true },
      duration: { type: Number, required: true },
      date: { type: String, required: true }
    }
  ],
  count: { type: Number, default: 0 }
});

const User = mongoose.model('User', userSchema);

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html');
});

// POST to /api/users to create a new user
app.post('/api/users', async (req, res) => {
  const { username } = req.body;
  try {
    if (!username) {
      return res.status(400).json({ error: 'Username is required' });
    }
    const user = new User({ username });
    const data = await user.save();
    res.json({ username: data.username, _id: data._id });
  } catch (err) {
    res.status(500).json({ error: 'Error creating user' });
  }
});

// GET all users
app.get('/api/users', async (req, res) => {
  try {
    const users = await User.find({});
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST to /api/users/:_id/exercises to add an exercise
app.post('/api/users/:_id/exercises', async (req, res) => {
  const { description, duration, date } = req.body;
  const userId = req.params._id;

  if (!description || !duration) {
    return res.status(400).json({ error: 'Description and duration are required' });
  }

  const exerciseDate = date ? new Date(date).toDateString() : new Date().toDateString();
  
  const exercise = {
    description,
    duration: parseInt(duration),
    date: exerciseDate
  };

  try {
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    user.log.push(exercise);
    user.count += 1;

    const updatedUser = await user.save();
    res.json({
      _id: updatedUser._id,
      username: updatedUser.username,
      description: exercise.description,
      duration: exercise.duration,
      date: exercise.date
    });
  } catch (err) {
    res.status(500).json({ error: 'Error adding exercise' });
  }
});

// GET /api/users/:_id/logs to retrieve the exercise log of a user
app.get('/api/users/:_id/logs', async (req, res) => {
  const { from, to, limit } = req.query;
  const userId = req.params._id;

  try {
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    let logs = user.log;

    // Filter logs by 'from' and 'to' date range
    if (from || to) {
      const fromDate = from ? new Date(from).getTime() : 0;
      const toDate = to ? new Date(to).getTime() : Date.now();

      logs = logs.filter(log => {
        const logDate = new Date(log.date).getTime();
        return logDate >= fromDate && logDate <= toDate;
      });
    }

    // Limit the number of logs if 'limit' is provided
    if (limit) {
      logs = logs.slice(0, parseInt(limit));
    }

    res.json({
      _id: user._id,
      username: user.username,
      count: logs.length,
      log: logs.map(log => ({
        description: log.description,
        duration: log.duration,
        date: log.date
      }))
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port);
});
