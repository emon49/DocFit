# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: landing.spec.ts >> DocFit Landing Page & Navigation Wiring >> Session state awareness in navigation bar
- Location: tests/landing.spec.ts:47:3

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: locator('text=My Dashboard')
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" locator('text=My Dashboard') with timeout 5000ms
  - waiting for locator('text=My Dashboard')

```

```yaml
- text: "Error: ENOENT: no such file or directory, stat '/app/applet/dist/public/index.html'"
```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | 
  3  | test.describe('DocFit Landing Page & Navigation Wiring', () => {
  4  | 
  5  |   test('Landing page renders hero, stats, steps, features, and doctor band', async ({ page }) => {
  6  |     await page.goto('/');
  7  | 
  8  |     // Check title and hero
  9  |     await expect(page).toHaveTitle(/DocFit · Online Healthcare Consultations/);
  10 |     await expect(page.locator('.hero-headline')).toContainText('A doctor,');
  11 |     await expect(page.locator('.hero-headline em')).toHaveText('whenever');
  12 | 
  13 |     // Check stats strip
  14 |     await expect(page.locator('.stats')).toBeVisible();
  15 |     await expect(page.locator('.stats')).toContainText('4,200+');
  16 |     await expect(page.locator('.stats')).toContainText('38K+');
  17 | 
  18 |     // Check steps and features
  19 |     await expect(page.locator('#how-it-works')).toBeVisible();
  20 |     await expect(page.locator('#features')).toBeVisible();
  21 |     await expect(page.locator('#for-doctors')).toBeVisible();
  22 |   });
  23 | 
  24 |   test('Navigation links route to registration and login pages', async ({ page }) => {
  25 |     await page.goto('/');
  26 | 
  27 |     // 1. Sign in button navigates to auth-signin.html
  28 |     await page.click('#nav-signin-btn');
  29 |     await expect(page).toHaveURL(/auth-signin\.html/);
  30 | 
  31 |     // 2. Return to home and click "Get started" button
  32 |     await page.goto('/');
  33 |     await page.click('#nav-signup-btn');
  34 |     await expect(page).toHaveURL(/auth-signup\.html/);
  35 | 
  36 |     // 3. Return to home and click "Book a consultation" hero button
  37 |     await page.goto('/');
  38 |     await page.click('#hero-book-btn');
  39 |     await expect(page).toHaveURL(/auth-signup\.html/);
  40 | 
  41 |     // 4. Return to home and click "Apply as a doctor"
  42 |     await page.goto('/');
  43 |     await page.click('#doctor-band-apply-btn');
  44 |     await expect(page).toHaveURL(/auth-signup-doctor\.html/);
  45 |   });
  46 | 
  47 |   test('Session state awareness in navigation bar', async ({ page }) => {
  48 |     // Navigate and set mock logged in token in localStorage
  49 |     await page.goto('/');
  50 |     await page.evaluate(() => {
  51 |       localStorage.setItem('docfit_token', 'mock_patient_token_123');
  52 |     });
  53 | 
  54 |     // Reload page to reflect session
  55 |     await page.reload();
  56 | 
  57 |     // Verify "My Dashboard" button is shown instead of "Sign in"
  58 |     const dashboardBtn = page.locator('text=My Dashboard');
> 59 |     await expect(dashboardBtn).toBeVisible();
     |                                ^ Error: expect(locator).toBeVisible() failed
  60 | 
  61 |     await dashboardBtn.click();
  62 |     await expect(page).toHaveURL(/patient-dashboard\.html/);
  63 |   });
  64 | 
  65 | });
  66 | 
```