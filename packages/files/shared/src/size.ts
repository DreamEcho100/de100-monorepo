const sizeUnits = {
	B: 1,
	KB: 1024,
	MB: 1024 ** 2,
	GB: 1024 ** 3,
	TB: 1024 ** 4,
} as const;

export type FileSizeUnit = keyof typeof sizeUnits;
export type FileSizeInput = number | `${number}${FileSizeUnit}` | `${number} ${FileSizeUnit}`;

export function parseFileSizeToBytes(input: FileSizeInput): number {
	if (typeof input === "number") {
		assertNonNegativeInteger(input, "file size");
		return input;
	}

	const match = input.trim().match(/^(\d+(?:\.\d+)?)\s?(B|KB|MB|GB|TB)$/i);
	if (!match) {
		throw new Error(`Invalid file size: ${input}`);
	}

	const amount = Number(match[1]);
	const unit = match[2]?.toUpperCase() as FileSizeUnit | undefined;
	if (!unit || !Number.isFinite(amount) || amount < 0) {
		throw new Error(`Invalid file size: ${input}`);
	}

	return Math.floor(amount * sizeUnits[unit]);
}

export function formatBytes(bytes: number): string {
	assertNonNegativeInteger(bytes, "bytes");

	for (const unit of ["TB", "GB", "MB", "KB"] as const) {
		const unitBytes = sizeUnits[unit];
		if (bytes >= unitBytes) {
			return `${Number((bytes / unitBytes).toFixed(1))}${unit}`;
		}
	}

	return `${bytes}B`;
}

function assertNonNegativeInteger(value: number, field: string) {
	if (!Number.isInteger(value) || value < 0) {
		throw new Error(`${field} must be a non-negative integer.`);
	}
}
