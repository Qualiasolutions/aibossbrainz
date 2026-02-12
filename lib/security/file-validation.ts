/**
 * File magic byte signatures for common image formats
 * This validates actual file content, not just MIME type
 */
const FILE_SIGNATURES: Record<string, { magic: number[]; offset: number }[]> = {
	"image/jpeg": [
		{ magic: [0xff, 0xd8, 0xff], offset: 0 }, // JPEG SOI marker
	],
	"image/png": [
		{ magic: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], offset: 0 }, // PNG signature
	],
	"image/gif": [
		{ magic: [0x47, 0x49, 0x46, 0x38, 0x37, 0x61], offset: 0 }, // GIF87a
		{ magic: [0x47, 0x49, 0x46, 0x38, 0x39, 0x61], offset: 0 }, // GIF89a
	],
	"image/webp": [
		{ magic: [0x52, 0x49, 0x46, 0x46], offset: 0 }, // RIFF header (WebP starts with RIFF)
	],
	"application/pdf": [
		{ magic: [0x25, 0x50, 0x44, 0x46], offset: 0 }, // %PDF
	],
};

/**
 * Validates file content against known magic byte signatures
 * Returns true if the file content matches the expected format
 */
export async function validateFileContent(
	file: Blob,
	expectedMimeType: string,
): Promise<{ valid: boolean; detectedType?: string; error?: string }> {
	try {
		// Read first 16 bytes for signature detection
		const buffer = await file.slice(0, 16).arrayBuffer();
		const bytes = new Uint8Array(buffer);

		// Check if we have signatures for this MIME type
		const signatures = FILE_SIGNATURES[expectedMimeType];

		if (!signatures) {
			// For unsupported types, just validate size
			return { valid: true };
		}

		// Check if any signature matches
		for (const sig of signatures) {
			if (matchesMagicBytes(bytes, sig.magic, sig.offset)) {
				return { valid: true, detectedType: expectedMimeType };
			}
		}

		// Try to detect actual file type
		const detected = detectFileType(bytes);

		return {
			valid: false,
			detectedType: detected,
			error: `File content does not match declared type. Expected ${expectedMimeType}${detected ? `, detected ${detected}` : ""}`,
		};
	} catch (error) {
		return {
			valid: false,
			error:
				error instanceof Error
					? error.message
					: "Failed to validate file content",
		};
	}
}

/**
 * Checks if bytes match magic signature at offset
 */
function matchesMagicBytes(
	bytes: Uint8Array,
	magic: number[],
	offset: number,
): boolean {
	if (bytes.length < offset + magic.length) {
		return false;
	}

	for (let i = 0; i < magic.length; i++) {
		if (bytes[offset + i] !== magic[i]) {
			return false;
		}
	}

	return true;
}

/**
 * Attempts to detect file type from magic bytes
 */
function detectFileType(bytes: Uint8Array): string | undefined {
	for (const [mimeType, signatures] of Object.entries(FILE_SIGNATURES)) {
		for (const sig of signatures) {
			if (matchesMagicBytes(bytes, sig.magic, sig.offset)) {
				return mimeType;
			}
		}
	}
	return undefined;
}

/**
 * Validates file name for security issues
 */
export function validateFileName(filename: string): {
	valid: boolean;
	sanitized: string;
	error?: string;
} {
	// Check for path traversal
	if (
		filename.includes("..") ||
		filename.includes("/") ||
		filename.includes("\\")
	) {
		return {
			valid: false,
			sanitized: "",
			error: "Invalid characters in filename",
		};
	}

	// Check for null bytes
	if (filename.includes("\0")) {
		return {
			valid: false,
			sanitized: "",
			error: "Invalid null byte in filename",
		};
	}

	// Sanitize: remove control characters, limit length
	const sanitized = filename
		// biome-ignore lint/suspicious/noControlCharactersInRegex: Intentional sanitization of control characters
		.replace(/[\x00-\x1f\x7f]/g, "")
		.replace(/[<>:"|?*]/g, "_")
		.slice(0, 255);

	if (sanitized.length === 0) {
		return {
			valid: false,
			sanitized: "",
			error: "Filename is empty after sanitization",
		};
	}

	return { valid: true, sanitized };
}

/**
 * Maximum file sizes by type (in bytes)
 */
export const MAX_FILE_SIZES: Record<string, number> = {
	"image/jpeg": 5 * 1024 * 1024, // 5MB
	"image/png": 5 * 1024 * 1024, // 5MB
	"image/gif": 5 * 1024 * 1024, // 5MB
	"image/webp": 5 * 1024 * 1024, // 5MB
	"application/pdf": 10 * 1024 * 1024, // 10MB
	default: 5 * 1024 * 1024, // 5MB default
};

/**
 * Allowed MIME types for upload
 */
export const ALLOWED_MIME_TYPES = [
	"image/jpeg",
	"image/png",
	"image/gif",
	"image/webp",
	"application/pdf",
] as const;

export type AllowedMimeType = (typeof ALLOWED_MIME_TYPES)[number];

export function isAllowedMimeType(
	mimeType: string,
): mimeType is AllowedMimeType {
	return ALLOWED_MIME_TYPES.includes(mimeType as AllowedMimeType);
}
