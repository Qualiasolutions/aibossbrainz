"use client";

import {
  AlertCircle,
  BarChart3,
  Brain,
  ChevronDown,
  ChevronUp,
  Lightbulb,
  MessageSquare,
  Target,
  TrendingUp,
} from "lucide-react";
import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Progress } from "@/components/ui/progress";
import { BOT_PERSONALITIES, type BotType } from "@/lib/bot-personalities";
import type { ChatMessage } from "@/lib/types";
import { cn } from "@/lib/utils";

interface ConversationAnalyticsProps {
  messages: ChatMessage[];
  currentBot: BotType;
  className?: string;
  compact?: boolean;
}

interface TopicAnalysis {
  topics: string[];
  topicDrift: number;
  primaryTopic: string | null;
}

interface ExecutiveRecommendation {
  executive: BotType;
  reason: string;
  confidence: number;
}

// Simple keyword extraction for topic analysis
function extractTopics(text: string): string[] {
  const businessKeywords = [
    "brand",
    "branding",
    "marketing",
    "campaign",
    "content",
    "creative",
    "design",
    "story",
    "narrative",
    "audience",
    "engagement",
    "social",
    "media",
    "sales",
    "revenue",
    "growth",
    "pipeline",
    "leads",
    "conversion",
    "metrics",
    "analytics",
    "data",
    "strategy",
    "roi",
    "budget",
    "forecast",
    "pricing",
    "product",
    "launch",
    "market",
    "competitor",
    "positioning",
    "value",
    "proposition",
    "customer",
    "client",
    "retention",
    "acquisition",
  ];

  const lowerText = text.toLowerCase();
  return businessKeywords.filter((keyword) => lowerText.includes(keyword));
}

