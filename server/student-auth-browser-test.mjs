import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, access } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';

// Optional real-browser checks, using an installed Chrome and no added dependencies.
export async function runBrowserChecks({ app, baseUrl, store, credentials }) {
  const chromePath = process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
  await access(chromePath);
  const temporaryRoot = await mkdtemp(path.join(tmpdir(), 'student-auth-test-'));
  let chrome;
  let socket;
  const pending = new Map();
  try {
    const { build } = await import('vite');
    const { default: express } = await import('express');
    const output = path.join(temporaryRoot, 'dist');
    await build({ build: { outDir: output, emptyOutDir: true }, define: { 'import.meta.env.VITE_API_BASE_URL': JSON.stringify(baseUrl) } });
    app.use(express.static(output));
    app.get('*', (_req, res) => res.sendFile(path.join(output, 'index.html')));
    const profile = path.join(temporaryRoot, 'chrome');
    chrome = spawn(chromePath, [
      '--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check',
      '--remote-debugging-port=0', `--user-data-dir=${profile}`, 'about:blank',
    ], { windowsHide: true, stdio: 'ignore' });
    let launchError;
    chrome.on('error', (error) => { launchError = error; });
    let port;
    for (let attempt = 0; attempt < 100; attempt += 1) {
      if (launchError) throw launchError;
      try {
        port = (await readFile(path.join(profile, 'DevToolsActivePort'), 'utf8')).split('\n')[0];
        break;
      } catch { await delay(100); }
    }
    assert.ok(port, 'Chrome did not start');
    const pages = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
    socket = new WebSocket(pages.find((page) => page.type === 'page').webSocketDebuggerUrl);
    await new Promise((resolve, reject) => {
      socket.addEventListener('open', resolve, { once: true });
      socket.addEventListener('error', reject, { once: true });
    });
    let id = 0;
    socket.addEventListener('message', (event) => {
      const message = JSON.parse(event.data);
      const entry = pending.get(message.id);
      if (!entry) return;
      pending.delete(message.id);
      clearTimeout(entry.timer);
      if (message.error) entry.reject(new Error(JSON.stringify(message.error)));
      else entry.resolve(message.result);
    });
    const send = (method, params = {}) => new Promise((resolve, reject) => {
      const requestId = ++id;
      const timer = setTimeout(() => {
        pending.delete(requestId);
        reject(new Error(`Browser command timed out: ${method}`));
      }, 15000);
      pending.set(requestId, { resolve, reject, timer });
      socket.send(JSON.stringify({ id: requestId, method, params }));
    });
    const evaluate = async (expression) => {
      const result = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
      if (result.exceptionDetails) throw new Error(JSON.stringify(result.exceptionDetails));
      return result.result.value;
    };
    const until = async (expression) => {
      for (let attempt = 0; attempt < 100; attempt += 1) {
        if (await evaluate(expression)) return;
        await delay(100);
      }
      throw new Error(`Browser condition failed: ${expression}`);
    };
    const navigate = async (route) => {
      await send('Page.navigate', { url: `${baseUrl}${route}` });
      await until('document.readyState === "complete"');
    };
    const fill = (selector, value) => evaluate(`(() => {
      const element = document.querySelector(${JSON.stringify(selector)});
      const prototype = element.tagName === 'SELECT' ? HTMLSelectElement.prototype : HTMLInputElement.prototype;
      Object.getOwnPropertyDescriptor(prototype, 'value').set.call(element, ${JSON.stringify(value)});
      element.dispatchEvent(new Event('input', { bubbles: true }));
      element.dispatchEvent(new Event('change', { bubbles: true }));
    })()`);
    const clickText = (text) => evaluate(`[...document.querySelectorAll('button')].find(button => button.textContent.trim() === ${JSON.stringify(text)}).click()`);
    const browserLogin = async () => {
      await navigate('/login');
      await until('Boolean(document.querySelector("#email"))');
      await fill('#email', credentials.email);
      await fill('#password', credentials.password);
      await evaluate('document.querySelector("button[type=submit]").click()');
      await until('location.pathname === "/dashboard" && document.body.textContent.includes("Student Dashboard")');
    };
    await send('Page.enable');
    await send('Network.enable');
    await send('Network.setBlockedURLs', { urls: ['https://*'] });
    await send('Page.addScriptToEvaluateOnNewDocument', { source: `
      window.dashboardWasRendered = false;
      new MutationObserver(() => {
        if (document.body?.textContent.includes('Student Dashboard')) window.dashboardWasRendered = true;
      }).observe(document, { childList: true, subtree: true });
    ` });

    await navigate('/dashboard');
    await until('location.pathname === "/login" && Boolean(document.querySelector("#email"))');
    assert.equal(await evaluate('window.dashboardWasRendered'), false, 'unauthenticated dashboard flashed');
    await evaluate(`sessionStorage.setItem('educonStudentProfile', JSON.stringify({fullName:'Forged', password:'legacy-secret', confirmPassword:'legacy-secret'})); sessionStorage.setItem('educonStudentAuthenticated','true')`);
    await navigate('/dashboard');
    await until('location.pathname === "/login" && Boolean(document.querySelector("#email"))');
    assert.equal(await evaluate('window.dashboardWasRendered'), false, 'forged storage unlocked dashboard');
    assert.equal(await evaluate('sessionStorage.length'), 0, 'legacy credentials were not removed');

    await evaluate('document.querySelector("[data-auth-provider=google]").click()');
    await until('location.pathname === "/api/student/auth/google"');
    await navigate('/login');
    await until('Boolean(document.querySelector("[data-auth-provider=google]"))');

    await browserLogin();
    assert.equal(await evaluate('sessionStorage.length'), 0);
    assert.equal(await evaluate('document.cookie.includes("educon_student_session")'), false);
    await navigate('/dashboard');
    await until('document.body.textContent.includes("Student Dashboard")');
    await clickText('Sign Out');
    await until('location.pathname === "/logout"');
    await navigate('/dashboard');
    await until('location.pathname === "/login"');
    assert.equal(await evaluate('window.dashboardWasRendered'), false);

    // Exercise the registration form that previously persisted plaintext passwords.
    await navigate('/portal/setup');
    await until('Boolean(document.querySelector("#fullName"))');
    await fill('#fullName', 'New Student');
    await fill('#email', 'new-student@example.invalid');
    await fill('#password', 'RegistrationSecret123');
    await fill('#confirmPassword', 'RegistrationSecret123');
    await fill('#mobileNumber', '12345678');
    await clickText('Next');
    await until('Boolean(document.querySelector("#targetUniversity"))');
    const university = await evaluate('document.querySelector("#targetUniversity").options[1].value');
    await fill('#targetUniversity', university);
    await fill('#courseOfStudy', 'Computer Science');
    await fill('#intakeSession', 'Sept 2026');
    await clickText('Next');
    await until('Boolean(document.querySelector("input[name=consent]"))');
    await evaluate('document.querySelector("input[name=consent]").click()');
    await clickText('Complete Registration');
    await until('location.pathname === "/login"');
    assert.ok(await evaluate('performance.getEntriesByType("resource").some((entry) => entry.name.includes("/api/register"))'), 'normal registration did not use /api/register');
    assert.equal(await evaluate('sessionStorage.length'), 0, 'registration persisted credentials');
    await navigate('/dashboard');
    await until('location.pathname === "/login"');
    assert.equal(await evaluate('window.dashboardWasRendered'), false);

    await browserLogin();
    store.studentSessions.forEach((session) => { session.expiresAt = new Date(0); });
    await navigate('/dashboard');
    await until('location.pathname === "/login"');
    assert.equal(await evaluate('window.dashboardWasRendered'), false, 'expired session unlocked dashboard');
    await browserLogin();
    await send('Network.setBlockedURLs', { urls: ['https://*', `${baseUrl}/api/student/me`] });
    await navigate('/dashboard');
    await until('location.pathname === "/login"');
    assert.equal(await evaluate('window.dashboardWasRendered'), false, 'API failure unlocked dashboard');

    await send('Network.setBlockedURLs', { urls: ['https://*'] });
    await navigate('/portal/setup?oauth=pending');
    await until('Boolean(document.querySelector("#fullName"))');
    assert.equal(await evaluate('document.querySelector("#password") === null && document.querySelector("#confirmPassword") === null'), true, 'Google pending setup must not render password fields');
    await evaluate(`(() => {
      const originalFetch = window.fetch;
      window.fetch = async (input, init = {}) => {
        const url = String(input);
        if (url.includes('/api/student/auth/google/complete')) {
          window.googleCompletionRequest = {
            url,
            method: init.method,
            fields: init.body instanceof FormData ? [...init.body.keys()] : [],
          };
          return new Response(JSON.stringify({ success: true, data: {
            expiresAt: new Date(Date.now() + 3600000).toISOString(),
            user: { id: 'google-browser-student', fullName: 'Google Browser Student' },
          } }), { status: 201, headers: { 'Content-Type': 'application/json' } });
        }
        if (url.includes('/api/student/me')) {
          return new Response(JSON.stringify({ success: true, data: {
            expiresAt: new Date(Date.now() + 3600000).toISOString(),
            user: { id: 'google-browser-student', fullName: 'Google Browser Student' },
          } }), { status: 200, headers: { 'Content-Type': 'application/json' } });
        }
        return originalFetch(input, init);
      };
    })()`);
    await fill('#fullName', 'Google Browser Student');
    await fill('#email', 'google-browser@example.invalid');
    await fill('#mobileNumber', '12345678');
    await clickText('Next');
    await until('Boolean(document.querySelector("#targetUniversity"))');
    const pendingUniversity = await evaluate('document.querySelector("#targetUniversity").options[1].value');
    await fill('#targetUniversity', pendingUniversity);
    await fill('#courseOfStudy', 'Computer Science');
    await fill('#intakeSession', 'Sept 2026');
    await clickText('Next');
    await until('Boolean(document.querySelector("input[name=consent]"))');
    await evaluate('document.querySelector("input[name=consent]").click()');
    await clickText('Complete Registration');
    await until('location.pathname === "/dashboard" && document.body.textContent.includes("Student Dashboard")');
    assert.equal(await evaluate('window.googleCompletionRequest.url.includes("/api/student/auth/google/complete")'), true, 'Google pending setup used the wrong endpoint');
    assert.equal(await evaluate('window.googleCompletionRequest.method'), 'POST');
    assert.equal(await evaluate('window.googleCompletionRequest.fields.includes("password") || window.googleCompletionRequest.fields.includes("confirmPassword")'), false, 'Google completion submitted password fields');
    console.log('Student authentication browser checks passed (registration, forged storage, login, reload, logout, expiry, API failure)');
  } finally {
    for (const entry of pending.values()) clearTimeout(entry.timer);
    socket?.close();
    if (chrome && chrome.exitCode === null) {
      const exited = new Promise((resolve) => chrome.once('exit', resolve));
      chrome.kill();
      await exited;
    }
    // Only remove the exact temporary directory allocated by this test.
    assert.equal(path.dirname(temporaryRoot), path.resolve(tmpdir()));
    await rm(temporaryRoot, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
  }
}
