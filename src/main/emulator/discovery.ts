// Turns the KytyPS5 folder the user chose into the kyty_emulator to run. On macOS the folder may
// hold KytyPS5.app (the emulator inside it shares save data and cheats with the Qt launcher), or
// be the bundle itself.
import fs from 'node:fs';
import path from 'node:path';
import type { Platform } from '../../shared/settings';

export function emulatorExeName(platform: Platform): string {
	return platform === 'win32' ? 'kyty_emulator.exe' : 'kyty_emulator';
}

function isFile(file: string): boolean {
	try {
		return fs.statSync(file).isFile();
	} catch {
		return false;
	}
}

function isDirectory(dir: string): boolean {
	try {
		return fs.statSync(dir).isDirectory();
	} catch {
		return false;
	}
}

export type EmulatorLocation = { path: string } | { error: string };

export function resolveEmulatorLocation(platform: Platform, location: string): EmulatorLocation {
	const dir = path.resolve(location);
	if (!isDirectory(dir)) {
		return { error: `${dir} is not a folder.` };
	}
	const exe = emulatorExeName(platform);
	const candidates: string[] = [];
	if (platform === 'darwin') {
		if (path.basename(dir).endsWith('.app')) {
			candidates.push(path.join(dir, 'Contents', 'MacOS', exe));
		}
		candidates.push(path.join(dir, 'KytyPS5.app', 'Contents', 'MacOS', exe));
	}
	candidates.push(path.join(dir, exe));
	const found = candidates.find(isFile);
	if (found === undefined) {
		return { error: platform === 'darwin' ? `There is no KytyPS5.app or ${exe} in this folder.` : `There is no ${exe} in this folder.` };
	}
	return { path: found };
}

// --emulator / KYTY_EMULATOR name the executable itself.
export function resolveEmulatorOverride(override: string): EmulatorLocation {
	const file = path.resolve(override);
	return isFile(file) ? { path: file } : { error: `${file} does not exist.` };
}