// Analyze conversation topics and drift
function analyzeTopics(messages: ChatMessage[]): TopicAnalysis {
  const userMessages = messages.filter((m) => m.role === "user");
  if (userMessages.length === 0) {
    return { topics: [], topicDrift: 0, primaryTopic: null };
  }

  const allTopics: string[] = [];
  const topicsByMessage: string[][] = [];

  for (const msg of userMessages) {
    const text = msg.parts
      ?.filter((p) => p.type === "text")
      .map((p) => p.text)
      .join(" ");
    if (text) {
      const topics = extractTopics(text);
      allTopics.push(...topics);
      topicsByMessage.push(topics);
    }
  }

  // Count topic frequency
  const topicCounts = allTopics.reduce(
    (acc, topic) => {
      acc[topic] = (acc[topic] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );

  // Get top topics
  const sortedTopics = Object.entries(topicCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([topic]) => topic);

  // Calculate topic drift (how much topics change between messages)
  let driftScore = 0;
  if (topicsByMessage.length > 1) {
    for (let i = 1; i < topicsByMessage.length; i++) {
      const prev = new Set(topicsByMessage[i - 1]);
      const curr = topicsByMessage[i];
      const overlap = curr.filter((t) => prev.has(t)).length;
      const total = new Set([...topicsByMessage[i - 1], ...curr]).size;
      if (total > 0) {
        driftScore += 1 - overlap / total;
      }
    }
    driftScore = driftScore / (topicsByMessage.length - 1);
  }

  return {
    topics: sortedTopics,
    topicDrift: Math.round(driftScore * 100),
    primaryTopic: sortedTopics[0] || null,
  };
}

// Get executive recommendation based on topics
function getExecutiveRecommendation(
  topics: string[],
  currentBot: BotType,
): ExecutiveRecommendation | null {
  const alexandriaTopics = [
    "brand",
    "branding",
    "creative",
    "content",
    "design",
    "story",
    "narrative",
    "engagement",
    "social",
    "media",
    "campaign",
  ];
  const kimTopics = [
    "sales",
    "revenue",
    "pipeline",
    "leads",
    "conversion",
    "metrics",
    "analytics",
    "data",
    "roi",
    "budget",
    "forecast",
    "pricing",
  ];

  const alexandriaScore = topics.filter((t) =>
    alexandriaTopics.includes(t),
  ).length;
  const kimScore = topics.filter((t) => kimTopics.includes(t)).length;

  if (alexandriaScore === 0 && kimScore === 0) return null;

  if (alexandriaScore > kimScore && currentBot !== "alexandria") {
    return {
      executive: "alexandria",
      reason: "This conversation involves brand and creative topics",
      confidence: Math.min(90, 50 + alexandriaScore * 10),
    };
  }

  if (kimScore > alexandriaScore && currentBot !== "kim") {
    return {
      executive: "kim",
      reason: "This conversation involves sales and revenue topics",
      confidence: Math.min(90, 50 + kimScore * 10),
    };
  }

  if (alexandriaScore > 0 && kimScore > 0 && currentBot !== "collaborative") {
    return {
      executive: "collaborative",
      reason: "This conversation spans both creative and sales domains",
      confidence: Math.min(90, 60 + (alexandriaScore + kimScore) * 5),
    };
  }

  return null;
}

export function ConversationAnalytics({
  messages,
  currentBot,
  className,
  compact = false,
}: ConversationAnalyticsProps) {
  const [isOpen, setIsOpen] = useState(false);

  const analysis = useMemo(() => {
    const topicAnalysis = analyzeTopics(messages);
    const recommendation = getExecutiveRecommendation(
      topicAnalysis.topics,
      currentBot,
    );

    const userMessageCount = messages.filter((m) => m.role === "user").length;
    const assistantMessageCount = messages.filter(
      (m) => m.role === "assistant",
    ).length;

    // Calculate conversation depth (average message length)
    const avgLength =
      messages.reduce((acc, m) => {
        const text = m.parts
          ?.filter((p) => p.type === "text")
          .map((p) => p.text)
          .join("").length;
        return acc + (text || 0);
      }, 0) / (messages.length || 1);

    const depthScore = Math.min(100, Math.round((avgLength / 500) * 100));

    // Executive breakdown - access botType from metadata
    const executiveBreakdown = messages
      .filter((m) => m.role === "assistant" && (m as any).metadata?.botType)
      .reduce(
        (acc, m) => {
          const bot = (m as any).metadata?.botType as BotType;
          acc[bot] = (acc[bot] || 0) + 1;
          return acc;
        },
        {} as Record<BotType, number>,
      );

    return {
      ...topicAnalysis,
      recommendation,
      userMessageCount,
      assistantMessageCount,
      depthScore,
      executiveBreakdown,
    };
  }, [messages, currentBot]);

  if (messages.length < 2) return null;

  const hasInsights =
    analysis.topics.length > 0 ||
    analysis.recommendation ||
    analysis.topicDrift > 50;

  // Compact mode for header - just show stats inline
  if (compact) {
    return (
      <div
        className={cn(
          "flex items-center gap-2 text-xs text-muted-foreground",
          className,
        )}
      >
        <div className="flex items-center gap-1">
          <MessageSquare className="h-3 w-3" />
          <span>
            {analysis.userMessageCount + analysis.assistantMessageCount}
          </span>
        </div>
        {analysis.topics.length > 0 && (
          <div className="flex items-center gap-1">
            <Target className="h-3 w-3" />
            <span>{analysis.topics.length} topics</span>
          </div>
        )}
        {analysis.topicDrift > 50 && (
          <Badge variant="destructive" className="h-5 text-[10px] px-1.5">
            Drift {analysis.topicDrift}%
          </Badge>
        )}
      </div>
    );
  }

  return (
    <Collapsible
      open={isOpen}
      onOpenChange={setIsOpen}
      className={cn("rounded-lg border bg-card", className)}
    >
      <CollapsibleTrigger className="flex w-full items-center justify-between p-3 hover:bg-muted/50 transition-colors">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Conversation Analytics</span>
          {hasInsights && (
            <Badge variant="secondary" className="ml-2">
              {analysis.topics.length} topics detected
            </Badge>
          )}
        </div>
        {isOpen ? (
          <ChevronUp className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        )}
      </CollapsibleTrigger>

      <CollapsibleContent className="px-3 pb-3">
        <div className="space-y-4 pt-2">
          {/* Executive Breakdown */}
          {Object.keys(analysis.executiveBreakdown).length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Executive Distribution
              </h4>
              <div className="space-y-2">
                {Object.entries(analysis.executiveBreakdown).map(
                  ([bot, count]) => {
                    const personality = BOT_PERSONALITIES[bot as BotType];
                    const total = analysis.assistantMessageCount;
                    const percentage = Math.round((count / total) * 100);

                    // Derive text color from bot type
                    const textColor =
                      bot === "alexandria"
                        ? "text-rose-500"
                        : bot === "kim"
                          ? "text-blue-500"
                          : "text-purple-500";

                    return (
                      <div key={bot} className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span className={textColor}>
                            {personality.name.split(" ")[0]}
                          </span>
                          <span className="text-muted-foreground">
                            {percentage}%
                          </span>
                        </div>
                        <Progress value={percentage} className="h-1.5" />
                      </div>
                    );
                  },
                )}
              </div>
            </div>
          )}

          {/* Topics */}
          {analysis.topics.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium flex items-center gap-2">
                <Lightbulb className="h-4 w-4" />
                Detected Topics
              </h4>
              <div className="flex flex-wrap gap-1">
                {analysis.topics.map((topic) => (
                  <Badge key={topic} variant="outline" className="capitalize">
                    {topic}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Topic Drift Warning */}
          {analysis.topicDrift > 50 && (
            <div className="flex items-start gap-2 p-2 rounded-md bg-red-500/10 border border-red-500/20">
              <AlertCircle className="h-4 w-4 text-red-500 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-red-600 dark:text-red-500">
                  High Topic Drift Detected
                </p>
                <p className="text-xs text-muted-foreground">
                  The conversation has shifted between {analysis.topicDrift}%
                  different topics. Consider focusing on your primary objective.
                </p>
              </div>
            </div>
          )}

          {/* Executive Recommendation */}
          {analysis.recommendation && (
            <div
              className={cn(
                "flex items-start gap-2 p-2 rounded-md border",
                analysis.recommendation.executive === "alexandria" &&
                  "bg-rose-500/10 border-rose-500/20",
                analysis.recommendation.executive === "kim" &&
                  "bg-blue-500/10 border-blue-500/20",
                analysis.recommendation.executive === "collaborative" &&
                  "bg-purple-500/10 border-purple-500/20",
              )}
            >
              <Brain
                className={cn(
                  "h-4 w-4 mt-0.5",
                  analysis.recommendation.executive === "alexandria" &&
                    "text-rose-500",
                  analysis.recommendation.executive === "kim" &&
                    "text-blue-500",
                  analysis.recommendation.executive === "collaborative" &&
                    "text-purple-500",
                )}
              />
              <div>
                <p className="text-sm font-medium">
                  Consider switching to{" "}
                  {BOT_PERSONALITIES[analysis.recommendation.executive].name}
                </p>
                <p className="text-xs text-muted-foreground">
                  {analysis.recommendation.reason} (
                  {analysis.recommendation.confidence}% confidence)
                </p>
              </div>
            </div>
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
