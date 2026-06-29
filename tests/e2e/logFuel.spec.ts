import { test, expect } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  // Start fresh, add a vehicle first
  await page.goto('/')
  await page.getByRole('button', { name: /add vehicle/i }).first().click()
  await page.locator('#vehicle-name').fill('Fuel Test Car')
  await page.locator('#vehicle-brand').fill('Honda')
  await page.locator('#vehicle-model').fill('Civic')
  await page.locator('#vehicle-year').fill('2023')
  await page.locator('#vehicle-odo').fill('20000')
  await page.getByRole('button', { name: /add vehicle/i }).click()
  await expect(page).toHaveURL('/')
})

test('log a fuel fill-up and see cost on home screen', async ({ page }) => {
  // Wait for vehicle pill to be visible (data loaded), then click fuel quick-add
  await expect(page.getByRole('button', { name: 'Fuel Test Car', exact: true })).toBeVisible()
  await page.getByRole('button', { name: /add fuel/i }).click()
  await expect(page).toHaveURL('/log/fuel')

  // Fill volume and price per litre (default mode)
  await page.locator('#fuel-volume').fill('40')
  await page.locator('#fuel-price-per-l').fill('130')
  await page.locator('#fuel-current-odo').fill('20400')
  await page.locator('#fuel-prev-odo').fill('20000')

  // Save
  await page.getByRole('button', { name: /save fuel log/i }).click()

  // Should be back on home screen
  await expect(page).toHaveURL('/')
  // Vehicle pill should still be visible confirming we're on the home screen
  await expect(page.getByRole('button', { name: 'Fuel Test Car', exact: true })).toBeVisible()
})
