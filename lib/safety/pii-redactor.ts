import "server-only";

export interface RedactionResult {
	text: string;
	redactedCount: number;
	redactedTypes: string[];
}

// PII detection patterns - applied in order: credit card, SSN, email, phone
// Credit card first because its digit patterns overlap with phone numbers

const CREDIT_CARD_REGEX = /\b(?:\d[ -]*?){13,19}\b/g;
const SSN_REGEX =
	/\b(?!000|666|9\d\d)\d{3}[- ]?(?!00)\d{2}[- ]?(?!0000)\d{4}\b/g;
const EMAIL_REGEX = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
const PHONE_REGEX =
	/(?:\+?1[-.\s]?)?\(?[2-9]\d{2}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g;

/**
 * Validates a credit card number using the Luhn algorithm.
 * Returns true if the digit sequence is a valid credit card number.
 */
function isValidCreditCard(digits: string): boolean {
	if (digits.length < 13 || digits.length > 19) return false;

	let sum = 0;
	let isEven = false;

	for (let i = digits.length - 1; i >= 0; i--) {
		let digit = Number.parseInt(digits[i], 10);

		if (isEven) {
			digit *= 2;
			if (digit > 9) {
				digit -= 9;
			}
		}

		sum += digit;
		isEven = !isEven;
	}

	return sum % 10 === 0;
}

/**
 * Checks if a matched string has card-like formatting (contains dashes or spaces between digit groups).
 */
function hasCardFormat(match: string): boolean {
	// Card format: groups of digits separated by dashes or spaces (e.g., 4111-1111-1111-1111)
	return /\d[ -]+\d/.test(match);
}

/**
 * Redacts PII from text. Detects credit cards (with Luhn validation),
 * SSNs, email addresses, and phone numbers.
 *
 * Returns the redacted text along with count and types of redactions.
 * NEVER log the original PII content -- only counts and types.
 */
export function redactPII(text: string): RedactionResult {
	if (!text) {
		return { text, redactedCount: 0, redactedTypes: [] };
	}

	let result = text;
	let redactedCount = 0;
	const redactedTypes: Set<string> = new Set();

	// 1. Credit cards first (overlaps with phone numbers)
	result = result.replace(CREDIT_CARD_REGEX, (match) => {
		const digits = match.replace(/[^0-9]/g, "");

		// Only redact if Luhn check passes OR the match has explicit card formatting
		if (isValidCreditCard(digits) || hasCardFormat(match)) {
			redactedCount++;
			redactedTypes.add("credit_card");
			return "[REDACTED]";
		}

		return match;
	});

	// 2. SSNs
	result = result.replace(SSN_REGEX, () => {
		redactedCount++;
		redactedTypes.add("ssn");
		return "[REDACTED]";
	});

	// 3. Emails
	result = result.replace(EMAIL_REGEX, () => {
		redactedCount++;
		redactedTypes.add("email");
		return "[REDACTED]";
	});

	// 4. Phone numbers
	result = result.replace(PHONE_REGEX, () => {
		redactedCount++;
		redactedTypes.add("phone");
		return "[REDACTED]";
	});

	return {
		text: result,
		redactedCount,
		redactedTypes: [...redactedTypes],
	};
}
