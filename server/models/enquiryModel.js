import { ObjectId } from 'mongodb';
import { env } from '../config/env.js';
import { getCollection, getMemoryStore, isUsingMemoryStore } from '../config/database.js';

export const ENQUIRY_STATUSES = ['new', 'read', 'replied', 'closed'];

export const formatEnquiryResponse = (enquiry) => ({
  id: enquiry._id.toString(),
  name: enquiry.name,
  email: enquiry.email,
  phone: enquiry.phone,
  subject: enquiry.subject,
  message: enquiry.message,
  status: enquiry.status,
  createdAt: enquiry.createdAt?.toISOString ? enquiry.createdAt.toISOString() : enquiry.createdAt,
  updatedAt: enquiry.updatedAt?.toISOString ? enquiry.updatedAt.toISOString() : enquiry.updatedAt,
});

export const insertEnquiry = async (enquiryDocument) => {
  if (isUsingMemoryStore()) {
    getMemoryStore().enquiries.unshift(enquiryDocument);
    return { insertedId: enquiryDocument._id };
  }
  return getCollection(env.enquiriesCollection).insertOne(enquiryDocument);
};

export const findEnquiries = async () => {
  if (isUsingMemoryStore()) {
    return [...getMemoryStore().enquiries].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }
  return getCollection(env.enquiriesCollection).find().sort({ createdAt: -1 }).toArray();
};

export const findEnquiryById = async (id) => {
  if (isUsingMemoryStore()) {
    return getMemoryStore().enquiries.find((enquiry) => enquiry._id.toString() === id) || null;
  }
  return getCollection(env.enquiriesCollection).findOne({ _id: new ObjectId(id) });
};

export const updateEnquiryById = async (id, patch) => {
  if (isUsingMemoryStore()) {
    const enquiry = getMemoryStore().enquiries.find((item) => item._id.toString() === id);
    if (!enquiry) return null;
    Object.assign(enquiry, patch, { updatedAt: new Date() });
    return enquiry;
  }

  return getCollection(env.enquiriesCollection).findOneAndUpdate(
    { _id: new ObjectId(id) },
    { $set: { ...patch, updatedAt: new Date() } },
    { returnDocument: 'after' }
  );
};

export const deleteEnquiryById = async (id) => {
  if (isUsingMemoryStore()) {
    const enquiries = getMemoryStore().enquiries;
    const index = enquiries.findIndex((enquiry) => enquiry._id.toString() === id);
    if (index === -1) return null;
    const [deleted] = enquiries.splice(index, 1);
    return deleted;
  }

  const enquiry = await findEnquiryById(id);
  if (!enquiry) return null;
  await getCollection(env.enquiriesCollection).deleteOne({ _id: new ObjectId(id) });
  return enquiry;
};
