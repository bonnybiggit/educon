import { findActivityLogs, formatActivityLogResponse } from '../services/activityLogService.js';
import { findHiddenActivityLogs, hideActivityLogs, restoreActivityLogs } from '../services/activityLogRetentionService.js';
import { sendSuccess } from '../middleware/http.js';

export const getActivityLogs = async (req, res) => {
  const logs = await findActivityLogs({ limit: req.query.limit });
  sendSuccess(res, {
    message: 'Activity logs fetched',
    data: { logs: logs.map(formatActivityLogResponse) },
  });
};

export const getHiddenActivityLogs = async (req, res) => {
  const logs = await findHiddenActivityLogs({ admin: req.admin, limit: req.query.limit });
  sendSuccess(res, { message: 'Hidden activity logs fetched', data: { logs } });
};

export const hideSelectedActivityLogs = async (req, res) => {
  const result = await hideActivityLogs({ ids: req.body?.ids, admin: req.admin });
  sendSuccess(res, { message: 'Selected logs deleted', data: result });
};

export const restoreSelectedActivityLogs = async (req, res) => {
  const result = await restoreActivityLogs({ ids: req.body?.ids, admin: req.admin });
  sendSuccess(res, { message: 'Selected logs restored', data: result });
};
