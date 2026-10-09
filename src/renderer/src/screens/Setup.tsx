// First start, or when KytyPS5 is no longer where it was: asks where KytyPS5 is installed.
import { useRef, useState } from 'react';
import { locateKytyPS5 } from '../actions';
import { Hints } from '../components/Glyph';
import { Icon } from '../components/Icon';
import { hoverFocus, useInitialFocus } from '../hooks';
import { kyty } from '../kyty';
import { useStore } from '../store';

export function Setup() {
	const app = useStore((state) => state.app);
	const ref = useRef<HTMLDivElement>(null);
	const [error, setError] = useState<string | undefined>();
	const [busy, setBusy] = useState(false);
	useInitialFocus(ref);

	const setup = app?.emulatorSetup;
	const mac = app?.platform === 'darwin';
	const browse = async () => {
		setBusy(true);
		const result = await locateKytyPS5();
		setBusy(false);
		setError(result.error);
	};

	let problem: string | undefined;
	if (setup?.source === 'saved' && setup.problem !== undefined) {
		problem = `KytyPS5 is no longer at ${setup.location}. ${setup.problem}`;
	} else if (setup?.source === 'override' && setup.problem !== undefined) {
		problem = `The emulator given with --emulator or KYTY_EMULATOR can't be used: ${setup.problem}`;
	}

	return (
		<div className="screen setup-screen" data-nav-scope="1" ref={ref}>
			<div className="setup-panel">
				<div className="setup-icon">
					<Icon name="controller" size={40} />
				</div>
				<h1 className="setup-title">{setup?.source === 'none' ? 'Welcome to KytyPS5 Dashboard' : 'Where is KytyPS5?'}</h1>
				<p className="setup-text">
					Choose the folder where KytyPS5 is installed: the one with <code>{app?.platform === 'win32' ? 'kyty_emulator.exe' : 'kyty_emulator'}</code>
					{mac ? ' or KytyPS5.app' : ''}. The dashboard remembers it; you can change it later in Settings → Launcher.
				</p>
				{(error ?? problem) !== undefined && (
					<p className="setup-error" role="alert">
						<Icon name="warning" size={20} />
						<span>{error ?? problem}</span>
					</p>
				)}
				<div className="setup-actions" data-nav-group>
					<button className="button button-primary" data-nav data-nav-default data-testid="locate-kytyps5" disabled={busy} onClick={() => void browse()} {...hoverFocus}>
						<Icon name="folderOpen" /> Browse…
					</button>
					<button className="button" data-nav onClick={() => void kyty.quit(false)} {...hoverFocus}>
						Quit
					</button>
				</div>
			</div>
			<Hints items={[{ action: 'confirm', label: 'Select' }]} />
		</div>
	);
}
