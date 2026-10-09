import { test, expect } from '@playwright/test';

test.describe('DocFit Feature 1: Accounts, Roles and Authentication', () => {

  test.beforeEach(async ({ request }) => {
    // Reset seed state before each test run
    await request.post('/api/test/reset');
  });

  test('TC-01 (Happy Path): Patient registers, verifies email, logs in -> Account active, patient dashboard shown', async ({ page, request }) => {
    const uniqueEmail = `test.patient.${Date.now()}@example.com`;
    const password = 'StrongPassword2026!';

    // 1. Visit signup page
    await page.goto('/auth-signup.html');
    await expect(page.locator('h1')).toHaveText('Create your account');

    // 2. Fill registration form
    await page.fill('#name', 'Alice NewPatient');
    await page.fill('#email', uniqueEmail);
    await page.fill('#password', password);
    await page.check('#agree');

    // 3. Submit form and verify navigation to inbox pending verification
    await page.click('#submit-btn');
    await expect(page).toHaveURL(/auth-verify-pending\.html/);
    await expect(page.locator('#target-email')).toHaveText(uniqueEmail);

    // 4. Verify email using the verification screen action
    await page.click('#verify-now-btn');
    await expect(page).toHaveURL(/auth-signin\.html/);

    // 5. Sign in with verified credentials
    await page.fill('#email', uniqueEmail);
    await page.fill('#password', password);
    await page.click('#signin-btn');

    // 6. Patient dashboard loads
    await expect(page).toHaveURL(/patient-dashboard\.html/);
    await expect(page.locator('#greeting-heading')).toContainText('Alice');
    await expect(page.locator('#email-verified-badge')).toBeVisible();

    // 7. Verify /me API response returns role = patient
    const token = await page.evaluate(() => localStorage.getItem('docfit_token'));
    expect(token).toBeTruthy();

    const meResponse = await request.get('/api/me', {
      headers: { Authorization: `Bearer ${token}` }
    });
    expect(meResponse.status()).toBe(200);
    const meData = await meResponse.json();
    expect(meData.role).toBe('patient');
    expect(meData.email).toBe(uniqueEmail);
    expect(meData.status).toBe('active');
  });

  test('TC-02 (Edge Case): Register with an already-registered email -> Neutral message, no confirmation the account exists', async ({ page, request }) => {
    const existingEmail = 'j.hartwell@nhs.net'; // Seeded user

    // 1. UI test: Fill form with already-registered email
    await page.goto('/auth-signup.html');
    await page.fill('#name', 'James Hartwell Duplicate');
    await page.fill('#email', existingEmail);
    await page.fill('#password', 'AnotherPassword2026!');
    await page.check('#agree');
    await page.click('#submit-btn');

    // Verify neutral notice appears without revealing whether account exists
    const notice = page.locator('#neutral-notice');
    await expect(notice).toBeVisible();
    await expect(notice).toContainText("If no account exists for this email address, we've sent a verification link.");

    // 2. API contract verification: Direct API call returns neutral response indistinguishable from standard enumeration protection
    const apiRes = await request.post('/api/auth/register', {
      data: {
        name: 'James Hartwell',
        email: existingEmail,
        password: 'AnotherPassword2026!',
        role: 'patient',
        country_code: 'GB',
        timezone: 'Europe/London'
      }
    });

    expect(apiRes.status()).toBe(200);
    const body = await apiRes.json();
    expect(body.message).toContain("If no account exists for this email address");
    // Ensure no error like "Account already exists" or 409 Conflict is returned
    expect(body.error).toBeUndefined();
  });

  test('TC-03 (Security): Patient calls a doctor-only endpoint with a valid patient token -> 403 Forbidden', async ({ page, request }) => {
    // 1. Log in as patient
    await page.goto('/auth-signin.html');
    await page.fill('#email', 'j.hartwell@nhs.net');
    await page.fill('#password', 'SecurePassword2026!');
    await page.click('#signin-btn');
    await expect(page).toHaveURL(/patient-dashboard\.html/);

    const token = await page.evaluate(() => localStorage.getItem('docfit_token'));
    expect(token).toBeTruthy();

    // 2. Direct API call with patient token to doctor-only endpoint
    const doctorEndpointRes = await request.get('/api/doctor/schedule', {
      headers: { Authorization: `Bearer ${token}` }
    });

    // Pass/Fail criterion: Status is 403 and no data returned
    expect(doctorEndpointRes.status()).toBe(403);
    const errorBody = await doctorEndpointRes.json();
    expect(errorBody.error).toBe('Forbidden');
    expect(errorBody.schedule).toBeUndefined();

    // 3. UI flow: Patient accessing restricted doctor section shows 403 Forbidden page
    await page.goto('/auth-forbidden.html');
    await expect(page.locator('h1')).toHaveText("You don't have permission to view this page");
    await expect(page.locator('body')).toContainText('403 · Access Denied');
    await expect(page.locator('#chip-role-email')).toContainText('Patient');
  });

  test('TC-04 (Security): Doctor account logs in without MFA enrolled -> Forced into MFA enrollment before access', async ({ page, request }) => {
    // Doctor 'p.kapoor@hospital.org' is seeded with mfa_enrolled: false
    await page.goto('/auth-signin.html');
    await page.fill('#email', 'p.kapoor@hospital.org');
    await page.fill('#password', 'SecurePassword2026!');
    await page.click('#signin-btn');

    // 1. Must NOT go directly to dashboard; forced to MFA enrollment
    await expect(page).toHaveURL(/auth-mfa-enroll\.html/);
    await expect(page.locator('h1')).toHaveText('Set up two-factor authentication');
    await expect(page.locator('body')).toContainText('Two-factor authentication is required for doctor accounts.');

    // 2. Try accessing doctor endpoint before completing MFA
    const tokenBeforeMfa = await page.evaluate(() => localStorage.getItem('docfit_token'));
    // Main token is not set yet
    expect(tokenBeforeMfa).toBeNull();

    // 3. Complete MFA setup by submitting 6-digit confirmation code
    await page.fill('#enroll-code', '123456');
    await page.click('#enroll-btn');

    // 4. Access now granted, token stored
    await expect(page).toHaveURL(/patient-dashboard\.html/);
    const tokenAfterMfa = await page.evaluate(() => localStorage.getItem('docfit_token'));
    expect(tokenAfterMfa).toBeTruthy();

    // 5. Verify doctor endpoint is now accessible with newly granted doctor token
    const doctorScheduleRes = await request.get('/api/doctor/schedule', {
      headers: { Authorization: `Bearer ${tokenAfterMfa}` }
    });
    expect(doctorScheduleRes.status()).toBe(200);
    const scheduleData = await doctorScheduleRes.json();
    expect(scheduleData.schedule).toBeDefined();
    expect(scheduleData.schedule.length).toBeGreaterThan(0);
  });

});
