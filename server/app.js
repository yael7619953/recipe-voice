import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import connectDB from './config/db.js';
import routes from './routes/index.js';
import { errorHandler } from './middleware/error.middleware.js';
import { UPLOAD_DIR } from './middleware/upload.middleware.js';

const app = express();
const PORT = process.env.PORT || 5000;

connectDB();

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(UPLOAD_DIR));

app.get('/', (req, res) => {
  res.send('Server is up and running with separate DB config!');
});

app.use('/api', routes);
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});