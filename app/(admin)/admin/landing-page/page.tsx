"use client";

import {
  ArrowRight,
  Check,
  ExternalLink,
  Eye,
  Loader2,
  Mic,
  Palette,
  RefreshCw,
  Save,
  Target,
  TrendingUp,
  Type,
  Zap,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { toast } from "@/components/toast";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import type { LandingPageSection } from "@/lib/supabase/types";

type ContentMap = Record<string, Record<string, string>>;

const ICON_OPTIONS = ["Zap", "Mic", "Target", "TrendingUp"] as const;

const TAILWIND_COLORS = [
  "red-500",
  "red-600",
  "red-700",
  "rose-500",
  "rose-600",
  "pink-500",
  "purple-500",
  "blue-500",
  "emerald-500",
  "stone-900",
  "white",
] as const;

export default function LandingPageCMSPage() {
  const [content, setContent] = useState<ContentMap>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [pendingChanges, setPendingChanges] = useState<
    Map<string, { section: LandingPageSection; key: string; value: string }>
  >(new Map());

  const fetchContent = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/admin/landing-page");
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setContent(data.content);
      setPendingChanges(new Map());
      setHasChanges(false);
    } catch {
      toast({
        type: "error",
        description: "Failed to load landing page content",
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchContent();
  }, [fetchContent]);

  const updateField = (
    section: LandingPageSection,
    key: string,
    value: string,
  ) => {
    setContent((prev) => ({
      ...prev,
      [section]: {
        ...prev[section],
        [key]: value,
      },
    }));
    setPendingChanges((prev) => {
      const newMap = new Map(prev);
      newMap.set(`${section}:${key}`, { section, key, value });
      return newMap;
    });
    setHasChanges(true);
  };

  const saveChanges = async () => {
    if (pendingChanges.size === 0) return;

    setIsSaving(true);
    try {
      const updates = Array.from(pendingChanges.values());
      const res = await fetch("/api/admin/landing-page", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ updates }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to save");
      }

      toast({
        type: "success",
        description: `Saved ${updates.length} changes successfully`,
      });
      setPendingChanges(new Map());
      setHasChanges(false);
    } catch (e) {
      toast({
        type: "error",
        description: e instanceof Error ? e.message : "Failed to save changes",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const getFieldValue = (section: string, key: string) => {
    return content[section]?.[key] || "";
  };

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-rose-500" />
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-neutral-200 bg-white p-4">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">
            Landing Page CMS
          </h1>
          <p className="text-sm text-neutral-500">
            Edit landing page content. Changes apply immediately after saving.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/" target="_blank">
            <Button variant="outline" size="sm" className="gap-2">
              <Eye className="h-4 w-4" />
              Preview Site
              <ExternalLink className="h-3 w-3" />
            </Button>
          </Link>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchContent}
            disabled={isLoading}
            className="gap-2"
          >
            <RefreshCw
              className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`}
            />
            Refresh
          </Button>
          <Button
            size="sm"
            onClick={saveChanges}
            disabled={!hasChanges || isSaving}
            className="gap-2 bg-gradient-to-r from-rose-500 to-red-600 hover:from-rose-600 hover:to-red-700"
          >
            {isSaving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            Save Changes
            {hasChanges && (
              <span className="rounded-full bg-white/20 px-1.5 py-0.5 text-xs">
                {pendingChanges.size}
              </span>
            )}
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        <Tabs defaultValue="hero" className="w-full">
          <TabsList className="mb-6 grid w-full grid-cols-6 lg:w-auto lg:grid-cols-none lg:flex">
            <TabsTrigger value="hero" className="gap-2">
              <Type className="h-4 w-4" />
              Hero
            </TabsTrigger>
            <TabsTrigger value="executives" className="gap-2">
              Executives
            </TabsTrigger>
            <TabsTrigger value="benefits" className="gap-2">
              Benefits
            </TabsTrigger>
            <TabsTrigger value="cta" className="gap-2">
              CTA
            </TabsTrigger>
            <TabsTrigger value="theme" className="gap-2">
              <Palette className="h-4 w-4" />
              Theme
            </TabsTrigger>
            <TabsTrigger value="header-footer" className="gap-2">
              Header/Footer
            </TabsTrigger>
          </TabsList>

          {/* Hero Section */}
          <TabsContent value="hero">
            <div className="grid gap-6 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Hero Content</CardTitle>
                  <CardDescription>
                    Main headline and call-to-action for the landing page
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Main Title</Label>
                    <Input
                      value={getFieldValue("hero", "title_main")}
                      onChange={(e) =>
                        updateField("hero", "title_main", e.target.value)
                      }
                      placeholder="AI Boss Brainz"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Highlighted Title</Label>
                    <Input
                      value={getFieldValue("hero", "title_highlight")}
                      onChange={(e) =>
                        updateField("hero", "title_highlight", e.target.value)
                      }
                      placeholder="Your Sales & Marketing Experts 24/7"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Subtitle</Label>
                    <Textarea
                      value={getFieldValue("hero", "subtitle")}
                      onChange={(e) =>
                        updateField("hero", "subtitle", e.target.value)
                      }
                      rows={3}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Primary CTA Text</Label>
                      <Input
                        value={getFieldValue("hero", "cta_primary_text")}
                        onChange={(e) =>
                          updateField(
                            "hero",
                            "cta_primary_text",
                            e.target.value,
                          )
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Primary CTA Link</Label>
                      <Input
                        value={getFieldValue("hero", "cta_primary_link")}
                        onChange={(e) =>
                          updateField(
                            "hero",
                            "cta_primary_link",
                            e.target.value,
                          )
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Secondary CTA Text</Label>
                      <Input
                        value={getFieldValue("hero", "cta_secondary_text")}
                        onChange={(e) =>
                          updateField(
                            "hero",
                            "cta_secondary_text",
                            e.target.value,
                          )
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Secondary CTA Link</Label>
                      <Input
                        value={getFieldValue("hero", "cta_secondary_link")}
                        onChange={(e) =>
                          updateField(
                            "hero",
                            "cta_secondary_link",
                            e.target.value,
                          )
                        }
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Live Preview */}
              <Card className="bg-stone-50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Eye className="h-4 w-4" />
                    Live Preview
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="rounded-lg border border-stone-200 bg-white p-6">
                    <h1 className="text-2xl font-bold tracking-tight text-stone-900">
                      {getFieldValue("hero", "title_main") || "AI Boss Brainz"}
                      <span className="mt-1 block bg-gradient-to-r from-red-500 to-rose-500 bg-clip-text text-transparent">
                        {getFieldValue("hero", "title_highlight") ||
                          "Your Sales & Marketing Experts 24/7"}
                      </span>
                    </h1>
                    <p className="mt-3 text-sm text-stone-600">
                      {getFieldValue("hero", "subtitle") ||
                        "AI-powered. Expert-led."}
                    </p>
                    <div className="mt-4 flex gap-2">
                      <Button
                        size="sm"
                        className="bg-gradient-to-r from-red-500 to-red-600 gap-1"
                      >
                        {getFieldValue("hero", "cta_primary_text") || "Sign In"}
                        <ArrowRight className="h-3 w-3" />
                      </Button>
                      <Button size="sm" variant="outline">
                        {getFieldValue("hero", "cta_secondary_text") ||
                          "View Pricing"}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Executives Section */}
          <TabsContent value="executives">
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Section Header</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Section Title</Label>
                      <Input
                        value={getFieldValue("executives", "section_title")}
                        onChange={(e) =>
                          updateField(
                            "executives",
                            "section_title",
                            e.target.value,
                          )
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Highlighted Part</Label>
                      <Input
                        value={getFieldValue(
                          "executives",
                          "section_title_highlight",
                        )}
                        onChange={(e) =>
                          updateField(
                            "executives",
                            "section_title_highlight",
                            e.target.value,
                          )
                        }
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Section Subtitle</Label>
                    <Textarea
                      value={getFieldValue("executives", "section_subtitle")}
                      onChange={(e) =>
                        updateField(
                          "executives",
                          "section_subtitle",
                          e.target.value,
                        )
                      }
                      rows={2}
                    />
                  </div>
                </CardContent>
              </Card>

              <div className="grid gap-6 lg:grid-cols-2">
                {/* Alexandria */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Image
                        src={
                          getFieldValue("executives", "alex_image") ||
                          "https://i.ibb.co/39XxGyN1/Chat-GPT-Image-Oct-22-2025-04-39-58-AM.png"
                        }
                        alt="Alexandria"
                        width={32}
                        height={32}
                        className="rounded-full"
                      />
                      Alexandria
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label>Name</Label>
                      <Input
                        value={getFieldValue("executives", "alex_name")}
                        onChange={(e) =>
                          updateField("executives", "alex_name", e.target.value)
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Role</Label>
                      <Input
                        value={getFieldValue("executives", "alex_role")}
                        onChange={(e) =>
                          updateField("executives", "alex_role", e.target.value)
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Image URL</Label>
                      <Input
                        value={getFieldValue("executives", "alex_image")}
                        onChange={(e) =>
                          updateField(
                            "executives",
                            "alex_image",
                            e.target.value,
                          )
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Expertise (comma-separated)</Label>
                      <Input
                        value={getFieldValue("executives", "alex_expertise")}
                        onChange={(e) =>
                          updateField(
                            "executives",
                            "alex_expertise",
                            e.target.value,
                          )
                        }
                        placeholder="Brand Strategy,Go-to-Market,Digital Campaigns"
                      />
                    </div>
                  </CardContent>
                </Card>

                {/* Kim */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Image
                        src={
                          getFieldValue("executives", "kim_image") ||
                          "https://i.ibb.co/m7vk4JF/KIM-3.png"
                        }
                        alt="Kim"
                        width={32}
                        height={32}
                        className="rounded-full"
                      />
                      Kim
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label>Name</Label>
                      <Input
                        value={getFieldValue("executives", "kim_name")}
                        onChange={(e) =>
                          updateField("executives", "kim_name", e.target.value)
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Role</Label>
                      <Input
                        value={getFieldValue("executives", "kim_role")}
                        onChange={(e) =>
                          updateField("executives", "kim_role", e.target.value)
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Image URL</Label>
                      <Input
                        value={getFieldValue("executives", "kim_image")}
                        onChange={(e) =>
                          updateField("executives", "kim_image", e.target.value)
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Expertise (comma-separated)</Label>
                      <Input
                        value={getFieldValue("executives", "kim_expertise")}
                        onChange={(e) =>
                          updateField(
                            "executives",
                            "kim_expertise",
                            e.target.value,
                          )
                        }
                        placeholder="Enterprise Sales,Pipeline Growth,Deal Closing"
                      />
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* Benefits Section */}
          <TabsContent value="benefits">
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Section Header</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Section Title</Label>
                    <Input
                      value={getFieldValue("benefits", "section_title")}
                      onChange={(e) =>
                        updateField("benefits", "section_title", e.target.value)
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Section Subtitle</Label>
                    <Textarea
                      value={getFieldValue("benefits", "section_subtitle")}
                      onChange={(e) =>
                        updateField(
                          "benefits",
                          "section_subtitle",
                          e.target.value,
                        )
                      }
                      rows={2}
                    />
                  </div>
                </CardContent>
              </Card>

              <div className="grid gap-4 md:grid-cols-2">
                {[1, 2, 3, 4].map((num) => (
                  <Card key={num}>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-base">
                        {num === 1 && <Zap className="h-4 w-4 text-rose-500" />}
                        {num === 2 && <Mic className="h-4 w-4 text-rose-500" />}
                        {num === 3 && (
                          <Target className="h-4 w-4 text-rose-500" />
                        )}
                        {num === 4 && (
                          <TrendingUp className="h-4 w-4 text-rose-500" />
                        )}
                        Benefit {num}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <Label>Title</Label>
                        <Input
                          value={getFieldValue(
                            "benefits",
                            `benefit_${num}_title`,
                          )}
                          onChange={(e) =>
                            updateField(
                              "benefits",
                              `benefit_${num}_title`,
                              e.target.value,
                            )
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Description</Label>
                        <Textarea
                          value={getFieldValue(
                            "benefits",
                            `benefit_${num}_desc`,
                          )}
                          onChange={(e) =>
                            updateField(
                              "benefits",
                              `benefit_${num}_desc`,
                              e.target.value,
                            )
                          }
                          rows={2}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Icon</Label>
                        <Select
                          value={
                            getFieldValue("benefits", `benefit_${num}_icon`) ||
                            ICON_OPTIONS[num - 1]
                          }
                          onValueChange={(value) =>
                            updateField(
                              "benefits",
                              `benefit_${num}_icon`,
                              value,
                            )
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {ICON_OPTIONS.map((icon) => (
                              <SelectItem key={icon} value={icon}>
                                <span className="flex items-center gap-2">
                                  {icon === "Zap" && (
                                    <Zap className="h-4 w-4" />
                                  )}
                                  {icon === "Mic" && (
                                    <Mic className="h-4 w-4" />
                                  )}
                                  {icon === "Target" && (
                                    <Target className="h-4 w-4" />
                                  )}
                                  {icon === "TrendingUp" && (
                                    <TrendingUp className="h-4 w-4" />
                                  )}
                                  {icon}
                                </span>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </TabsContent>

          {/* CTA Section */}
          <TabsContent value="cta">
            <div className="grid gap-6 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Call to Action Section</CardTitle>
                  <CardDescription>
                    The final CTA section before footer
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Title</Label>
                    <Input
                      value={getFieldValue("cta", "title")}
                      onChange={(e) =>
                        updateField("cta", "title", e.target.value)
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Subtitle</Label>
                    <Textarea
                      value={getFieldValue("cta", "subtitle")}
                      onChange={(e) =>
                        updateField("cta", "subtitle", e.target.value)
                      }
                      rows={4}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Primary CTA Text</Label>
                      <Input
                        value={getFieldValue("cta", "cta_primary_text")}
                        onChange={(e) =>
                          updateField("cta", "cta_primary_text", e.target.value)
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Primary CTA Link</Label>
                      <Input
                        value={getFieldValue("cta", "cta_primary_link")}
                        onChange={(e) =>
                          updateField("cta", "cta_primary_link", e.target.value)
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Secondary CTA Text</Label>
                      <Input
                        value={getFieldValue("cta", "cta_secondary_text")}
                        onChange={(e) =>
                          updateField(
                            "cta",
                            "cta_secondary_text",
                            e.target.value,
                          )
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Secondary CTA Link</Label>
                      <Input
                        value={getFieldValue("cta", "cta_secondary_link")}
                        onChange={(e) =>
                          updateField(
                            "cta",
                            "cta_secondary_link",
                            e.target.value,
                          )
                        }
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Live Preview */}
              <Card className="bg-stone-900">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-white">
                    <Eye className="h-4 w-4" />
                    Live Preview
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="rounded-lg bg-gradient-to-br from-stone-800 to-stone-900 p-6 text-center">
                    <h2 className="text-xl font-bold text-white">
                      {getFieldValue("cta", "title") || "This Is How You Grow"}
                    </h2>
                    <p className="mt-3 text-sm text-stone-300">
                      {getFieldValue("cta", "subtitle") ||
                        "You don't need to be a sales expert..."}
                    </p>
                    <div className="mt-4 flex justify-center gap-2">
                      <Button
                        size="sm"
                        className="bg-white text-stone-900 hover:bg-stone-100 gap-1"
                      >
                        {getFieldValue("cta", "cta_primary_text") || "Sign In"}
                        <ArrowRight className="h-3 w-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-white/20 text-white hover:bg-white/10"
                      >
                        {getFieldValue("cta", "cta_secondary_text") ||
                          "View Pricing"}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Theme Section */}
          <TabsContent value="theme">
            <Card>
              <CardHeader>
                <CardTitle>Color Theme</CardTitle>
                <CardDescription>
                  Customize the color scheme of the landing page
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-6 md:grid-cols-2">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Primary Gradient Start</Label>
                      <Select
                        value={
                          getFieldValue("theme", "primary_gradient_from") ||
                          "red-500"
                        }
                        onValueChange={(value) =>
                          updateField("theme", "primary_gradient_from", value)
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {TAILWIND_COLORS.map((color) => (
                            <SelectItem key={color} value={color}>
                              <span className="flex items-center gap-2">
                                <span
                                  className={`h-4 w-4 rounded bg-${color}`}
                                  style={{ backgroundColor: colorToHex(color) }}
                                />
                                {color}
                              </span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Primary Gradient End</Label>
                      <Select
                        value={
                          getFieldValue("theme", "primary_gradient_to") ||
                          "red-600"
                        }
                        onValueChange={(value) =>
                          updateField("theme", "primary_gradient_to", value)
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {TAILWIND_COLORS.map((color) => (
                            <SelectItem key={color} value={color}>
                              <span className="flex items-center gap-2">
                                <span
                                  className={`h-4 w-4 rounded`}
                                  style={{ backgroundColor: colorToHex(color) }}
                                />
                                {color}
                              </span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Accent Color</Label>
                      <Select
                        value={
                          getFieldValue("theme", "accent_color") || "rose-500"
                        }
                        onValueChange={(value) =>
                          updateField("theme", "accent_color", value)
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {TAILWIND_COLORS.map((color) => (
                            <SelectItem key={color} value={color}>
                              <span className="flex items-center gap-2">
                                <span
                                  className={`h-4 w-4 rounded`}
                                  style={{ backgroundColor: colorToHex(color) }}
                                />
                                {color}
                              </span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <Label>Preview</Label>
                    <div className="rounded-lg border border-stone-200 bg-white p-6">
                      <div
                        className="h-12 w-full rounded-lg"
                        style={{
                          background: `linear-gradient(to right, ${colorToHex(getFieldValue("theme", "primary_gradient_from") || "red-500")}, ${colorToHex(getFieldValue("theme", "primary_gradient_to") || "red-600")})`,
                        }}
                      />
                      <div className="mt-4 flex gap-2">
                        <Button
                          size="sm"
                          style={{
                            background: `linear-gradient(to right, ${colorToHex(getFieldValue("theme", "primary_gradient_from") || "red-500")}, ${colorToHex(getFieldValue("theme", "primary_gradient_to") || "red-600")})`,
                          }}
                        >
                          Primary Button
                        </Button>
                        <Button size="sm" variant="outline">
                          Secondary Button
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Header/Footer Section */}
          <TabsContent value="header-footer">
            <div className="grid gap-6 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Header</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Logo URL</Label>
                    <Input
                      value={getFieldValue("header", "logo_url")}
                      onChange={(e) =>
                        updateField("header", "logo_url", e.target.value)
                      }
                    />
                  </div>
                  {getFieldValue("header", "logo_url") && (
                    <div className="rounded-lg border border-stone-200 bg-stone-50 p-4">
                      <Image
                        src={getFieldValue("header", "logo_url")}
                        alt="Logo preview"
                        width={160}
                        height={40}
                        className="h-10 w-auto"
                      />
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Footer</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Tagline</Label>
                    <Textarea
                      value={getFieldValue("footer", "tagline")}
                      onChange={(e) =>
                        updateField("footer", "tagline", e.target.value)
                      }
                      rows={2}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Contact Email</Label>
                    <Input
                      type="email"
                      value={getFieldValue("footer", "email")}
                      onChange={(e) =>
                        updateField("footer", "email", e.target.value)
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Copyright Text</Label>
                    <Input
                      value={getFieldValue("footer", "copyright")}
                      onChange={(e) =>
                        updateField("footer", "copyright", e.target.value)
                      }
                    />
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Floating Save Button */}
      {hasChanges && (
        <div className="fixed bottom-6 right-6 z-50">
          <Button
            size="lg"
            onClick={saveChanges}
            disabled={isSaving}
            className="gap-2 bg-gradient-to-r from-rose-500 to-red-600 shadow-lg hover:from-rose-600 hover:to-red-700"
          >
            {isSaving ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Check className="h-5 w-5" />
            )}
            Save {pendingChanges.size} Changes
          </Button>
        </div>
      )}
    </div>
  );
}

// Helper function to convert Tailwind color classes to hex
function colorToHex(color: string): string {
  const colorMap: Record<string, string> = {
    "red-500": "#ef4444",
    "red-600": "#dc2626",
    "red-700": "#b91c1c",
    "rose-500": "#f43f5e",
    "rose-600": "#e11d48",
    "pink-500": "#ec4899",
    "purple-500": "#a855f7",
    "blue-500": "#3b82f6",
    "emerald-500": "#10b981",
    "stone-900": "#1c1917",
    white: "#ffffff",
  };
  return colorMap[color] || "#ef4444";
}
