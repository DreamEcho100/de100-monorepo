const timeUnits = {
	d: 24 * 60 * 60,
	h: 60 * 60,
	m: 60,
	s: 1,
} as const;

export type TimeUnit = keyof typeof timeUnits;
export type TimeInput = number | `${number}${TimeUnit}` | `${number} ${TimeUnit}`;

export function parseTimeToSeconds(input: TimeInput): number {
	if (typeof input === "number") {
		assertPositiveInteger(input, "time");
		return input;
	}

	const match = input.trim().match(/^(\d+)\s?([smhd])$/i);
	if (!match) {
		throw new Error(`Invalid time value: ${input}`);
	}

	const amount = Number(match[1]);
	const unit = match[2]?.toLowerCase() as TimeUnit | undefined;
	if (!unit || !Number.isInteger(amount) || amount <= 0) {
		throw new Error(`Invalid time value: ${input}`);
	}

	return amount * timeUnits[unit];
}

function assertPositiveInteger(value: number, field: string) {
	if (!Number.isInteger(value) || value <= 0) {
		throw new Error(`${field} must be a positive integer.`);
	}
}
