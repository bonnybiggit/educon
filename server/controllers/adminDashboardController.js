import { env } from '../config/env.js';
import { getCollection, getMemoryStore, isUsingMemoryStore } from '../config/database.js';
import { formatStudentResponse } from '../models/studentModel.js';
import { formatEnquiryResponse } from '../models/enquiryModel.js';
import { sendSuccess } from '../middleware/http.js';

export const getAdminDashboardData = async (_req, res) => {
  if (isUsingMemoryStore()) {
    const memory = getMemoryStore();

    const students = memory.students || [];
    const enquiries = memory.enquiries || [];

    const totalStudents = students.length;
    const pendingStudents = students.filter((s) => s.status === 'pending').length;
    const reviewStudents = students.filter((s) => s.status === 'in review').length;
    const approvedStudents = students.filter((s) => s.status === 'accepted').length;

    const totalEnquiries = enquiries.length;
    const newEnquiries = enquiries.filter((e) => e.status === 'new').length;

    const recentStudents = students
      .slice(0, 5)
      .map((s) => formatStudentResponse(s));

    const recentEnquiries = enquiries
      .slice(0, 5)
      .map((e) => formatEnquiryResponse(e));

    return sendSuccess(res, {
      message: 'Dashboard overview metrics fetched',
      data: {
        students: {
          total: totalStudents,
          pending: pendingStudents,
          review: reviewStudents,
          approved: approvedStudents,
        },
        enquiries: {
          total: totalEnquiries,
          new: newEnquiries,
        },
        recentStudents,
        recentEnquiries,
      },
    });
  }

  const studentsCol = getCollection(env.studentsCollection);
  const enquiriesCol = getCollection(env.enquiriesCollection);

  const [
    totalStudents,
    pendingStudents,
    reviewStudents,
    approvedStudents,
    totalEnquiries,
    newEnquiries,
    dbRecentStudents,
    dbRecentEnquiries,
  ] = await Promise.all([
    studentsCol.countDocuments({}),
    studentsCol.countDocuments({ status: 'pending' }),
    studentsCol.countDocuments({ status: 'in review' }),
    studentsCol.countDocuments({ status: 'accepted' }),
    enquiriesCol.countDocuments({}),
    enquiriesCol.countDocuments({ status: 'new' }),
    studentsCol.find().sort({ createdAt: -1 }).limit(5).toArray(),
    enquiriesCol.find().sort({ createdAt: -1 }).limit(5).toArray(),
  ]);

  const recentStudents = dbRecentStudents.map((s) => formatStudentResponse(s));
  const recentEnquiries = dbRecentEnquiries.map((e) => formatEnquiryResponse(e));

  sendSuccess(res, {
    message: 'Dashboard overview metrics fetched',
    data: {
      students: {
        total: totalStudents,
        pending: pendingStudents,
        review: reviewStudents,
        approved: approvedStudents,
      },
      enquiries: {
        total: totalEnquiries,
        new: newEnquiries,
      },
      recentStudents,
      recentEnquiries,
    },
  });
};
