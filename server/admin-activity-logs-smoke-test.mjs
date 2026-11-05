import assert from 'node:assert/strict';

// Memory-only: never connect these checks to a configured database.
process.env.NODE_ENV = 'development';
process.env.MONGODB_URI = '';
process.env.JWT_SECRET = 'ActivityLogsSmokeTestJwtSecretValue1234567890';

const { ObjectId } = await import('mongodb');
const database = await import('./config/database.js');
const svc = await import('./services/activityLogRetentionService.js');
const { findActivityLogs, formatActivityLogResponse, logActivity } = await import('./services/activityLogService.js');
const trash = await import('./services/trashService.js');
const { default: router } = await import('./routes/adminRoutes.js');
const { requireSuperAdmin } = await import('./middleware/adminAuth.js');
await database.connectDatabase();
assert.equal(database.isUsingMemoryStore(), true);
const store = database.getMemoryStore();

const DAY = 24 * 60 * 60 * 1000;
const superAdmin = { id: new ObjectId().toString(), email: 'super@example.invalid', role: 'super_admin' };
const admin = { id: new ObjectId().toString(), email: 'admin@example.invalid', role: 'admin' };
const status = (promise, code) => assert.rejects(promise, (error) => error.statusCode === code || error.status === code);
const mk = (action) => ({ _id: new ObjectId(), adminId: 'a', actorEmail: 'x@example.invalid', action, resource: 'r', resourceId: '', details: {}, createdAt: new Date() });

// Route-level authorization: every new route is guarded by requireSuperAdmin.
for (const [method, path] of [['get', '/activity-logs/hidden'], ['post', '/activity-logs/hide'], ['post', '/activity-logs/restore']]) {
  const layer = router.stack.find((l) => l.route?.path === path && l.route.methods[method]);
  assert.ok(layer, `${method} ${path} exists`);
  assert.ok(layer.route.stack.some((s) => s.handle === requireSuperAdmin), `${path} requires super admin`);
}

// Pre-existing records (no hidden fields) stay visible.
const legacy = mk('blog_post_update');
const login = mk('admin_login');
const roleChange = mk('admin_promoted_to_super_admin_by_owner');
const failure = mk('admin_login_failure');
const unknown = mk('something_new');
store.activityLogs.push(legacy, login, roleChange, failure, unknown);
const id = (log) => log._id.toString();
assert.equal((await findActivityLogs()).length, 5);

// Authorization: admins cannot hide, list hidden or restore.
await status(svc.hideActivityLogs({ ids: [id(legacy)], admin }), 403);
await status(svc.findHiddenActivityLogs({ admin }), 403);
await status(svc.restoreActivityLogs({ ids: [id(legacy)], admin }), 403);
assert.equal((await findActivityLogs()).length, 5);

// Input validation.
await status(svc.hideActivityLogs({ ids: [], admin: superAdmin }), 400);
await status(svc.hideActivityLogs({ ids: ['nope'], admin: superAdmin }), 400);
await status(svc.hideActivityLogs({ ids: 'x', admin: superAdmin }), 400);
await status(svc.hideActivityLogs({ ids: Array.from({ length: 251 }, () => new ObjectId().toString()), admin: superAdmin }), 400);
await status(svc.hideActivityLogs({ ids: [new ObjectId().toString()], admin: superAdmin }), 404);

// Protected events cannot be hidden, alone or in a batch.
await status(svc.hideActivityLogs({ ids: [id(roleChange), id(failure), id(unknown)], admin: superAdmin }), 403);
assert.equal((await findActivityLogs()).length, 5);

// Selection: hide a mixed batch; protected ones are skipped and counted.
const t0 = new Date();
const result = await svc.hideActivityLogs({ ids: [id(legacy), id(login), id(roleChange)], admin: superAdmin, now: t0 });
assert.equal(result.hidden, 2);
assert.equal(result.skippedProtected, 1);
assert.equal(Math.round((result.purgeAt - t0) / DAY), 90);
const visible = (await findActivityLogs()).map(id);
assert.ok(!visible.includes(id(legacy)) && !visible.includes(id(login)));
assert.ok(visible.includes(id(roleChange)));
assert.equal(legacy.details && Object.keys(legacy.details).length, 0, 'original record content preserved');

