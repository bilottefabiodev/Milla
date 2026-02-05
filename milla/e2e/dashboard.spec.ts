import { test, expect } from '@playwright/test';

// These tests require a logged-in user
// For CI, you would set up test fixtures or use Supabase test users

test.describe('Dashboard - Mapa da Vida', () => {
    test.skip('should display sidebar navigation when logged in', async ({ page }) => {
        // This test requires authentication setup
        // Skip for now - implement with auth fixtures

        await page.goto('/mapa');

        // Sidebar elements
        await expect(page.locator('text=Milla')).toBeVisible();
        await expect(page.getByRole('link', { name: /mapa da vida/i })).toBeVisible();
        await expect(page.getByRole('link', { name: /perfil/i })).toBeVisible();
    });

    test.skip('should display 5 reading sections', async ({ page }) => {
        await page.goto('/mapa');

        // Check for section cards
        await expect(page.locator('text=/missão da alma/i')).toBeVisible();
        await expect(page.locator('text=/personalidade/i')).toBeVisible();
        await expect(page.locator('text=/destino/i')).toBeVisible();
        await expect(page.locator('text=/propósito/i')).toBeVisible();
        await expect(page.locator('text=/manifestação material/i')).toBeVisible();
    });

    test.skip('should switch between sections', async ({ page }) => {
        await page.goto('/mapa');

        // Click on Personalidade section
        await page.locator('text=/personalidade/i').click();

        // Content should update
        await expect(page.locator('.reading-content')).toBeVisible();
    });
});

test.describe('Navigation', () => {
    test.skip('should navigate between Mapa and Perfil', async ({ page }) => {
        await page.goto('/mapa');

        // Click Perfil in sidebar
        await page.getByRole('link', { name: /perfil/i }).click();
        await expect(page).toHaveURL('/perfil');

        // Click back to Mapa
        await page.getByRole('link', { name: /mapa da vida/i }).click();
        await expect(page).toHaveURL('/mapa');
    });

    test.skip('should logout successfully', async ({ page }) => {
        await page.goto('/mapa');

        // Click logout button
        await page.getByRole('button', { name: /sair/i }).click();

        // Should redirect to landing
        await expect(page).toHaveURL('/');
    });
});
