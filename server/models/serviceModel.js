import { ObjectId } from 'mongodb';
import { env } from '../config/env.js';
import { getCollection, getMemoryStore, isUsingMemoryStore } from '../config/database.js';

export const formatServiceResponse = (service) => ({
  id: service._id.toString(),
  name: service.name,
  description: service.description,
  isPublished: Boolean(service.isPublished),
  createdAt: service.createdAt?.toISOString ? service.createdAt.toISOString() : service.createdAt,
  updatedAt: service.updatedAt?.toISOString ? service.updatedAt.toISOString() : service.updatedAt,
});

export const findServices = async () => {
  if (isUsingMemoryStore()) {
    return [...getMemoryStore().services].sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
  }
  return getCollection(env.servicesCollection).find().sort({ updatedAt: -1 }).toArray();
};

export const findPublishedServices = async () => {
  if (isUsingMemoryStore()) {
    return [...getMemoryStore().services]
      .filter((service) => service.isPublished)
      .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
  }
  return getCollection(env.servicesCollection).find({ isPublished: true }).sort({ updatedAt: -1 }).toArray();
};

export const findServiceById = async (id) => {
  if (isUsingMemoryStore()) {
    return getMemoryStore().services.find((service) => service._id.toString() === id) || null;
  }
  return getCollection(env.servicesCollection).findOne({ _id: new ObjectId(id) });
};

export const insertService = async (service) => {
  if (isUsingMemoryStore()) {
    getMemoryStore().services.unshift(service);
    return { insertedId: service._id };
  }
  return getCollection(env.servicesCollection).insertOne(service);
};

export const updateServiceById = async (id, patch) => {
  if (isUsingMemoryStore()) {
    const service = getMemoryStore().services.find((item) => item._id.toString() === id);
    if (!service) return null;
    Object.assign(service, patch, { updatedAt: new Date() });
    return service;
  }
  return getCollection(env.servicesCollection).findOneAndUpdate(
    { _id: new ObjectId(id) },
    { $set: { ...patch, updatedAt: new Date() } },
    { returnDocument: 'after' }
  );
};

export const deleteServiceById = async (id) => {
  if (isUsingMemoryStore()) {
    const services = getMemoryStore().services;
    const index = services.findIndex((service) => service._id.toString() === id);
    if (index === -1) return null;
    const [deleted] = services.splice(index, 1);
    return deleted;
  }
  const service = await findServiceById(id);
  if (!service) return null;
  await getCollection(env.servicesCollection).deleteOne({ _id: new ObjectId(id) });
  return service;
};
