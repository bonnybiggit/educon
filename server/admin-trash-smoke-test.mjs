import assert from 'node:assert/strict';

// Memory-only: never connect these checks to a configured database.
process.env.NODE_ENV = 'development';
process.env.MONGODB_URI = '';
process.env.JWT_SECRET = 'AdminTrashSmokeTestJwtSecretValue1234567890';

const { ObjectId } = await import('mongodb');
const database = await import('./config/database.js');
const trash = await import('./services/trashService.js');
await database.connectDatabase();
assert.equal(database.isUsingMemoryStore(), true);
const store = database.getMemoryStore();

const superAdmin = { id: new ObjectId().toString(), email: 'super@example.invalid', role: 'super_admin' };
const admin = { id: new ObjectId().toString(), email: 'admin@example.invalid', role: 'admin' };
const DAY = 24 * 60 * 60 * 1000;
const rejectsStatus = (promise, status) => assert.rejects(promise, (error) => error.statusCode === status || error.status === status);

const seed = {
  student: { key: 'students', doc: { _id: new ObjectId(), fullName: 'Stu Dent', email: 'Stu@Example.invalid', extra: { keep: 1 } } },
  enquiry: { key: 'enquiries', doc: { _id: new ObjectId(), name: 'Enq', email: 'enq@example.invalid' } },
  service: { key: 'services', doc: { _id: new ObjectId(), name: 'Svc' } },
  testimonial: { key: 'testimonials', doc: { _id: new ObjectId(), name: 'Testi', role: 'Student' } },
  blog: { key: 'blogPosts', doc: { _id: new ObjectId(), title: 'Post', slug: 'my-post' } },
};
for (const { key, doc } of Object.values(seed)) (store[key] ||= []).push(doc);
const live = (type) => store[seed[type].key].some((doc) => doc._id.toString() === seed[type].doc._id.toString());
const logged = (action) => store.activityLogs.some((log) => log.action === action);

// Permissions: an admin may only trash testimonials and blog posts.
await rejectsStatus(trash.moveToTrash({ type: 'student', id: seed.student.doc._id.toString(), admin }), 403);
await rejectsStatus(trash.moveToTrash({ type: 'enquiry', id: seed.enquiry.doc._id.toString(), admin }), 403);
await rejectsStatus(trash.moveToTrash({ type: 'admin', id: 'x', admin: superAdmin }), 400);
await rejectsStatus(trash.moveToTrash({ type: 'activityLog', id: 'x', admin: superAdmin }), 400);
assert.ok(live('student') && live('enquiry'));
assert.deepEqual(trash.allowedTrashTypes('admin').sort(), ['blog', 'testimonial']);
assert.equal(trash.allowedTrashTypes('super_admin').length, 5);

// Soft deletion: removed from the live collection, held in Trash, nothing else touched.
store.studentFiles.push({ _id: new ObjectId(), studentId: seed.student.doc._id.toString(), field: 'passport' });
store.studentFiles.push({ _id: new ObjectId(), studentId: new ObjectId().toString(), field: 'passport' });
store.studentSessions.push({ _id: new ObjectId(), studentId: seed.student.doc._id.toString(), expiresAt: new Date(Date.now() + DAY) });
const entries = {};
for (const type of Object.keys(seed)) {
  const moved = await trash.moveToTrash({ type, id: seed[type].doc._id.toString(), admin: type === 'testimonial' || type === 'blog' ? admin : superAdmin });
  assert.ok(moved, type);
  entries[type] = moved.entry;
  assert.equal(live(type), false, `${type} should leave the live collection`);
  assert.equal(moved.entry.snapshot._id.toString(), seed[type].doc._id.toString());
  assert.equal(Math.round((moved.entry.purgeAt - moved.entry.deletedAt) / DAY), 30);
}
assert.equal(await trash.moveToTrash({ type: 'blog', id: new ObjectId().toString(), admin }), null);
assert.equal(store.studentFiles.length, 2, 'files are kept while the student is in Trash');
assert.equal(store.studentSessions.length, 0, 'open student sessions are revoked');

// Listing honours role and filters, and never exposes snapshots.
const adminView = await trash.listTrash({ admin });
assert.deepEqual(adminView.items.map((item) => item.type).sort(), ['blog', 'testimonial']);
assert.ok(adminView.items.every((item) => item.snapshot === undefined && item.canPurge === false));
await rejectsStatus(trash.listTrash({ admin, type: 'student' }), 403);
const superView = await trash.listTrash({ admin: superAdmin });
assert.equal(superView.items.length, 5);
assert.equal((await trash.listTrash({ admin: superAdmin, type: 'service' })).items.length, 1);
assert.equal((await trash.listTrash({ admin: superAdmin, search: 'stu@example' })).items.length, 1);
assert.equal((await trash.listTrash({ admin: superAdmin, deletedBy: admin.id })).items.length, 2);
assert.equal((await trash.listTrash({ admin: superAdmin, maxDaysRemaining: 5 })).items.length, 0);
assert.equal((await trash.listTrash({ admin: superAdmin, deletedFrom: '2000-01-01', deletedTo: '2999-01-01' })).items.length, 5);
assert.equal(superView.items[0].daysRemaining, 30);