// Audit: hiding is itself logged, visible and protected.
const hideAudit = store.activityLogs.find((log) => log.action === 'activity_logs_hidden');
assert.equal(hideAudit.details.count, 2);
assert.equal(formatActivityLogResponse(hideAudit).protected, true);
await status(svc.hideActivityLogs({ ids: [id(hideAudit)], admin: superAdmin }), 403);

// Hidden view: deletion date and remaining days.
const hidden = await svc.findHiddenActivityLogs({ admin: superAdmin });
assert.equal(hidden.length, 2);
assert.ok(hidden.every((log) => log.hiddenAt && log.daysRemaining === 90));
assert.equal((await svc.findHiddenActivityLogs({ admin: superAdmin, now: new Date(t0.getTime() + 91 * DAY) })).length, 0);

// Restore returns the log to the normal table and cancels the scheduled purge.
const restored = await svc.restoreActivityLogs({ ids: [id(legacy), id(roleChange)], admin: superAdmin });
assert.equal(restored.restored, 1, 'only hidden logs are restorable');
assert.ok((await findActivityLogs()).map(id).includes(id(legacy)));
assert.equal(legacy.hiddenAt, undefined);
assert.equal(legacy.purgeAt, undefined);
assert.ok(store.activityLogs.some((log) => log.action === 'activity_logs_restored' && log.details.count === 1));
await status(svc.restoreActivityLogs({ ids: [id(legacy)], admin: superAdmin }), 404);

// 90-day expiry: day 89 stays, dry run changes nothing, day 91 purges only hidden expired logs.
const day89 = await svc.purgeExpiredActivityLogs({ now: new Date(t0.getTime() + 89 * DAY) });
assert.equal(day89.expired, 0);
const dry = await svc.purgeExpiredActivityLogs({ now: new Date(t0.getTime() + 91 * DAY), dryRun: true });
assert.deepEqual([dry.expired, dry.purged], [1, 0]);
assert.ok(store.activityLogs.includes(login));
await status(svc.restoreActivityLogs({ ids: [id(login)], admin: superAdmin, now: new Date(t0.getTime() + 91 * DAY) }), 404);
const purged = await svc.purgeExpiredActivityLogs({ now: new Date(t0.getTime() + 91 * DAY) });
assert.deepEqual([purged.expired, purged.purged], [1, 1]);
assert.ok(!store.activityLogs.includes(login));
for (const kept of [legacy, roleChange, failure, unknown, hideAudit]) assert.ok(store.activityLogs.includes(kept), 'visible and protected logs survive cleanup');
const purgeAudit = store.activityLogs.find((log) => log.action === 'activity_logs_auto_purged');
assert.equal(purgeAudit.actorEmail, 'system');
assert.equal(formatActivityLogResponse(purgeAudit).protected, true);

// Separation from Central Trash: hidden logs never appear in Trash, and Trash audit events cannot be hidden.
const before = store.trash.length;
await svc.hideActivityLogs({ ids: [id(legacy)], admin: superAdmin });
assert.equal(store.trash.length, before);
assert.equal((await trash.listTrash({ admin: superAdmin })).items.length, 0);
store.testimonials = [{ _id: new ObjectId(), name: 'T' }];
const moved = await trash.moveToTrash({ type: 'testimonial', id: store.testimonials[0]._id.toString(), admin: superAdmin });
await trash.purgeTrashItem({ entryId: moved.entry._id.toString(), admin: superAdmin });
const trashAudit = store.activityLogs.find((log) => log.action === 'trash_item_purged');
assert.ok(trashAudit);
await status(svc.hideActivityLogs({ ids: [id(trashAudit)], admin: superAdmin }), 403);
// Trash purge does not touch hidden activity logs, and the log purge does not touch Trash.
await trash.purgeExpiredTrash({ now: new Date(Date.now() + 365 * DAY) });
assert.ok(store.activityLogs.includes(legacy));

