export const isProductionEnvironment = process.env.NODE_ENV === "production";
export const isDevelopmentEnvironment = process.env.NODE_ENV === "development";
export const isTestEnvironment =
  process.env.PLAYWRIGHT_TEST_BASE_URL === "true" ||
  process.env.PLAYWRIGHT === "True" ||
  process.env.PLAYWRIGHT === "true" ||
  process.env.CI_PLAYWRIGHT === "true";

export const guestRegex = /^guest-\d+$/;
