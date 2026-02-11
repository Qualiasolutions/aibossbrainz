/**
 * Topic classifier for chat conversations
 * Uses simple keyword matching for fast, cost-effective classification
 */

export type TopicCategory = {
  name: string;
  color: string;
  keywords: string[];
};

// Predefined topics with colors and keywords
export const TOPIC_CATEGORIES: TopicCategory[] = [
  {
    name: "Marketing",
    color: "bg-purple-500",
    keywords: [
      "marketing",
      "brand",
      "campaign",
      "social media",
      "content",
      "seo",
      "advertising",
      "promotion",
      "audience",
      "engagement",
    ],
  },
  {
    name: "Sales",
    color: "bg-green-500",
    keywords: [
      "sales",
      "revenue",
      "pipeline",
      "deal",
      "close",
      "prospect",
      "lead",
      "customer",
      "quota",
      "commission",
    ],
  },
  {
    name: "Strategy",
    color: "bg-blue-500",
    keywords: [
      "strategy",
      "plan",
      "goal",
      "objective",
      "vision",
      "mission",
      "roadmap",
      "initiative",
      "growth",
    ],
  },
  {
    name: "Analytics",
    color: "bg-orange-500",
    keywords: [
      "analytics",
      "metrics",
      "data",
      "report",
      "kpi",
      "dashboard",
      "performance",
      "tracking",
      "measurement",
    ],
  },
  {
    name: "Product",
    color: "bg-pink-500",
    keywords: [
      "product",
      "feature",
      "launch",
      "release",
      "development",
      "roadmap",
      "pricing",
      "market fit",
    ],
  },
  {
    name: "Customer",
    color: "bg-teal-500",
    keywords: [
      "customer",
      "client",
      "support",
      "feedback",
      "satisfaction",
      "retention",
      "churn",
      "loyalty",
    ],
  },
  {
    name: "Team",
    color: "bg-yellow-500",
    keywords: [
      "team",
      "hire",
      "recruit",
      "training",
      "culture",
      "management",
      "leadership",
      "organization",
    ],
  },
  {
    name: "Finance",
    color: "bg-emerald-500",
    keywords: [
      "budget",
      "cost",
      "expense",
      "roi",
      "revenue",
      "profit",
      "funding",
      "investment",
    ],
  },
];

/**
 * Classify a chat based on its title and first message
 */
export function classifyTopic(
  title: string,
  firstMessage?: string,
): { topic: string; color: string } | null {
  const textToAnalyze = `${title} ${firstMessage || ""}`.toLowerCase();

  let bestMatch: TopicCategory | null = null;
  let highestScore = 0;

  for (const category of TOPIC_CATEGORIES) {
    let score = 0;
    for (const keyword of category.keywords) {
      if (textToAnalyze.includes(keyword)) {
        score += 1;
      }
    }

    if (score > highestScore) {
      highestScore = score;
      bestMatch = category;
    }
  }

  // Only return a topic if we found at least one keyword match
  if (bestMatch && highestScore > 0) {
    return {
      topic: bestMatch.name,
      color: bestMatch.color,
    };
  }

  return null;
}

/**
 * Get all available topic categories for display
 */
export function getTopicCategories(): { name: string; color: string }[] {
  return TOPIC_CATEGORIES.map((cat) => ({ name: cat.name, color: cat.color }));
}
