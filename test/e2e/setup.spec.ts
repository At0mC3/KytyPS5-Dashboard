import fs from 'node:fs';
import path from 'node:path';
import { expect, test } from '@playwright/test';
import { createFixture, type Fixture } from '../fixture';
import { installFakeGamepad, launchApp, press } from './app';

// Starts like a fresh install: no --emulator / KYTY_EMULATOR, and the folder browser opens in
// the fixture's root.
function freshInstall(): Fixture {
	const fixture = createFixture();
	delete fixture.env.KYTY_EMULATOR;
	fixture.env.HOME = fixture.root;
	return fixture;
}

const configFile = (fixture: Fixture) => path.join(fixture.env.KYTY_USER_DATA!, 'dashboard.json');

test('asks where KytyPS5 is on first start and remembers it', async () => {
	const fixture = freshInstall();
	try {
		const first = await launchApp(fixture);
		try {
			const { page } = first;
			await expect(page.locator('.setup-title')).toHaveText('Welcome to KytyPS5 Dashboard');
			await installFakeGamepad(page);
			await expect(page.locator('[data-testid="locate-kytyps5"]')).toBeFocused();
			await page.waitForTimeout(200);
			await press(page, 'cross');
			await expect(page.locator('.modal-subtitle')).toHaveText(fixture.root);

			// A folder without the emulator is refused.
			await page.locator('.browser-entry', { hasText: /^Games$/ }).click();
			await page.getByRole('button', { name: 'Use this folder' }).click();
			await expect(page.locator('.setup-error')).toContainText('There is no kyty_emulator in this folder.');
			expect(fs.existsSync(configFile(fixture))).toBe(false);

			await page.locator('[data-testid="locate-kytyps5"]').click();
			await expect(page.locator('.modal-subtitle')).toHaveText(fixture.root);
			await page.locator('.browser-entry', { hasText: /^Kyty$/ }).click();
			await page.getByRole('button', { name: 'Use this folder' }).click();
			await expect(page.locator('.hero-title')).toHaveText('Crimson Harbor');
			expect(JSON.parse(fs.readFileSync(configFile(fixture), 'utf8'))).toEqual({ emulatorLocation: fixture.emulatorDir });
			const state = await page.evaluate(() => window.kyty.getState());
			expect(state.emulator.path).toBe(path.join(fixture.emulatorDir, 'kyty_emulator'));
			expect(state.emulator.queryAvailable).toBe(true);
		} finally {
			await first.app.close();
		}

		// The next start goes straight to the dashboard.
		const second = await launchApp(fixture);
		try {
			await expect(second.page.locator('.hero-title')).toHaveText('Crimson Harbor');
			await expect(second.page.locator('.setup-screen')).toHaveCount(0);
		} finally {
			await second.app.close();
		}
	} finally {
		fixture.cleanup();
	}
});

test('asks again when KytyPS5 is no longer where it was', async () => {
	const fixture = freshInstall();
	const gone = path.join(fixture.root, 'Moved');
	fs.mkdirSync(path.dirname(configFile(fixture)), { recursive: true });
	fs.writeFileSync(configFile(fixture), JSON.stringify({ emulatorLocation: gone }));
	const { app, page } = await launchApp(fixture);
	try {
		await expect(page.locator('.setup-title')).toHaveText('Where is KytyPS5?');
		await expect(page.locator('.setup-error')).toContainText(`KytyPS5 is no longer at ${gone}.`);
	} finally {
		await app.close();
		fixture.cleanup();
	}
});

test('changes the KytyPS5 location in settings', async () => {
	const fixture = freshInstall();
	const other = path.join(fixture.emulatorDir, 'Other build');
	fs.mkdirSync(other);
	fs.copyFileSync(path.join(fixture.emulatorDir, 'kyty_emulator'), path.join(other, 'kyty_emulator'));
	fs.chmodSync(path.join(other, 'kyty_emulator'), 0o755);
	fs.mkdirSync(path.dirname(configFile(fixture)), { recursive: true });
	fs.writeFileSync(configFile(fixture), JSON.stringify({ emulatorLocation: fixture.emulatorDir }));
	const { app, page } = await launchApp(fixture);
	try {
		await expect(page.locator('.hero-title')).toHaveText('Crimson Harbor');
		await page.locator('[data-testid="open-settings"]').click();
		await page.locator('.settings-nav-item[data-section="launcher"]').click();
		const row = page.locator('[data-testid="kytyps5-location"]');
		await expect(row).toContainText(fixture.emulatorDir);
		await row.click();
		await expect(page.locator('.modal-subtitle')).toHaveText(fixture.emulatorDir);
		await page.locator('.browser-entry', { hasText: 'Other build' }).click();
		await page.getByRole('button', { name: 'Use this folder' }).click();
		await expect(page.locator('.toast')).toContainText('KytyPS5 location changed.');
		await expect(page.locator('.hero-title')).toHaveText('Crimson Harbor');
		expect(JSON.parse(fs.readFileSync(configFile(fixture), 'utf8'))).toEqual({ emulatorLocation: other });
		expect((await page.evaluate(() => window.kyty.getState())).emulator.path).toBe(path.join(other, 'kyty_emulator'));
	} finally {
		await app.close();
		fixture.cleanup();
	}
});
