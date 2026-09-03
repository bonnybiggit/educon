import { ObjectId } from 'mongodb';
import { env } from '../config/env.js';
import { getCollection, getMemoryStore, isUsingMemoryStore } from '../config/database.js';

export const formatTestimonialResponse = (testimonial) => ({
  id: testimonial._id.toString(),
  name: testimonial.name,
  role: testimonial.role || '',
  text: testimonial.text,
  imageUrl: testimonial.imageUrl || '',
  isPublished: Boolean(testimonial.isPublished),
  createdAt: testimonial.createdAt?.toISOString ? testimonial.createdAt.toISOString() : testimonial.createdAt,
  updatedAt: testimonial.updatedAt?.toISOString ? testimonial.updatedAt.toISOString() : testimonial.updatedAt,
});

export const findTestimonials = async () => {
  if (isUsingMemoryStore()) {
    return [...getMemoryStore().testimonials].sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
  }
  return getCollection(env.testimonialsCollection).find().sort({ updatedAt: -1 }).toArray();
};

export const findPublishedTestimonials = async () => {
  if (isUsingMemoryStore()) {
    return [...getMemoryStore().testimonials]
      .filter((testimonial) => testimonial.isPublished)
      .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
  }
  return getCollection(env.testimonialsCollection).find({ isPublished: true }).sort({ updatedAt: -1 }).toArray();
};

export const findTestimonialById = async (id) => {
  if (isUsingMemoryStore()) {
    return getMemoryStore().testimonials.find((testimonial) => testimonial._id.toString() === id) || null;
  }
  return getCollection(env.testimonialsCollection).findOne({ _id: new ObjectId(id) });
};

export const insertTestimonial = async (testimonial) => {
  if (isUsingMemoryStore()) {
    getMemoryStore().testimonials.unshift(testimonial);
    return { insertedId: testimonial._id };
  }
  return getCollection(env.testimonialsCollection).insertOne(testimonial);
};

export const updateTestimonialById = async (id, patch) => {
  if (isUsingMemoryStore()) {
    const testimonial = getMemoryStore().testimonials.find((item) => item._id.toString() === id);
    if (!testimonial) return null;
    Object.assign(testimonial, patch, { updatedAt: new Date() });
    return testimonial;
  }
  return getCollection(env.testimonialsCollection).findOneAndUpdate(
    { _id: new ObjectId(id) },
    { $set: { ...patch, updatedAt: new Date() } },
    { returnDocument: 'after' }
  );
};

export const deleteTestimonialById = async (id) => {
  if (isUsingMemoryStore()) {
    const testimonials = getMemoryStore().testimonials;
    const index = testimonials.findIndex((testimonial) => testimonial._id.toString() === id);
    if (index === -1) return null;
    const [deleted] = testimonials.splice(index, 1);
    return deleted;
  }
  const testimonial = await findTestimonialById(id);
  if (!testimonial) return null;
  await getCollection(env.testimonialsCollection).deleteOne({ _id: new ObjectId(id) });
  return testimonial;
};
