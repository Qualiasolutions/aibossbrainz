import { format } from "date-fns";
import {
  Calendar,
  Download,
  Eye,
  FileCode,
  FileImage,
  FileSpreadsheet,
  FileText,
} from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getDocumentsByUserId } from "@/lib/db/queries";
import { createClient } from "@/lib/supabase/server";

type DocumentKind = "text" | "code" | "image" | "sheet";

const getDocumentIcon = (kind: DocumentKind) => {
  switch (kind) {
    case "text":
      return <FileText className="h-5 w-5 text-rose-500" />;
    case "code":
      return <FileCode className="h-5 w-5 text-blue-500" />;
    case "image":
      return <FileImage className="h-5 w-5 text-purple-500" />;
    case "sheet":
      return <FileSpreadsheet className="h-5 w-5 text-green-500" />;
    default:
      return <FileText className="h-5 w-5 text-slate-400" />;
  }
};

const getKindBadge = (kind: DocumentKind) => {
  const styles: Record<DocumentKind, string> = {
    text: "bg-rose-100 text-rose-700",
    code: "bg-blue-100 text-blue-700",
    image: "bg-purple-100 text-purple-700",
    sheet: "bg-green-100 text-green-700",
  };

  const labels: Record<DocumentKind, string> = {
    text: "Document",
    code: "Code",
    image: "Image",
    sheet: "Spreadsheet",
  };

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-1 font-semibold text-[10px] uppercase ${styles[kind] || "bg-slate-100 text-slate-600"}`}
    >
      {labels[kind] || "Unknown"}
    </span>
  );
};

export default async function ReportsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Get all documents/artifacts for the user
  const documents = await getDocumentsByUserId({ userId: user.id });

  // Group documents by kind
  const documentsByKind = documents.reduce(
    (acc, doc) => {
      const kind = (doc.kind || "text") as DocumentKind;
      acc[kind] = (acc[kind] || 0) + 1;
      return acc;
    },
    {} as Record<DocumentKind, number>,
  );

  const totalDocuments = documents.length;
  const textCount = documentsByKind.text || 0;
  const codeCount = documentsByKind.code || 0;
  const sheetCount = documentsByKind.sheet || 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50 via-white to-indigo-50 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800">
      {/* Header */}
      <header className="border-white/20 border-b bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl">
        <div className="container mx-auto px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="font-bold text-2xl text-slate-900 dark:text-white sm:text-3xl">
                Reports Library
              </h1>
              <p className="mt-1 text-slate-600 dark:text-slate-400 text-sm">
                View and manage your AI-generated documents and artifacts
              </p>
            </div>
            <Link href="/new">
              <Button className="w-full sm:w-auto" variant="outline">
                Back to Chat
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Stats Section */}
      <section className="border-white/20 border-b bg-white/40 dark:bg-slate-800/40 py-6 sm:py-8">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card className="border-0 bg-gradient-to-br from-white to-rose-50/50 dark:from-slate-800 dark:to-rose-900/20 shadow-md">
              <CardContent className="p-4 sm:p-6">
                <div className="flex items-center gap-3">
                  <div className="flex size-10 items-center justify-center rounded-full bg-rose-100 dark:bg-rose-900/50 sm:size-12">
                    <FileText className="h-5 w-5 text-rose-600 dark:text-rose-400 sm:h-6 sm:w-6" />
                  </div>
                  <div>
                    <p className="text-slate-600 dark:text-slate-400 text-xs sm:text-sm">
                      Total Reports
                    </p>
                    <p className="font-bold text-slate-900 dark:text-white text-xl sm:text-2xl">
                      {totalDocuments}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 bg-gradient-to-br from-white to-blue-50/50 dark:from-slate-800 dark:to-blue-900/20 shadow-md">
              <CardContent className="p-4 sm:p-6">
                <div className="flex items-center gap-3">
                  <div className="flex size-10 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/50 sm:size-12">
                    <FileCode className="h-5 w-5 text-blue-600 dark:text-blue-400 sm:h-6 sm:w-6" />
                  </div>
                  <div>
                    <p className="text-slate-600 dark:text-slate-400 text-xs sm:text-sm">
                      Code Snippets
                    </p>
                    <p className="font-bold text-slate-900 dark:text-white text-xl sm:text-2xl">
                      {codeCount}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 bg-gradient-to-br from-white to-red-50/50 dark:from-slate-800 dark:to-neutral-900/20 shadow-md">
              <CardContent className="p-4 sm:p-6">
                <div className="flex items-center gap-3">
                  <div className="flex size-10 items-center justify-center rounded-full bg-red-100 dark:bg-neutral-900/50 sm:size-12">
                    <FileText className="h-5 w-5 text-red-600 dark:text-red-500 sm:h-6 sm:w-6" />
                  </div>
                  <div>
                    <p className="text-slate-600 dark:text-slate-400 text-xs sm:text-sm">
                      Text Documents
                    </p>
                    <p className="font-bold text-slate-900 dark:text-white text-xl sm:text-2xl">
                      {textCount}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 bg-gradient-to-br from-white to-green-50/50 dark:from-slate-800 dark:to-green-900/20 shadow-md">
              <CardContent className="p-4 sm:p-6">
                <div className="flex items-center gap-3">
                  <div className="flex size-10 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/50 sm:size-12">
                    <FileSpreadsheet className="h-5 w-5 text-green-600 dark:text-green-400 sm:h-6 sm:w-6" />
                  </div>
                  <div>
                    <p className="text-slate-600 dark:text-slate-400 text-xs sm:text-sm">
                      Spreadsheets
                    </p>
                    <p className="font-bold text-slate-900 dark:text-white text-xl sm:text-2xl">
                      {sheetCount}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Documents List */}
      <section className="py-8 sm:py-12">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          {documents.length === 0 ? (
            <Card className="border-0 bg-white/80 dark:bg-slate-800/80 shadow-xl">
              <CardContent className="p-8 text-center sm:p-12">
                <FileText className="mx-auto h-12 w-12 text-slate-300 dark:text-slate-600 sm:h-16 sm:w-16" />
                <h3 className="mt-4 font-semibold text-lg text-slate-900 dark:text-white sm:text-xl">
                  No reports yet
                </h3>
                <p className="mt-2 text-slate-600 dark:text-slate-400 text-sm sm:text-base">
                  Start a conversation with our executive consultants to
                  generate reports and documents
                </p>
                <Link href="/new">
                  <Button className="mt-6">Start New Conversation</Button>
                </Link>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 sm:gap-6 md:grid-cols-2 lg:grid-cols-3">
              {documents.map((doc) => (
                <Card
                  key={`${doc.id}-${doc.createdAt}`}
                  className="group hover:-translate-y-1 border-0 bg-white/80 dark:bg-slate-800/80 shadow-md transition-all duration-200 hover:shadow-xl"
                >
                  <CardContent className="p-4 sm:p-6">
                    <div className="flex items-start gap-3">
                      <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-rose-100 to-purple-100 dark:from-rose-900/50 dark:to-purple-900/50">
                        {getDocumentIcon((doc.kind || "text") as DocumentKind)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="truncate font-semibold text-base text-slate-900 dark:text-white group-hover:text-rose-600 dark:group-hover:text-rose-400">
                          {doc.title}
                        </h3>
                        <div className="mt-1 flex items-center gap-2 text-slate-500 dark:text-slate-400 text-xs">
                          <Calendar className="h-3 w-3" />
                          {format(new Date(doc.createdAt), "MMM d, yyyy")}
                          <span>•</span>
                          {format(new Date(doc.createdAt), "h:mm a")}
                        </div>
                      </div>
                    </div>

                    {doc.content && (
                      <p className="mt-3 text-slate-600 dark:text-slate-400 text-sm line-clamp-2">
                        {doc.content.slice(0, 150)}
                        {doc.content.length > 150 ? "..." : ""}
                      </p>
                    )}

                    <div className="mt-4 flex items-center justify-between">
                      {getKindBadge((doc.kind || "text") as DocumentKind)}
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                          title="View Document"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                          title="Download"
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
