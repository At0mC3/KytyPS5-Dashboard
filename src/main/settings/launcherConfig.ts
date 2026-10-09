// The dashboard's own settings, kept apart from Kyty.ini: which Kyty.ini to use depends on where
// KytyPS5 is, so its location has to be known first.
import fs from 'node:fs';
import { writeFileAtomic } from './settingsFile';

export interface LauncherConfig {
	emulatorLocation?: string;
}

export function readLauncherConfig(file: string): LauncherConfig {
	try {
		const data = JSON.parse(fs.readFileSync(file, 'utf8')) as unknown;
		if (data === null || typeof data !== 'object') {
			return {};
		}
		const location = (data as Record<string, unknown>).emulatorLocation;
		return typeof location === 'string' && location.length > 0 ? { emulatorLocation: location } : {};
	} catch {
		return {};
	}
}

export function writeLauncherConfig(file: string, config: LauncherConfig): void {
	writeFileAtomic(file, `${JSON.stringify(config, null, '\t')}\n`);
}
