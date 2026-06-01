import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { MongoClient, ObjectId } from 'mongodb';
import bcrypt from 'bcryptjs';

dotenv.config();

const app = express();
const port = process.env.PORT || 5000;
const origin = process.env.CORS_ORIGIN || 'http://localhost:5173';
const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB_NAME || 'educon';
const collectionName = process.env.MONGODB_COLLECTION || 'students';

if (!uri) {
  console.error('Missing MONGODB_URI in environment configuration.');
  process.exit(1);
}

app.use(cors({ origin }));
app.use(express.json({ limit: '8mb' }));

const client = new MongoClient(uri);

let studentsCollection;

async function startServer() {
  await client.connect();
  const db = client.db(dbName);
  studentsCollection = db.collection(collectionName);
  await studentsCollection.createIndex({ email: 1 }, { unique: true });
  app.listen(port, () => {
    console.log(`Server listening on http://localhost:${port}`);
  });
}

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.post('/api/register', async (req, res) => {
  const payload = req.body;
  const requiredFields = [
    'fullName',
    'email',
    'password',
    'mobileNumber',
    'country',
    'passportNumber',
    'targetCountry',
    'targetUniversity',
    'courseOfStudy',
    'intakeSession',
    'currentStage',
    'consent',
  ];

  const missingFields = requiredFields.filter((field) => !payload[field]);
  if (missingFields.length) {
    return res.status(400).json({ error: `Missing fields: ${missingFields.join(', ')}` });
  }

  if (typeof payload.password !== 'string' || payload.password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters' });
  }

  if (!payload.consent) {
    return res.status(400).json({ error: 'Consent is required' });
  }

  const studentDocument = {
    fullName: payload.fullName,
    dateOfBirth: payload.dateOfBirth || '',
    email: payload.email.toLowerCase(),
    mobileNumber: payload.mobileNumber,
    countryCode: payload.countryCode || '',
    country: payload.country,
    passportNumber: payload.passportNumber,
    profilePicture: payload.profilePicture || '',
    targetCountry: payload.targetCountry,
    targetUniversity: payload.targetUniversity,
    customUniversity: payload.customUniversity || '',
    highestQualification: payload.highestQualification || '',
    previousInstitution: payload.previousInstitution || '',
    cgpa: payload.cgpa || '',
    courseOfStudy: payload.courseOfStudy,
    intakeSession: payload.intakeSession,
    currentStage: payload.currentStage,
    status: 'pending',
    consent: payload.consent,
    uploads: {
      passport: payload.uploads?.passport || '',
      transcripts: payload.uploads?.transcripts || '',
      cv: payload.uploads?.cv || '',
    },
    password: await bcrypt.hash(payload.password, 10),
    createdAt: new Date(),
  };

  try {
    await studentsCollection.insertOne(studentDocument);
    return res.status(201).json({ success: true });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ error: 'Email already registered' });
    }
    console.error('Registration error:', error);
    return res.status(500).json({ error: 'Unable to save registration' });
  }
});

app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  const student = await studentsCollection.findOne({ email: email.toLowerCase() });
  if (!student) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  const validPassword = await bcrypt.compare(password, student.password);
  if (!validPassword) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  const { password: _password, ...user } = student;
  return res.json({
    success: true,
    user: {
      email: user.email,
      name: user.fullName,
      profilePicture: user.profilePicture || '',
    },
  });
});

app.get('/api/students', async (_req, res) => {
  try {
    const students = await studentsCollection.find().sort({ createdAt: -1 }).toArray();
    return res.json({
      success: true,
      students: students.map((student) => ({
        ...student,
        id: student._id.toString(),
        createdAt: student.createdAt?.toISOString(),
      })),
    });
  } catch (error) {
    console.error('Fetch students error:', error);
    return res.status(500).json({ error: 'Unable to fetch students' });
  }
});

app.patch('/api/students/:id', async (req, res) => {
  const { id } = req.params;
  const updates = req.body;
  const allowedKeys = ['currentStage', 'status'];
  const patch = {};

  allowedKeys.forEach((key) => {
    if (typeof updates[key] === 'string' && updates[key].trim() !== '') {
      patch[key] = updates[key].trim();
    }
  });

  if (!Object.keys(patch).length) {
    return res.status(400).json({ error: 'No valid fields to update' });
  }

  try {
    const result = await studentsCollection.findOneAndUpdate(
      { _id: new ObjectId(id) },
      { $set: { ...patch, updatedAt: new Date() } },
      { returnDocument: 'after' }
    );

    if (!result.value) {
      return res.status(404).json({ error: 'Student not found' });
    }

    const student = result.value;
    return res.json({
      success: true,
      student: {
        ...student,
        id: student._id.toString(),
        createdAt: student.createdAt?.toISOString(),
      },
    });
  } catch (error) {
    console.error('Update student error:', error);
    return res.status(500).json({ error: 'Unable to update student' });
  }
});

startServer().catch((error) => {
  console.error(error);
  process.exit(1);
});
