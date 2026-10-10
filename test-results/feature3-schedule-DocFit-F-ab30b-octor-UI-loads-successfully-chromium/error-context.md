# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: feature3-schedule.spec.ts >> DocFit Feature 3: Doctor Availability Scheduling >> TC-04 (Security): Unauthorized or invalid access check / Doctor UI loads successfully
- Location: tests/feature3-schedule.spec.ts:69:3

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: locator('h1, span').filter({ hasText: 'My Schedule' })
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" locator('h1, span').filter({ hasText: 'My Schedule' }) with timeout 5000ms
  - waiting for locator('h1, span').filter({ hasText: 'My Schedule' })

```

```yaml
- text: "Error: ENOENT: no such file or directory, stat '/app/applet/dist/public/doctor-schedule.html'"
```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | 
  3  | test.describe('DocFit Feature 3: Doctor Availability Scheduling', () => {
  4  | 
  5  |   test.beforeEach(async ({ page, request }) => {
  6  |     try {
  7  |       await page.goto('about:blank');
  8  |     } catch (e) {}
  9  |     await request.post('/api/test/reset');
  10 |   });
  11 | 
  12 |   test('TC-01 (Happy Path): Doctor sets Mon 09:00–12:00, 20-min slots -> 9 slots generated for each Monday', async ({ request }) => {
  13 |     // 1. Set slot length to 20 min
  14 |     const lenRes = await request.put('/api/doctors/me/slot-length', {
  15 |       data: { slot_length_minutes: 20 }
  16 |     });
  17 |     expect(lenRes.status()).toBe(200);
  18 | 
  19 |     // 2. Set rule for Monday 09:00 - 12:00
  20 |     const ruleRes = await request.put('/api/doctors/me/availability-rules', {
  21 |       data: {
  22 |         rules: [
  23 |           { day_of_week: 'monday', start_local_time: '09:00', end_local_time: '12:00' }
  24 |         ]
  25 |       }
  26 |     });
  27 |     expect(ruleRes.status()).toBe(200);
  28 |     const data = await ruleRes.json();
  29 |     
  30 |     // From 09:00 to 12:00 (180 mins) with 20 min slots = 9 slots
  31 |     const mondaySlots = data.slots.filter((s: any) => s.date === '2026-10-12'); // Oct 12 2026 is Monday
  32 |     expect(mondaySlots.length).toBe(9);
  33 |     expect(mondaySlots[0].time_str).toBe('09:00');
  34 |     expect(mondaySlots[8].time_str).toBe('11:40');
  35 |   });
  36 | 
  37 |   test('TC-02 (Edge Case): Doctor sets overlapping blocks Mon 09:00–11:00 and 10:00–12:00 -> Save rejected with overlap message', async ({ request }) => {
  38 |     const ruleRes = await request.put('/api/doctors/me/availability-rules', {
  39 |       data: {
  40 |         rules: [
  41 |           { day_of_week: 'monday', start_local_time: '09:00', end_local_time: '11:00' },
  42 |           { day_of_week: 'monday', start_local_time: '10:00', end_local_time: '12:00' }
  43 |         ]
  44 |       }
  45 |     });
  46 |     expect(ruleRes.status()).toBe(400);
  47 |     const data = await ruleRes.json();
  48 |     expect(data.error).toBe('overlap_error');
  49 |     expect(data.message.toLowerCase()).toContain('overlap');
  50 |   });
  51 | 
  52 |   test('TC-03 (Edge Case): Doctor marks a day as leave that has a booked consultation -> Warning listing the booking shown', async ({ request }) => {
  53 |     // Attempt to add leave on Thursday 15 Oct which has a booking in our seed/mock check
  54 |     const res = await request.post('/api/doctors/me/availability-exceptions', {
  55 |       data: {
  56 |         date: '2026-10-15',
  57 |         type: 'leave',
  58 |         note: 'Conference'
  59 |       }
  60 |     });
  61 |     expect(res.status()).toBe(400);
  62 |     const data = await res.json();
  63 |     expect(data.warning).toBe(true);
  64 |     expect(data.affected_bookings.length).toBe(1);
  65 |     expect(data.affected_bookings[0].patient_name).toBe('James Hartwell');
  66 |     expect(data.affected_bookings[0].status).toBe('Confirmed');
  67 |   });
  68 | 
  69 |   test('TC-04 (Security): Unauthorized or invalid access check / Doctor UI loads successfully', async ({ page }) => {
  70 |     await page.goto('/doctor-schedule.html');
> 71 |     await expect(page.locator('h1, span', { hasText: 'My Schedule' })).toBeVisible();
     |                                                                        ^ Error: expect(locator).toBeVisible() failed
  72 |     await expect(page.locator('text=Recurring weekly schedule')).toBeVisible();
  73 |   });
  74 | 
  75 | });
  76 | 
```