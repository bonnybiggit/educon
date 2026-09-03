import { ObjectId } from 'mongodb';
import { env } from '../config/env.js';
import { getCollection, getMemoryStore, isUsingMemoryStore } from '../config/database.js';
import { insertTestimonial } from '../models/testimonialModel.js';

const initialTestimonials = [
  ['Korede', 'I got my admission for masters by research and it allowed me to bring my family with me. I did not pay any service fees. Excellent service, Universe Consults'],
  ['Doreen', 'Seamlessly the best Educational consultancy. I rate them 5/5.'],
  ['Jesuseun', 'I will recommend Universe Consults any day and any time. Thumps up.'],
  ['Alex', 'You need personalised services? Think Universe Consults.'],
  ['Nneka', 'I have 3rd class and everyone said I cannot study masters abroad. Universe Consults helped me secure my msc admission and assisted until I resumed in September 2025.'],
];

export const bootstrapTestimonials = async () => {
  const count = isUsingMemoryStore()
    ? getMemoryStore().testimonials.length
    : await getCollection(env.testimonialsCollection).countDocuments();
  if (count > 0) return;

  const now = new Date();
  await Promise.all(initialTestimonials.map(([name, text]) => insertTestimonial({
    _id: new ObjectId(),
    name,
    role: '',
    text,
    imageUrl: '',
    isPublished: true,
    createdAt: now,
    updatedAt: now,
  })));
  console.log('Initial testimonials loaded into the database.');
};
