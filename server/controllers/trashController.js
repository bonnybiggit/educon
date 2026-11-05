import { ObjectId } from 'mongodb';
import {
  emptyTrash,
  listTrash,
  purgeExpiredTrashThrottled,
  purgeTrashItem,
  restoreFromTrash,
} from '../services/trashService.js';
import { AppError, cleanString, sendSuccess } from '../middleware/http.js';

const assertTrashId = (id) => {
  if (!ObjectId.isValid(id)) throw new AppError('Invalid trash item id', 400);
};

export const getTrash = async (req, res) => {
  await purgeExpiredTrashThrottled();
  const { type, search, deletedFrom, deletedTo, deletedBy, maxDaysRemaining, page, limit } = req.query;
  const data = await listTrash({
    admin: req.admin,
    type: cleanString(type),
    search: cleanString(search),
    deletedFrom: cleanString(deletedFrom),
    deletedTo: cleanString(deletedTo),
    deletedBy: cleanString(deletedBy),
    maxDaysRemaining: cleanString(maxDaysRemaining),
    page,
    limit,
  });
  sendSuccess(res, { message: 'Trash fetched', data });
};

export const restoreTrashItem = async (req, res) => {
  assertTrashId(req.params.id);
  const item = await restoreFromTrash({ entryId: req.params.id, admin: req.admin });
  sendSuccess(res, { message: `${item.typeLabel} restored`, data: { item } });
};

export const deleteTrashItemPermanently = async (req, res) => {
  assertTrashId(req.params.id);
  await purgeTrashItem({ entryId: req.params.id, admin: req.admin });
  sendSuccess(res, { message: 'Item permanently deleted' });
};

export const emptyTrashBin = async (req, res) => {
  if (req.body?.confirm !== 'EMPTY TRASH') throw new AppError('Type EMPTY TRASH to confirm', 400);
  const result = await emptyTrash({ admin: req.admin });
  sendSuccess(res, { message: 'Trash emptied', data: result });
};
