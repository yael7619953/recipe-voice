import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import connectDB from './config/db.js'; 

dotenv.config();

const expressApp = express();
const PORT = process.env.PORT || 5000;

connectDB();

expressApp.use(cors());
expressApp.use(express.json());

expressApp.get('/', (req, res) => {
  res.send('Server is up and running with separate DB config!');
});

expressApp.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});