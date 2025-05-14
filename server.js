const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const cookieParser = require('cookie-parser');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(cookieParser());

const authRoutes = require("./routes/authRoutes");
app.use("/api/auth", authRoutes);


// Test route
app.get('/', (req, res) => res.send('Server is running'));

// DB connection
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('MongoDB connected'))
.catch(err => console.error('MongoDB error:', err));

app.listen(PORT, () => console.log(`Server started on port ${PORT}`));
