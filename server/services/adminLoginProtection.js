import bcrypt from 'bcryptjs';

export const LOGIN_FAILURE_WINDOW_MS = 15 * 60 * 1000;
export const MAX_LOGIN_DELAY_MS = 5000;

// Admin passwords are hashed at cost 12; the dummy comparison must cost the same so that unknown
// and inactive accounts take as long to reject as a real account with a wrong password.
let dummyHashPromise;
export const getDummyPasswordHash = () => {
  dummyHashPromise ||= bcrypt.hash(`dummy-${Math.random().toString(36)}`, 12);
  return dummyHashPromise;
};

// 1st-2nd failure: no delay; then 1s, 2s, 4s, capped at 5s. Delays slow guessing without ever locking an account.
export const computeLoginDelayMs = (failures) => {
  if (!Number.isFinite(failures) || failures < 3) return 0;
  return Math.min(MAX_LOGIN_DELAY_MS, 1000 * 2 ** (failures - 3));
};

let sleep = (ms) => new Promise((resolve) => { setTimeout(resolve, ms); });
export const setLoginSleepForTests = (fn) => {
  sleep = fn || ((ms) => new Promise((resolve) => { setTimeout(resolve, ms); }));
};
export const delayLogin = (ms) => (ms > 0 ? sleep(ms) : Promise.resolve());
