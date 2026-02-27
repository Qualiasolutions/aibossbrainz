import { tool } from "ai";
import { z } from "zod";

async function geocodeCity(
	city: string,
): Promise<{ latitude: number; longitude: number } | null> {
	const controller = new AbortController();
	const timeoutId = setTimeout(() => controller.abort(), 5_000);

	try {
		const response = await fetch(
			`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=en&format=json`,
			{ signal: controller.signal },
		);
		clearTimeout(timeoutId);

		if (!response.ok) return null;

		const data = await response.json();

		if (!data.results || data.results.length === 0) {
			return null;
		}

		const result = data.results[0];
		return {
			latitude: result.latitude,
			longitude: result.longitude,
		};
	} catch {
		clearTimeout(timeoutId);
		return null;
	}
}

export const getWeather = tool({
	description:
		"Get the current weather at a location. Provide either a city name OR latitude/longitude coordinates.",
	inputSchema: z.object({
		city: z
			.string()
			.optional()
			.describe(
				"City name (e.g., 'San Francisco', 'New York', 'London'). Use this OR latitude/longitude.",
			),
		latitude: z
			.number()
			.optional()
			.describe(
				"Latitude coordinate. Must be provided together with longitude.",
			),
		longitude: z
			.number()
			.optional()
			.describe(
				"Longitude coordinate. Must be provided together with latitude.",
			),
	}),
	execute: async (input) => {
		let latitude: number;
		let longitude: number;

		if (input.city) {
			const coords = await geocodeCity(input.city);
			if (!coords) {
				return {
					error: `Could not find coordinates for "${input.city}". Please check the city name.`,
				};
			}
			latitude = coords.latitude;
			longitude = coords.longitude;
		} else if (input.latitude !== undefined && input.longitude !== undefined) {
			latitude = input.latitude;
			longitude = input.longitude;
		} else {
			return {
				error:
					"Please provide either a city name or both latitude and longitude coordinates.",
			};
		}

		const controller = new AbortController();
		const timeoutId = setTimeout(() => controller.abort(), 10_000);

		try {
			const response = await fetch(
				`https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m&hourly=temperature_2m&daily=sunrise,sunset&timezone=auto`,
				{ signal: controller.signal },
			);
			clearTimeout(timeoutId);

			if (!response.ok) {
				return {
					error:
						"The weather service is temporarily unavailable. Please try again in a moment.",
				};
			}

			const weatherData = await response.json();

			if (
				!weatherData.current ||
				typeof weatherData.current.temperature_2m !== "number"
			) {
				return {
					error:
						"Received unexpected data from the weather service. Please try again.",
				};
			}

			// MED-10: Trim response to reduce AI context bloat
			// Keep only first 24 hourly entries (today) instead of all 168
			if (weatherData.hourly?.time) {
				weatherData.hourly.time = weatherData.hourly.time.slice(0, 24);
				weatherData.hourly.temperature_2m =
					weatherData.hourly.temperature_2m.slice(0, 24);
			}
			// Keep only first 2 days of daily data
			if (weatherData.daily?.time) {
				weatherData.daily.time = weatherData.daily.time.slice(0, 2);
				weatherData.daily.sunrise = weatherData.daily.sunrise.slice(0, 2);
				weatherData.daily.sunset = weatherData.daily.sunset.slice(0, 2);
			}

			if (input.city) {
				weatherData.cityName = input.city;
			}

			return weatherData;
		} catch (error) {
			clearTimeout(timeoutId);

			if (error instanceof DOMException && error.name === "AbortError") {
				return {
					error:
						"The weather request timed out. The service may be slow right now.",
				};
			}

			return {
				error:
					"I couldn't fetch the weather right now. Please try again later.",
			};
		}
	},
});
