import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { readLauncherConfig, writeLauncherConfig } from '../settings/launcherConfig';
import { resolveEmulatorLocation, resolveEmulatorOverride } from './discovery';

let root: string;

beforeEach(() => {
	root = fs.mkdtempSync(path.join(os.tmpdir(), 'kyty-discovery-'));
});

afterEach(() => {
	fs.rmSync(root, { recursive: true, force: true });
});

function touch(file: string): string {
	fs.mkdirSync(path.dirname(file), { recursive: true });
	fs.writeFileSync(file, '');
	return file;
}

describe('resolveEmulatorLocation', () => {
	it('finds kyty_emulator in the chosen folder', () => {
		const exe = touch(path.join(root, 'Kyty', 'kyty_emulator'));
		expect(resolveEmulatorLocation('linux', path.join(root, 'Kyty'))).toEqual({ path: exe });
	});

	it('uses kyty_emulator.exe on Windows', () => {
		touch(path.join(root, 'kyty_emulator'));
		expect(resolveEmulatorLocation('win32', root)).toEqual({ error: 'There is no kyty_emulator.exe in this folder.' });
		const exe = touch(path.join(root, 'kyty_emulator.exe'));
		expect(resolveEmulatorLocation('win32', root)).toEqual({ path: exe });
	});

	it('looks inside KytyPS5.app on macOS', () => {
		const inApp = touch(path.join(root, 'KytyPS5.app', 'Contents', 'MacOS', 'kyty_emulator'));
		touch(path.join(root, 'kyty_emulator'));
		// The folder holding the bundle, or the bundle itself; the bundle wins over a loose binary.
		expect(resolveEmulatorLocation('darwin', root)).toEqual({ path: inApp });
		expect(resolveEmulatorLocation('darwin', path.join(root, 'KytyPS5.app'))).toEqual({ path: inApp });
		expect(resolveEmulatorLocation('linux', root)).toEqual({ path: path.join(root, 'kyty_emulator') });
	});

	it('explains what is wrong', () => {
		expect(resolveEmulatorLocation('linux', root)).toEqual({ error: 'There is no kyty_emulator in this folder.' });
		expect(resolveEmulatorLocation('darwin', root)).toEqual({ error: 'There is no KytyPS5.app or kyty_emulator in this folder.' });
		const file = touch(path.join(root, 'kyty_emulator'));
		expect(resolveEmulatorLocation('linux', file)).toEqual({ error: `${file} is not a folder.` });
		expect(resolveEmulatorLocation('linux', path.join(root, 'missing'))).toEqual({ error: `${path.join(root, 'missing')} is not a folder.` });
	});

	it('takes --emulator as the executable itself', () => {
		const exe = touch(path.join(root, 'kyty_emulator'));
		expect(resolveEmulatorOverride(exe)).toEqual({ path: exe });
		expect(resolveEmulatorOverride(path.join(root, 'nope'))).toEqual({ error: `${path.join(root, 'nope')} does not exist.` });
	});
});

describe('launcherConfig', () => {
	it('round-trips the KytyPS5 location', () => {
		const file = path.join(root, 'userData', 'dashboard.json');
		expect(readLauncherConfig(file)).toEqual({});
		writeLauncherConfig(file, { emulatorLocation: '/games/Kyty' });
		expect(readLauncherConfig(file)).toEqual({ emulatorLocation: '/games/Kyty' });
	});

	it('ignores a broken file', () => {
		const file = touch(path.join(root, 'dashboard.json'));
		fs.writeFileSync(file, '{ not json');
		expect(readLauncherConfig(file)).toEqual({});
		fs.writeFileSync(file, JSON.stringify({ emulatorLocation: 42 }));
		expect(readLauncherConfig(file)).toEqual({});
		fs.writeFileSync(file, 'null');
		expect(readLauncherConfig(file)).toEqual({});
	});
});
