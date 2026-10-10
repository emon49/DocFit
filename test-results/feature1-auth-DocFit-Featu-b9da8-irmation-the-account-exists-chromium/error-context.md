# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: feature1-auth.spec.ts >> DocFit Feature 1: Accounts, Roles and Authentication >> TC-02 (Edge Case): Register with an already-registered email -> Neutral message, no confirmation the account exists
- Location: tests/feature1-auth.spec.ts:57:3

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: page.fill: Test timeout of 30000ms exceeded.
Call log:
  - waiting for locator('#name')

```

# Page snapshot

```yaml
- generic [active] [ref=e1]: "Error: ENOENT: no such file or directory, stat '/app/applet/dist/public/auth-signup.html'"
```

# Test source

```ts
  1   | import { test, expect } from '@playwright/test';
  2   | 
  3   | test.describe('DocFit Feature 1: Accounts, Roles and Authentication', () => {
  4   | 
  5   |   test.beforeEach(async ({ request }) => {
  6   |     // Reset seed state before each test run
  7   |     await request.post('/api/test/reset');
  8   |   });
  9   | 
  10  |   test('TC-01 (Happy Path): Patient registers, verifies email, logs in -> Account active, patient dashboard shown', async ({ page, request }) => {
  11  |     const uniqueEmail = `test.patient.${Date.now()}@example.com`;
  12  |     const password = 'StrongPassword2026!';
  13  | 
  14  |     // 1. Visit signup page
  15  |     await page.goto('/auth-signup.html');
  16  |     await expect(page.locator('h1')).toHaveText('Create your account');
  17  | 
  18  |     // 2. Fill registration form
  19  |     await page.fill('#name', 'Alice NewPatient');
  20  |     await page.fill('#email', uniqueEmail);
  21  |     await page.fill('#password', password);
  22  |     await page.check('#agree');
  23  | 
  24  |     // 3. Submit form and verify navigation to inbox pending verification
  25  |     await page.click('#submit-btn');
  26  |     await expect(page).toHaveURL(/auth-verify-pending\.html/);
  27  |     await expect(page.locator('#target-email')).toHaveText(uniqueEmail);
  28  | 
  29  |     // 4. Verify email using the verification screen action
  30  |     await page.click('#verify-now-btn');
  31  |     await expect(page).toHaveURL(/auth-signin\.html/);
  32  | 
  33  |     // 5. Sign in with verified credentials
  34  |     await page.fill('#email', uniqueEmail);
  35  |     await page.fill('#password', password);
  36  |     await page.click('#signin-btn');
  37  | 
  38  |     // 6. Patient dashboard loads
  39  |     await expect(page).toHaveURL(/patient-dashboard\.html/);
  40  |     await expect(page.locator('#greeting-heading')).toContainText('Alice');
  41  |     await expect(page.locator('#email-verified-badge')).toBeVisible();
  42  | 
  43  |     // 7. Verify /me API response returns role = patient
  44  |     const token = await page.evaluate(() => localStorage.getItem('docfit_token'));
  45  |     expect(token).toBeTruthy();
  46  | 
  47  |     const meResponse = await request.get('/api/me', {
  48  |       headers: { Authorization: `Bearer ${token}` }
  49  |     });
  50  |     expect(meResponse.status()).toBe(200);
  51  |     const meData = await meResponse.json();
  52  |     expect(meData.role).toBe('patient');
  53  |     expect(meData.email).toBe(uniqueEmail);
  54  |     expect(meData.status).toBe('active');
  55  |   });
  56  | 
  57  |   test('TC-02 (Edge Case): Register with an already-registered email -> Neutral message, no confirmation the account exists', async ({ page, request }) => {
  58  |     const existingEmail = 'j.hartwell@nhs.net'; // Seeded user
  59  | 
  60  |     // 1. UI test: Fill form with already-registered email
  61  |     await page.goto('/auth-signup.html');
> 62  |     await page.fill('#name', 'James Hartwell Duplicate');
      |                ^ Error: page.fill: Test timeout of 30000ms exceeded.
  63  |     await page.fill('#email', existingEmail);
  64  |     await page.fill('#password', 'AnotherPassword2026!');
  65  |     await page.check('#agree');
  66  |     await page.click('#submit-btn');
  67  | 
  68  |     // Verify neutral notice appears without revealing whether account exists
  69  |     const notice = page.locator('#neutral-notice');
  70  |     await expect(notice).toBeVisible();
  71  |     await expect(notice).toContainText("If no account exists for this email address, we've sent a verification link.");
  72  | 
  73  |     // 2. API contract verification: Direct API call returns neutral response indistinguishable from standard enumeration protection
  74  |     const apiRes = await request.post('/api/auth/register', {
  75  |       data: {
  76  |         name: 'James Hartwell',
  77  |         email: existingEmail,
  78  |         password: 'AnotherPassword2026!',
  79  |         role: 'patient',
  80  |         country_code: 'GB',
  81  |         timezone: 'Europe/London'
  82  |       }
  83  |     });
  84  | 
  85  |     expect(apiRes.status()).toBe(200);
  86  |     const body = await apiRes.json();
  87  |     expect(body.message).toContain("If no account exists for this email address");
  88  |     // Ensure no error like "Account already exists" or 409 Conflict is returned
  89  |     expect(body.error).toBeUndefined();
  90  |   });
  91  | 
  92  |   test('TC-03 (Security): Patient calls a doctor-only endpoint with a valid patient token -> 403 Forbidden', async ({ page, request }) => {
  93  |     // 1. Log in as patient
  94  |     await page.goto('/auth-signin.html');
  95  |     await page.fill('#email', 'j.hartwell@nhs.net');
  96  |     await page.fill('#password', 'SecurePassword2026!');
  97  |     await page.click('#signin-btn');
  98  |     await expect(page).toHaveURL(/patient-dashboard\.html/);
  99  | 
  100 |     const token = await page.evaluate(() => localStorage.getItem('docfit_token'));
  101 |     expect(token).toBeTruthy();
  102 | 
  103 |     // 2. Direct API call with patient token to doctor-only endpoint
  104 |     const doctorEndpointRes = await request.get('/api/doctor/schedule', {
  105 |       headers: { Authorization: `Bearer ${token}` }
  106 |     });
  107 | 
  108 |     // Pass/Fail criterion: Status is 403 and no data returned
  109 |     expect(doctorEndpointRes.status()).toBe(403);
  110 |     const errorBody = await doctorEndpointRes.json();
  111 |     expect(errorBody.error).toBe('Forbidden');
  112 |     expect(errorBody.schedule).toBeUndefined();
  113 | 
  114 |     // 3. UI flow: Patient accessing restricted doctor section shows 403 Forbidden page
  115 |     await page.goto('/auth-forbidden.html');
  116 |     await expect(page.locator('h1')).toHaveText("You don't have permission to view this page");
  117 |     await expect(page.locator('body')).toContainText('403 · Access Denied');
  118 |     await expect(page.locator('#chip-role-email')).toContainText('Patient');
  119 |   });
  120 | 
  121 |   test('TC-04 (Security): Doctor account logs in without MFA enrolled -> Forced into MFA enrollment before access', async ({ page, request }) => {
  122 |     // Doctor 'p.kapoor@hospital.org' is seeded with mfa_enrolled: false
  123 |     await page.goto('/auth-signin.html');
  124 |     await page.fill('#email', 'p.kapoor@hospital.org');
  125 |     await page.fill('#password', 'SecurePassword2026!');
  126 |     await page.click('#signin-btn');
  127 | 
  128 |     // 1. Must NOT go directly to dashboard; forced to MFA enrollment
  129 |     await expect(page).toHaveURL(/auth-mfa-enroll\.html/);
  130 |     await expect(page.locator('h1')).toHaveText('Set up two-factor authentication');
  131 |     await expect(page.locator('body')).toContainText('Two-factor authentication is required for doctor accounts.');
  132 | 
  133 |     // 2. Try accessing doctor endpoint before completing MFA
  134 |     const tokenBeforeMfa = await page.evaluate(() => localStorage.getItem('docfit_token'));
  135 |     // Main token is not set yet
  136 |     expect(tokenBeforeMfa).toBeNull();
  137 | 
  138 |     // 3. Complete MFA setup by submitting 6-digit confirmation code
  139 |     await page.fill('#enroll-code', '123456');
  140 |     await page.click('#enroll-btn');
  141 | 
  142 |     // 4. Access now granted, token stored
  143 |     await expect(page).toHaveURL(/patient-dashboard\.html/);
  144 |     const tokenAfterMfa = await page.evaluate(() => localStorage.getItem('docfit_token'));
  145 |     expect(tokenAfterMfa).toBeTruthy();
  146 | 
  147 |     // 5. Verify doctor endpoint is now accessible with newly granted doctor token
  148 |     const doctorScheduleRes = await request.get('/api/doctor/schedule', {
  149 |       headers: { Authorization: `Bearer ${tokenAfterMfa}` }
  150 |     });
  151 |     expect(doctorScheduleRes.status()).toBe(200);
  152 |     const scheduleData = await doctorScheduleRes.json();
  153 |     expect(scheduleData.schedule).toBeDefined();
  154 |     expect(scheduleData.schedule.length).toBeGreaterThan(0);
  155 |   });
  156 | 
  157 | });
  158 | 
```