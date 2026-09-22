import { expect, test } from '@playwright/test';

test('register, create workspace and project, generate/revoke key, persist through logout', async ({
  page,
}) => {
  const suffix = Date.now();
  const email = `browser-${suffix}@example.com`;
  const password = 'DevPulse-browser-test-2026';
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));

  await page.goto('/register');
  await page.getByLabel('Full name').fill('Alex Morgan');
  await page.getByLabel('Email address').fill(email);
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Create account', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Good to see you, Alex.' })).toBeVisible();
  await page.getByRole('button', { name: 'Create workspace', exact: true }).first().click();
  await page.getByLabel('Workspace name').fill(`Acme ${suffix}`);
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(page.getByRole('dialog')).not.toBeVisible();
  await page.screenshot({ path: '.local/overview-desktop.png', fullPage: true });

  await page.getByRole('button', { name: 'New workspace', exact: true }).click();
  await page.getByLabel('Workspace name').fill(`Product ${suffix}`);
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(page.getByRole('dialog')).not.toBeVisible();

  await page.getByRole('button', { name: 'New project', exact: true }).click();
  await page.getByLabel('Project name').fill('Storefront');
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Storefront.' })).toBeVisible();
  const projectUrl = page.url();
  await page.getByRole('button', { name: 'Create key', exact: true }).click();
  await page.getByLabel('Key name').fill('Production browser');
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(page.getByText('Your key is ready. Copy it now.')).toBeVisible();
  await expect(page.getByRole('cell', { name: 'Production browser', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Dismiss generated key' }).click();
  await page.screenshot({ path: '.local/project-desktop.png', fullPage: true });
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Storefront.' })).toBeVisible();
  await expect(page.getByLabel('Workspace', { exact: true }).locator('option:checked')).toHaveText(
    `Product ${suffix}`,
  );
  await expect(page.getByText('Your key is ready. Copy it now.')).not.toBeVisible();

  await page.getByRole('button', { name: 'Revoke', exact: true }).click();
  await page.getByRole('button', { name: 'Revoke key', exact: true }).click();
  await expect(page.getByRole('cell', { name: 'Revoked', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Sign out', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Welcome back.' })).toBeVisible();
  await page.screenshot({ path: '.local/login-desktop.png', fullPage: true });
  await page.getByLabel('Email address').fill(email);
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Good to see you, Alex.' })).toBeVisible();
  await page.goto(projectUrl);
  await expect(page.getByRole('heading', { name: 'Storefront.' })).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByRole('cell', { name: 'Revoked', exact: true })).toBeVisible();
  await page.screenshot({ path: '.local/project-mobile.png', fullPage: true });
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
  ).toBeTruthy();
  expect(errors).toEqual([]);

  // Clean up this test's project through the public UI; the synthetic account/workspace remain.
  await page.getByRole('button', { name: 'Delete project', exact: true }).click();
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Delete project', exact: true })
    .click();
  await expect(
    page.getByRole('heading', { name: 'Your next project belongs here.' }),
  ).toBeVisible();
});
