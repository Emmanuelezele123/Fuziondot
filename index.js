const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv').config();
const bodyParser = require('body-parser');
const authRoutes = require('./routes/auth');
const cors = require('cors'); 

const app = express();
const port = process.env.PORT || 3000;

mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.log(err));
  
 app.use(cors());
 
// Middleware setup

app.use(express.static('public'));
app.use(cors({
    origin: '*', // Adjust this to your specific origin as needed
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Origin', 'X-Requested-With', 'Accept'],
  }));
  
app.use(express.json());
app.use('/api/auth', authRoutes);

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
