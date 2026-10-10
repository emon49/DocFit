# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: feature2-onboarding.spec.ts >> DocFit Feature 2: Doctor Onboarding and License Verification >> F2-TC-01: Doctor completes full 5-step onboarding and submits -> Status is pending review
- Location: tests/feature2-onboarding.spec.ts:13:3

# Error details

```
Error: expect(locator).toHaveText(expected) failed

Locator: locator('h1')
Expected: "Personal details"
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toHaveText" locator('h1') with timeout 5000ms
  - waiting for locator('h1')

```

```yaml
- text: "Error: ENOENT: no such file or directory, stat '/app/applet/dist/public/onboarding-step1-personal.html'"
```

# Test source

```ts
  1   | import { test, expect } from '@playwright/test';
  2   | 
  3   | test.describe('DocFit Feature 2: Doctor Onboarding and License Verification', () => {
  4   | 
  5   |   test.beforeEach(async ({ page, request }) => {
  6   |     // Stop pending page requests and reset database to initial seed before each test
  7   |     try {
  8   |       await page.goto('about:blank');
  9   |     } catch (e) {}
  10  |     await request.post('/api/test/reset');
  11  |   });
  12  | 
  13  |   test('F2-TC-01: Doctor completes full 5-step onboarding and submits -> Status is pending review', async ({ page, request }) => {
  14  |     // 1. Visit Step 1: Personal Details
  15  |     await page.goto('/onboarding-step1-personal.html');
> 16  |     await expect(page.locator('h1')).toHaveText('Personal details');
      |                                      ^ Error: expect(locator).toHaveText(expected) failed
  17  | 
  18  |     await page.fill('#full-name', 'Dr. Amara Osei-Bonsu');
  19  |     await page.fill('#dob', '1985-04-12');
  20  |     await page.selectOption('#gender', 'female');
  21  |     await page.fill('#nationality', 'Ghanaian');
  22  |     await page.fill('#phone', '+44 7700 904 312');
  23  |     await page.fill('#address1', '47 Elmwood Avenue');
  24  |     await page.fill('#city', 'Birmingham');
  25  |     await page.fill('#postcode', 'B15 2TT');
  26  |     await page.selectOption('#country', 'gb');
  27  |     await page.click('#continue-btn');
  28  | 
  29  |     // 2. Navigates to Step 2: Licensure
  30  |     await expect(page).toHaveURL(/onboarding-step2-licensure\.html/);
  31  |     await expect(page.locator('h1')).toHaveText('Licensure');
  32  |     await page.fill('#license-number', 'GMC-7842913');
  33  |     await page.fill('#issuing-authority', 'General Medical Council (GMC)');
  34  |     await page.selectOption('#country-of-licensure', 'gb');
  35  |     await page.fill('#issue-date', '2012-09-01');
  36  |     await page.fill('#expiry-date', '2027-08-31');
  37  |     await page.selectOption('#license-type', 'full');
  38  |     await page.fill('#primary-specialty', 'Cardiology');
  39  |     await page.click('#continue-btn');
  40  | 
  41  |     // 3. Navigates to Step 3: Documents
  42  |     await expect(page).toHaveURL(/onboarding-step3-upload\.html/);
  43  |     await expect(page.locator('h1')).toHaveText('Documents');
  44  |     await expect(page.locator('#license-doc-name')).toHaveText('GMC_Certificate_Osei-Bonsu.pdf');
  45  |     await page.click('#continue-btn');
  46  | 
  47  |     // 4. Navigates to Step 4: Specialties
  48  |     await expect(page).toHaveURL(/onboarding-step4-specialty\.html/);
  49  |     await expect(page.locator('h1')).toHaveText('Select your specialties');
  50  |     await expect(page.locator('#selected-count-text')).toContainText('selected');
  51  |     await page.click('#continue-btn');
  52  | 
  53  |     // 5. Navigates to Step 5: Fees & Submit
  54  |     await expect(page).toHaveURL(/onboarding-step5-fees\.html/);
  55  |     await expect(page.locator('#summary-license-num')).toHaveText('GMC-7842913');
  56  |     await expect(page.locator('#summary-council')).toHaveText('General Medical Council (GMC)');
  57  | 
  58  |     // 6. Submit application
  59  |     await page.click('#submit-btn');
  60  | 
  61  |     // 7. Navigates to Onboarding Status Pending screen
  62  |     await expect(page).toHaveURL(/onboarding-status-pending\.html/);
  63  |     await expect(page.locator('h1')).toHaveText('Application under review');
  64  |     await expect(page.locator('body')).toContainText('License verification in progress');
  65  |   });
  66  | 
  67  |   test('F2-TC-02 (Validation): Submitting an expired license date triggers error banner and blocks progress', async ({ page }) => {
  68  |     await page.goto('/onboarding-step2-licensure.html');
  69  | 
  70  |     // Enter past expiration date (e.g. 2023-06-30)
  71  |     await page.fill('#expiry-date', '2023-06-30');
  72  | 
  73  |     // Verify error banner matches design onboarding-step2-licensure-error.html
  74  |     const errorBanner = page.locator('#expired-error-container');
  75  |     await expect(errorBanner).toBeVisible();
  76  |     await expect(errorBanner).toContainText('License expired on 30 Jun 2023. An active, unexpired license is required to register.');
  77  | 
  78  |     // Continue button must be disabled
  79  |     const continueBtn = page.locator('#continue-btn');
  80  |     await expect(continueBtn).toBeDisabled();
  81  | 
  82  |     // Verify standalone static error screen renders faithfully
  83  |     await page.goto('/onboarding-step2-licensure-error.html');
  84  |     await expect(page.locator('#error-msg-banner')).toContainText('License expired on 30 Jun 2023. An active, unexpired license is required to register.');
  85  |     await expect(page.locator('#continue-btn')).toBeDisabled();
  86  |   });
  87  | 
  88  |   test('F2-TC-03 (Validation): Document upload with unsupported format displays clear rejection error and allows retry', async ({ page, request }) => {
  89  |     // 1. Check API validation for rejected file formats
  90  |     const apiRes = await request.post('/api/doctor/onboarding/upload', {
  91  |       data: {
  92  |         filename: 'setup_wizard.pdf',
  93  |         category: 'id'
  94  |       }
  95  |     });
  96  |     expect(apiRes.status()).toBe(400);
  97  |     const apiData = await apiRes.json();
  98  |     expect(apiData.message).toContain('File rejected — the content does not match a supported format');
  99  | 
  100 |     // 2. Check UI error screen reproduction
  101 |     await page.goto('/onboarding-step3-upload-error.html');
  102 |     await expect(page.locator('#error-file-title')).toHaveText('setup_wizard.pdf');
  103 |     await expect(page.locator('#error-file-description')).toContainText('File rejected — the content does not match a supported format');
  104 |     await expect(page.locator('text=Try again')).toBeVisible();
  105 |   });
  106 | 
  107 |   test('F2-TC-04: Admin reviews doctor in queue, ticks registry checklist, and approves application -> Doctor profile active', async ({ page, request }) => {
  108 |     // 1. Visit Admin Queue
  109 |     await page.goto('/admin-queue.html');
  110 |     await expect(page.locator('h1')).toHaveText('Doctor Verification Queue');
  111 |     await expect(page.locator('#queue-table')).toContainText('Dr. Amara Osei-Bonsu');
  112 | 
  113 |     // 2. Navigate to Review Detail for Dr. Amara Osei-Bonsu
  114 |     await page.goto('/admin-review-detail.html?id=doc_amara_001');
  115 |     await expect(page.locator('#doctor-title-name')).toHaveText('Dr. Amara Osei-Bonsu');
  116 |     await expect(page.locator('#info-license-num')).toHaveText('GMC-7842913');
```