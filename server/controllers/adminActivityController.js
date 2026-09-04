import { findActivityLogs, formatActivityLogResponse } from '../services/activityLogService.js';
import { sendSuccess } from '../middleware/http.js';

export const getActivityLogs = async (req, res) => {
  const logs = await findActivityLogs({ limit: req.query.limit });
  sendSuccess(res, {
    message: 'Activity logs fetched',
    data: { logs: logs.map(formatActivityLogResponse) },
  });
};
