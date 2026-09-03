import { ObjectId } from 'mongodb';
import { env } from '../config/env.js';
import { getCollection, getMemoryStore, isUsingMemoryStore } from '../config/database.js';
import { insertService } from '../models/serviceModel.js';

const initialServices = [
  ['Expert Consultation', 'Personalized advice to kickstart your journey.'],
  ['University Admissions', 'Handling BSC, MSC & MRES applications globally.'],
  ['Compliance Checks', 'Ensuring your documents meet all strict requirements.'],
  ['Interview Preparation', 'One-on-one preCAS and UKVI interview prep.'],
  ['Payment Guidance', 'Secure guidance on making payments to schools.'],
  ['Proof of Funds', 'Detailed financial checklist for visa success.'],
  ['Visa Assistance', 'Step-by-step guidance through the visa process.'],
  ['Accommodation', 'Finding the right home (UK students only).'],
  ['Airport Pickup', 'Warm welcome upon arrival (UK students only).'],
  ['Job Searches', 'Helping you find part-time work (UK students only).'],
  ['Global Consulting', 'Holistic consulting across 14+ countries.'],
  ['Scholarships', 'Identifying financial aid opportunities for your profile.'],
];

export const bootstrapServices = async () => {
  const count = isUsingMemoryStore()
    ? getMemoryStore().services.length
    : await getCollection(env.servicesCollection).countDocuments();
  if (count > 0) return;

  const now = new Date();
  await Promise.all(initialServices.map(([name, description]) => insertService({
    _id: new ObjectId(),
    name,
    description,
    isPublished: true,
    createdAt: now,
    updatedAt: now,
  })));
  console.log('Initial services loaded into the database.');
};
