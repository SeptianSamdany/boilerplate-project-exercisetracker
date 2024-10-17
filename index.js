const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.static('public'))
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log('Connected to MongoDB Atlas');
  })
  .catch(err => {
    console.error('Error connecting to MongoDB Atlas: ', err);
  });

const userSchema = new mongoose.Schema({
  username: { type: String, required: true }
});

const exerciseSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  description: String,
  duration: Number,
  date: String
});

const User = mongoose.model('User', userSchema);
const Exercise = mongoose.model('Exercise', exerciseSchema);

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html');
});

app.post('/api/users', async (req, res) => {
  try {
    const { username } = req.body;
    const newUser = new User({ username });
    await newUser.save();
    res.json({ username: newUser.username, _id: newUser._id });
  } catch (err) {
    res.status(500).json({ error: 'Terjadi kesalahan pada server.' });
  }
});

app.get('/api/users', async (req, res) => {
  try {
    const users = await User.find({}, 'username _id');
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: 'Terjadi kesalahan pada server.' });
  }
});

app.post('/api/users/:_id/exercises', async (req, res) => {
  const { _id } = req.params;
  const { description, duration, date } = req.body;
  
  try {
    const user = await User.findById(_id);
    if (!user) {
      return res.status(404).json({ error: 'User tidak ditemukan.' });
    }

    const exerciseDate = date ? new Date(date).toDateString() : new Date().toDateString();
    const newExercise = new Exercise({
      userId: _id,
      description,
      duration: parseInt(duration),
      date: exerciseDate
    });

    await newExercise.save();
    res.json({
      _id: user._id,
      username: user.username,
      description: newExercise.description,
      duration: newExercise.duration,
      date: newExercise.date
    });
  } catch (err) {
    res.status(500).json({ error: 'Terjadi kesalahan pada server.' });
  }
});

app.get('/api/users/:_id/logs', async (req, res) => {
  const { _id } = req.params;
  const { from, to, limit } = req.query;

  try {
    const user = await User.findById(_id);
    if (!user) {
      return res.status(404).json({ error: 'User tidak ditemukan.' });
    }

    // Membuat filter berdasarkan userId
    let filter = { userId: _id };

    // Filter berdasarkan tanggal (from dan to) dengan format yyyy-mm-dd
    if (from || to) {
      filter.date = {};
      if (from) filter.date.$gte = new Date(from);  // Mengubah from ke Date
      if (to) filter.date.$lte = new Date(to);      // Mengubah to ke Date
    }

    // Mendapatkan latihan berdasarkan filter dan limit
    const exercises = await Exercise.find(filter).limit(parseInt(limit) || 0);

    // Mengembalikan hasil sebagai JSON
    res.json({
      _id: user._id,
      username: user.username,
      count: exercises.length,
      log: exercises.map(ex => ({
        description: ex.description,
        duration: ex.duration,
        date: new Date(ex.date).toDateString() // Memastikan tanggal diformat dengan toDateString
      }))
    });
  } catch (err) {
    res.status(500).json({ error: 'Terjadi kesalahan pada server.' });
  }
});

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})