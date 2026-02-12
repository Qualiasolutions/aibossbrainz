const RETRY_INTERVAL_MS = 60_000;

let unavailable = false;
let unavailableSince = 0;

export function isVoiceServiceAvailable(): boolean {
	if (!unavailable) return true;

	if (Date.now() - unavailableSince > RETRY_INTERVAL_MS) {
		unavailable = false;
		unavailableSince = 0;
		return true;
	}

	return false;
}

export function markVoiceServiceUnavailable(): void {
	unavailable = true;
	unavailableSince = Date.now();
}