// Restore: same _id and data; permission checked per type.
await rejectsStatus(trash.restoreFromTrash({ entryId: entries.student._id.toString(), admin }), 403);
const restored = await trash.restoreFromTrash({ entryId: entries.testimonial._id.toString(), admin });
assert.equal(restored.type, 'testimonial');
assert.ok(live('testimonial'));
assert.equal(store.testimonials.find((doc) => doc._id.toString() === seed.testimonial.doc._id.toString()).role, 'Student');
await rejectsStatus(trash.restoreFromTrash({ entryId: entries.testimonial._id.toString(), admin }), 404);

// Restore conflicts: a new student re-registered with the same email, a new post took the slug.
store.students.push({ _id: new ObjectId(), fullName: 'Newcomer', email: 'stu@example.invalid' });
await rejectsStatus(trash.restoreFromTrash({ entryId: entries.student._id.toString(), admin: superAdmin }), 409);
store.blogPosts.push({ _id: new ObjectId(), title: 'Other', slug: 'my-post' });
await rejectsStatus(trash.restoreFromTrash({ entryId: entries.blog._id.toString(), admin }), 409);
store.students.pop();
store.blogPosts.pop();
await trash.restoreFromTrash({ entryId: entries.blog._id.toString(), admin });
assert.ok(live('blog'));
const interrupted = await trash.moveToTrash({ type: 'blog', id: seed.blog.doc._id.toString(), admin });
store.blogPosts.push(seed.blog.doc); // simulates a restore that inserted but did not clear the entry
await trash.restoreFromTrash({ entryId: interrupted.entry._id.toString(), admin });
assert.equal(store.blogPosts.filter((doc) => doc._id.toString() === seed.blog.doc._id.toString()).length, 1);

// Expiry: day 29 stays, day 31 is purged and cannot be restored; related data of other students is untouched.
const t0 = Date.now();
const day29 = await trash.purgeExpiredTrash({ now: new Date(t0 + 29 * DAY), dryRun: false });
assert.equal(day29.expired, 0);
const aged = store.trash.find((entry) => entry.type === 'enquiry');
const agedPurgeAt = aged.purgeAt;
aged.purgeAt = new Date(t0 - 1000);
await rejectsStatus(trash.restoreFromTrash({ entryId: aged._id.toString(), admin: superAdmin }), 410);
assert.equal((await trash.listTrash({ admin: superAdmin, type: 'enquiry' })).items.length, 0, 'expired items are hidden');
aged.purgeAt = agedPurgeAt;
const dry = await trash.purgeExpiredTrash({ now: new Date(t0 + 31 * DAY), dryRun: true });
assert.equal(dry.expired, 3);
assert.equal(dry.purged, 0);
assert.equal(store.trash.length, 3);
const day31 = await trash.purgeExpiredTrash({ now: new Date(t0 + 31 * DAY) });
assert.equal(day31.purged, 3);
assert.equal(store.trash.length, 0);
assert.equal(store.studentFiles.length, 1, 'only the purged student files are removed');
assert.notEqual(store.studentFiles[0].studentId, seed.student.doc._id.toString());
assert.ok(logged('trash_auto_purged'));

// Manual permanent deletion and emptying are Super Admin only and require typed confirmation at the controller.
const again = await trash.moveToTrash({ type: 'service', id: (store.services.push({ _id: new ObjectId(), name: 'S2' }), store.services.at(-1)._id.toString()), admin: superAdmin });
await rejectsStatus(trash.purgeTrashItem({ entryId: again.entry._id.toString(), admin }), 403);
await rejectsStatus(trash.emptyTrash({ admin }), 403);
assert.equal(store.trash.length, 1);
await trash.purgeTrashItem({ entryId: again.entry._id.toString(), admin: superAdmin });
assert.equal(store.trash.length, 0);
await rejectsStatus(trash.purgeTrashItem({ entryId: again.entry._id.toString(), admin: superAdmin }), 404);
const bulkA = { _id: new ObjectId(), name: 'T1' };
store.testimonials.push(bulkA);
await trash.moveToTrash({ type: 'testimonial', id: bulkA._id.toString(), admin });
assert.equal((await trash.emptyTrash({ admin: superAdmin })).removed, 1);
assert.equal(store.trash.length, 0);
assert.ok(logged('trash_item_restored') && logged('trash_item_purged') && logged('trash_emptied'));

const { emptyTrashBin } = await import('./controllers/trashController.js');
await assert.rejects(emptyTrashBin({ admin: superAdmin, body: {} }, {}), /EMPTY TRASH/);

console.log('Trash smoke tests passed');
