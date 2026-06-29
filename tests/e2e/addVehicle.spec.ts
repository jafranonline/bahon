import { test, expect } from '@playwright/test'

test('add a vehicle and see it in the vehicle strip', async ({ page }) => {
  await page.goto('/')

  // Navigate to add vehicle
  await page.getByRole('button', { name: /add vehicle/i }).first().click()
  await expect(page).toHaveURL('/vehicles/add')

  // Fill the form
  await page.locator('#vehicle-name').fill('My Corolla')
  await page.locator('#vehicle-brand').fill('Toyota')
  await page.locator('#vehicle-model').fill('Corolla')
  await page.locator('#vehicle-year').fill('2022')
  await page.locator('#vehicle-odo').fill('15000')

  // Save
  await page.getByRole('button', { name: /add vehicle/i }).click()

  // Should redirect back to home
  await expect(page).toHaveURL('/')

  // Vehicle pill should be visible (button in vehicle strip)
  await expect(page.getByRole('button', { name: 'My Corolla', exact: true })).toBeVisible()
})