// Administrator attribution: every admin action records the authenticated admin's id and email, never browser input.
{
  const { deleteAdminStudent } = await import('./controllers/adminStudentController.js');
  const { deleteAdminEnquiry: deleteEnquiry } = await import('./controllers/enquiryController.js');
  const { deleteAdminService } = await import('./controllers/adminServiceController.js');
  const { deleteAdminTestimonial } = await import('./controllers/adminTestimonialController.js');
  const { restoreTrashItem, deleteTrashItemPermanently } = await import('./controllers/trashController.js');
  const { hideSelectedActivityLogs, restoreSelectedActivityLogs } = await import('./controllers/adminActivityController.js');
  const res = { status() { return this; }, json() { return this; } };
  // body/query fields are attacker-controlled; they must never become the recorded actor.
  const request = (actor, extra = {}) => ({ admin: actor, body: { actorEmail: 'spoof@example.invalid', adminId: 'spoof', ...extra.body }, query: {}, params: extra.params || {} });
  const last = (action) => store.activityLogs.find((log) => log.action === action);
  const expectActor = (action, actor) => {
    const log = last(action);
    assert.ok(log, `${action} logged`);
    assert.equal(log.adminId, actor.id, `${action} adminId`);
    assert.equal(log.actorEmail, actor.email, `${action} actorEmail`);
    assert.notEqual(log.actorEmail, 'spoof@example.invalid');
  };

  store.admins.push({ _id: new ObjectId(superAdmin.id), email: superAdmin.email, role: 'super_admin' });
  const studentId = new ObjectId();
  store.students.push({ _id: studentId, fullName: 'Attr Student', email: 'attr-student@example.invalid' });
  await deleteAdminStudent(request(superAdmin, { params: { id: studentId.toString() } }), res);
  expectActor('student_deletion', superAdmin);

  store.enquiries = [{ _id: new ObjectId(), email: 'e@example.invalid', status: 'new' }];
  await deleteEnquiry(request(superAdmin, { params: { id: store.enquiries[0]._id.toString() } }), res);
  expectActor('enquiry_deletion', superAdmin);

  store.services = [{ _id: new ObjectId(), name: 'Svc' }];
  await deleteAdminService(request(superAdmin, { params: { id: store.services[0]._id.toString() } }), res);
  expectActor('service_deletion', superAdmin);

  store.testimonials = [{ _id: new ObjectId(), name: 'Tst' }];
  await deleteAdminTestimonial(request(admin, { params: { id: store.testimonials[0]._id.toString() } }), res);
  expectActor('testimonial_deletion', admin);

  const entry = store.trash.find((item) => item.type === 'student' && item.originalId === studentId.toString());
  await restoreTrashItem(request(superAdmin, { params: { id: entry._id.toString() } }), res);
  expectActor('trash_item_restored', superAdmin);
  const svcEntry = store.trash.find((item) => item.type === 'service');
  await deleteTrashItemPermanently(request(superAdmin, { params: { id: svcEntry._id.toString() } }), res);
  expectActor('trash_item_purged', superAdmin);

  const target = mk('admin_login');
  store.activityLogs.push(target);
  await hideSelectedActivityLogs(request(superAdmin, { body: { ids: [target._id.toString()] } }), res);
  expectActor('activity_logs_hidden', superAdmin);
  await restoreSelectedActivityLogs(request(superAdmin, { body: { ids: [target._id.toString()] } }), res);
  expectActor('activity_logs_restored', superAdmin);

  // Fallback: a missing email is resolved from the admin record, and unknown admins stay blank (no spoofing).
  await logActivity({ adminId: superAdmin.id, action: 'admin_login', resource: 'admin' });
  assert.equal(store.activityLogs[0].actorEmail, superAdmin.email);
  await logActivity({ adminId: new ObjectId().toString(), action: 'admin_login', resource: 'admin' });
  assert.equal(store.activityLogs[0].actorEmail, '');
  // Genuine automated operations stay attributed to the system.
  assert.equal(purgeAudit.actorEmail, 'system');
}

await logActivity({ adminId: 'x', action: 'admin_login', resource: 'admin' });
assert.equal(formatActivityLogResponse(store.activityLogs[0]).protected, false);

console.log('Activity log retention smoke tests passed');
