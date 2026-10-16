"use client";

import { ArrowRight, CircleCheck, FileText, LoaderCircle, Upload, X } from "lucide-react";
import { useRef, useState } from "react";
import { cx, ErrorBanner, primaryButton, secondaryButton, Section } from "./ui";

interface Props {
  files: File[];
  onFilesChange: (files: File[]) => void;
  demoMode: boolean;
  status: "idle" | "loading" | "done";
  error: { message: string; detail?: string } | null;
  onAnalyze: () => void;
  demoFileNames: string[];
}

export function UploadSection({ files, onFilesChange, demoMode, status, error, onAnalyze, demoFileNames }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [rejected, setRejected] = useState<string[]>([]);
  const locked = status !== "idle";

  function addFiles(list: FileList | null) {
    if (!list) return;
    const incoming = Array.from(list);
    const pdfs = incoming.filter((f) => f.type === "application/pdf" || f.name.toLowerCase().endsWith(".pdf"));
    setRejected(incoming.filter((f) => !pdfs.includes(f)).map((f) => f.name));
    const known = new Set(files.map((f) => f.name + f.size));
    onFilesChange([...files, ...pdfs.filter((f) => !known.has(f.name + f.size))]);
  }

  // In demo mode, sample file names stand in when nothing was chosen.
  const shownNames = files.length ? files.map((f) => f.name) : demoMode ? demoFileNames : [];
  const usingSampleFiles = demoMode && files.length === 0;
  const canAnalyze = !locked && (files.length > 0 || demoMode);

  return (
    <Section
      step={1}
      icon={Upload}
      title="Upload Documents"
      subtitle="Drop in your course syllabus and lecture notes as PDFs."
      aside={
        status === "done" ? (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700 ring-1 ring-emerald-200">
            <CircleCheck className="size-3.5" />
            {shownNames.length} document{shownNames.length === 1 ? "" : "s"} processed
          </span>
        ) : null
      }
    >
      {!locked && (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            addFiles(e.dataTransfer.files);
          }}
          onClick={() => inputRef.current?.click()}
          onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && inputRef.current?.click()}
          role="button"
          tabIndex={0}
          className={cx(
            "group flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 py-10 text-center transition",
            dragging
              ? "border-indigo-400 bg-indigo-50/70"
              : "border-zinc-200 bg-zinc-50/50 hover:border-indigo-300 hover:bg-indigo-50/40",
          )}
        >
          <div className="mb-3 flex size-12 items-center justify-center rounded-2xl bg-white text-indigo-500 shadow-sm ring-1 ring-zinc-200 transition group-hover:scale-105 group-hover:text-violet-600">
            <Upload className="size-5" />
          </div>
          <p className="text-sm font-medium text-zinc-800">
            Drag PDFs here or <span className="text-indigo-600 underline-offset-2 group-hover:underline">browse</span>
          </p>
          <p className="mt-1 text-xs text-zinc-500">Syllabus, lecture notes, assignment sheets · multiple files supported</p>
          <input
            ref={inputRef}
            type="file"
            accept="application/pdf,.pdf"
            multiple
            hidden
            onChange={(e) => {
              addFiles(e.target.files);
              e.target.value = "";
            }}
          />
        </div>
      )}

      {rejected.length > 0 && !locked && (
        <p className="mt-2 text-xs text-amber-700">Skipped non-PDF files: {rejected.join(", ")}</p>
      )}

      {shownNames.length > 0 && (
        <ul className={cx("grid gap-2 sm:grid-cols-2", !locked && "mt-4")}>
          {shownNames.map((name, i) => (
            <li
              key={name + i}
              className="animate-fade-up flex min-w-0 items-center gap-3 rounded-xl border border-zinc-200 bg-white px-3 py-2.5"
            >
              <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-rose-50 text-rose-500 ring-1 ring-rose-100">
                <FileText className="size-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-zinc-800">{name}</p>
                <p className="text-xs text-zinc-500">
                  {usingSampleFiles ? "Sample document" : files[i] ? `${(files[i].size / 1024).toFixed(0)} KB · PDF` : "PDF"}
                </p>
              </div>
              {!locked && !usingSampleFiles && (
                <button
                  aria-label={`Remove ${name}`}
                  onClick={() => onFilesChange(files.filter((_, j) => j !== i))}
                  className="rounded-md p-1 text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-700"
                >
                  <X className="size-4" />
                </button>
              )}
              {status === "done" && <CircleCheck className="size-4 shrink-0 text-emerald-500" />}
            </li>
          ))}
        </ul>
      )}

      {status === "loading" && (
        <div className="mt-5" aria-live="polite">
          <div className="mb-2 flex items-center gap-2 text-sm font-medium text-zinc-700">
            <LoaderCircle className="size-4 animate-spin text-indigo-500" />
            Reading documents and extracting deadlines…
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-zinc-100">
            <div className="shimmer-bar h-full w-full animate-shimmer rounded-full" />
          </div>
        </div>
      )}

      {error && (
        <div className="mt-4">
          <ErrorBanner message={error.message} detail={error.detail} onRetry={onAnalyze} />
        </div>
      )}

      {status === "idle" && (
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-zinc-500">
            {usingSampleFiles
              ? "Demo mode: sample documents will be used."
              : files.length
                ? `${files.length} file${files.length === 1 ? "" : "s"} ready to analyze`
                : "Add at least one PDF to continue."}
          </p>
          <div className="flex gap-2">
            {files.length > 0 && (
              <button className={secondaryButton} onClick={() => onFilesChange([])}>
                Clear
              </button>
            )}
            <button className={primaryButton} disabled={!canAnalyze} onClick={onAnalyze}>
              Analyze documents
              <ArrowRight className="size-4 transition group-hover:translate-x-0.5" />
            </button>
          </div>
        </div>
      )}
    </Section>
  );
}
