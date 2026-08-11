"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import type { LessonBlock } from "@/types/lesson";
import { parseBlocks } from "@/types/lesson";
import {
  BookOpen,
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff,
  Plus,
  Save,
  Trash2,
  ArrowLeft,
} from "lucide-react";
import toast from "react-hot-toast";

const TRACK_COLORS = ["#2563EB", "#0EA5E9", "#10B981", "#F59E0B", "#E11D48", "#8B5CF6"];
const LESSON_TYPES = ["content", "mandatory", "quiz", "game"] as const;

type EditableBlock =
  | { type: "heading"; content: string }
  | { type: "paragraph"; content: string }
  | { type: "code"; content: string }
  | { type: "list"; content: string }
  | { type: "flashcard"; front: string; back: string }
  | { type: "fillblank"; prompt: string; accepted: string }
  | { type: "quiz"; question: string; options: string; correctIndex: number; explanation: string }
  | { type: "match"; pairsText: string }
  | { type: "playground"; language: "html" | "js"; code: string };

function blocksToEditable(blocks: LessonBlock[]): EditableBlock[] {
  return blocks.map((b) => {
    switch (b.type) {
      case "heading":
      case "paragraph":
      case "code":
      case "list":
        return { type: b.type, content: b.content };
      case "flashcard":
        return { type: "flashcard", front: b.front, back: b.back };
      case "fillblank":
        return {
          type: "fillblank",
          prompt: b.prompt,
          accepted: b.accepted.map((group) => group.join("|")).join("\n"),
        };
      case "quiz":
        return {
          type: "quiz",
          question: b.question,
          options: b.options.join("\n"),
          correctIndex: b.correctIndex,
          explanation: b.explanation ?? "",
        };
      case "match":
      case "crossword":
        return {
          type: "match",
          pairsText: b.pairs.map((p) => `${p.term} = ${p.definition}`).join("\n"),
        };
      case "playground":
        return { type: "playground", language: b.language, code: b.code };
      default:
        return { type: "paragraph", content: "" };
    }
  });
}

function editableToContentJson(blocks: EditableBlock[]): string {
  const out: LessonBlock[] = blocks.map((b) => {
    switch (b.type) {
      case "heading":
      case "paragraph":
      case "code":
      case "list":
        return { type: b.type, content: b.content };
      case "flashcard":
        return { type: "flashcard", front: b.front, back: b.back };
      case "fillblank":
        return {
          type: "fillblank",
          prompt: b.prompt,
          accepted: b.accepted
            .split("\n")
            .map((line) => line.trim())
            .filter(Boolean)
            .map((line) =>
              line.split("|").map((s) => s.trim()).filter(Boolean),
            )
            .filter((g) => g.length > 0),
        };
      case "quiz": {
        const options = b.options
          .split("\n")
          .map((o) => o.trim())
          .filter(Boolean);
        return {
          type: "quiz",
          question: b.question,
          options: options.length > 0 ? options : ["Option A", "Option B"],
          correctIndex: Math.min(b.correctIndex, Math.max(options.length - 1, 0)),
          explanation: b.explanation || undefined,
        };
      }
      case "match":
        return {
          type: "match",
          pairs: b.pairsText
            .split("\n")
            .map((line) => line.trim())
            .filter(Boolean)
            .map((line) => {
              const [term, ...rest] = line.split("=");
              return {
                term: (term ?? "").trim(),
                definition: rest.join("=").trim(),
              };
            })
            .filter((p) => p.term && p.definition),
        };
      case "playground":
        return { type: "playground", language: b.language, code: b.code };
    }
  });
  return JSON.stringify({ blocks: out });
}

function emptyBlock(type: EditableBlock["type"]): EditableBlock {
  switch (type) {
    case "heading":
      return { type: "heading", content: "New heading" };
    case "paragraph":
      return { type: "paragraph", content: "" };
    case "code":
      return { type: "code", content: "" };
    case "list":
      return { type: "list", content: "Item one\nItem two" };
    case "flashcard":
      return { type: "flashcard", front: "", back: "" };
    case "fillblank":
      return { type: "fillblank", prompt: "Fill in the ____", accepted: "answer" };
    case "quiz":
      return {
        type: "quiz",
        question: "",
        options: "Option A\nOption B\nOption C\nOption D",
        correctIndex: 0,
        explanation: "",
      };
    case "match":
      return { type: "match", pairsText: "term = definition" };
    case "playground":
      return { type: "playground", language: "js", code: "// try something\n" };
  }
}

const inputStyle = {
  background: "var(--surface-2)",
  border: "1px solid var(--border)",
  color: "var(--text)",
} as const;

function LessonEditor({
  lessonId,
  onBack,
}: {
  lessonId: Id<"lessons">;
  onBack: () => void;
}) {
  const lesson = useQuery(api.curriculumAdmin.getLesson, { lessonId });
  const updateLesson = useMutation(api.curriculumAdmin.updateLesson);
  const removeLesson = useMutation(api.curriculumAdmin.removeLesson);

  const [title, setTitle] = useState("");
  const [type, setType] = useState<(typeof LESSON_TYPES)[number]>("content");
  const [published, setPublished] = useState(false);
  const [blocks, setBlocks] = useState<EditableBlock[]>([]);
  const [ready, setReady] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!lesson) return;
    setTitle(lesson.title);
    setType(lesson.type);
    setPublished(lesson.published);
    setBlocks(blocksToEditable(parseBlocks(lesson.content)));
    setReady(true);
  }, [lesson]);

  if (!lesson || !ready) {
    return <div className="card h-40 animate-pulse" style={{ background: "var(--surface-2)" }} />;
  }

  async function handleSave() {
    setSaving(true);
    try {
      await updateLesson({
        lessonId,
        title: title.trim(),
        type,
        published,
        content: editableToContentJson(blocks),
      });
      toast.success("Lesson saved");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!lesson) return;
    if (!confirm(`Delete “${lesson.title}”? This cannot be undone.`)) return;
    await removeLesson({ lessonId });
    toast.success("Lesson deleted");
    onBack();
  }

  function updateBlock(i: number, next: EditableBlock) {
    setBlocks((prev) => prev.map((b, idx) => (idx === i ? next : b)));
  }

  return (
    <div className="space-y-4">
      <button
        onClick={onBack}
        className="flex items-center gap-1.5 text-sm hover:opacity-70"
        style={{ color: "var(--text-muted)" }}
      >
        <ArrowLeft size={14} /> Back to lessons
      </button>

      <div className="card p-5 space-y-4">
        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: "var(--text-muted)" }}>Title</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 rounded-xl text-sm outline-none"
              style={inputStyle}
            />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: "var(--text-muted)" }}>Type</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as (typeof LESSON_TYPES)[number])}
              className="w-full px-3 py-2 rounded-xl text-sm outline-none"
              style={inputStyle}
            >
              {LESSON_TYPES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
        </div>

        <label className="flex items-center gap-2 text-sm cursor-pointer" style={{ color: "var(--text)" }}>
          <input
            type="checkbox"
            checked={published}
            onChange={(e) => setPublished(e.target.checked)}
          />
          Published (visible to students)
        </label>

        <div className="flex gap-2">
          <button
            onClick={handleSave}
            disabled={saving || !title.trim()}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white disabled:opacity-40"
            style={{ background: "linear-gradient(135deg, #2563EB, #F97316)" }}
          >
            <Save size={14} /> {saving ? "Saving..." : "Save lesson"}
          </button>
          <button
            onClick={handleDelete}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium"
            style={{ background: "#EF444415", color: "#EF4444" }}
          >
            <Trash2 size={14} /> Delete
          </button>
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-bold" style={{ color: "var(--text)" }}>Blocks</h3>
          <select
            defaultValue=""
            onChange={(e) => {
              const t = e.target.value as EditableBlock["type"] | "";
              if (!t) return;
              setBlocks((prev) => [...(prev ?? []), emptyBlock(t)]);
              e.target.value = "";
            }}
            className="px-3 py-1.5 rounded-xl text-xs outline-none"
            style={inputStyle}
          >
            <option value="">+ Add block</option>
            <option value="heading">Heading</option>
            <option value="paragraph">Paragraph</option>
            <option value="code">Code</option>
            <option value="list">List</option>
            <option value="flashcard">Flashcard</option>
            <option value="fillblank">Fill in blank</option>
            <option value="quiz">Quiz</option>
            <option value="match">Match pairs</option>
            <option value="playground">Playground</option>
          </select>
        </div>

        {blocks.length === 0 && (
          <div className="card p-6 text-center text-sm" style={{ color: "var(--text-muted)" }}>
            No blocks yet — add content above.
          </div>
        )}

        {blocks.map((block, i) => (
          <div key={i} className="card p-4 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: "#2563EB" }}>
                {block.type}
              </span>
              <div className="flex gap-1">
                <button
                  disabled={i === 0}
                  onClick={() =>
                    setBlocks((prev) => {
                      if (!prev || i === 0) return prev;
                      const next = [...prev];
                      [next[i - 1], next[i]] = [next[i], next[i - 1]];
                      return next;
                    })
                  }
                  className="w-7 h-7 rounded-lg flex items-center justify-center disabled:opacity-30"
                  style={{ background: "var(--surface-2)" }}
                >
                  <ChevronUp size={14} />
                </button>
                <button
                  disabled={i === blocks.length - 1}
                  onClick={() =>
                    setBlocks((prev) => {
                      if (!prev || i >= prev.length - 1) return prev;
                      const next = [...prev];
                      [next[i], next[i + 1]] = [next[i + 1], next[i]];
                      return next;
                    })
                  }
                  className="w-7 h-7 rounded-lg flex items-center justify-center disabled:opacity-30"
                  style={{ background: "var(--surface-2)" }}
                >
                  <ChevronDown size={14} />
                </button>
                <button
                  onClick={() => setBlocks((prev) => (prev ? prev.filter((_, idx) => idx !== i) : prev))}
                  className="w-7 h-7 rounded-lg flex items-center justify-center"
                  style={{ background: "#EF444415", color: "#EF4444" }}
                >
                  <Trash2 size={13} />
                </button>
              </div>
            </div>

            {(block.type === "heading" ||
              block.type === "paragraph" ||
              block.type === "code" ||
              block.type === "list") && (
              <textarea
                rows={block.type === "paragraph" || block.type === "code" ? 4 : 2}
                value={block.content}
                onChange={(e) => updateBlock(i, { ...block, content: e.target.value })}
                className="w-full px-3 py-2 rounded-xl text-sm outline-none resize-none font-mono"
                style={inputStyle}
                placeholder={block.type === "list" ? "One item per line" : undefined}
              />
            )}

            {block.type === "flashcard" && (
              <div className="grid sm:grid-cols-2 gap-2">
                <input
                  value={block.front}
                  onChange={(e) => updateBlock(i, { ...block, front: e.target.value })}
                  placeholder="Front"
                  className="px-3 py-2 rounded-xl text-sm outline-none"
                  style={inputStyle}
                />
                <input
                  value={block.back}
                  onChange={(e) => updateBlock(i, { ...block, back: e.target.value })}
                  placeholder="Back"
                  className="px-3 py-2 rounded-xl text-sm outline-none"
                  style={inputStyle}
                />
              </div>
            )}

            {block.type === "fillblank" && (
              <div className="space-y-2">
                <input
                  value={block.prompt}
                  onChange={(e) => updateBlock(i, { ...block, prompt: e.target.value })}
                  placeholder="Prompt with ____ blank"
                  className="w-full px-3 py-2 rounded-xl text-sm outline-none"
                  style={inputStyle}
                />
                <textarea
                  rows={2}
                  value={block.accepted}
                  onChange={(e) => updateBlock(i, { ...block, accepted: e.target.value })}
                  placeholder={"Accepted answers (one blank per line, synonyms with |)\ne.g. ls|list"}
                  className="w-full px-3 py-2 rounded-xl text-sm outline-none resize-none"
                  style={inputStyle}
                />
              </div>
            )}

            {block.type === "quiz" && (
              <div className="space-y-2">
                <input
                  value={block.question}
                  onChange={(e) => updateBlock(i, { ...block, question: e.target.value })}
                  placeholder="Question"
                  className="w-full px-3 py-2 rounded-xl text-sm outline-none"
                  style={inputStyle}
                />
                <textarea
                  rows={4}
                  value={block.options}
                  onChange={(e) => updateBlock(i, { ...block, options: e.target.value })}
                  placeholder="One option per line"
                  className="w-full px-3 py-2 rounded-xl text-sm outline-none resize-none"
                  style={inputStyle}
                />
                <div className="flex gap-3 items-center">
                  <label className="text-xs" style={{ color: "var(--text-muted)" }}>Correct option #</label>
                  <input
                    type="number"
                    min={0}
                    value={block.correctIndex}
                    onChange={(e) =>
                      updateBlock(i, { ...block, correctIndex: Number(e.target.value) || 0 })
                    }
                    className="w-20 px-3 py-1.5 rounded-xl text-sm outline-none"
                    style={inputStyle}
                  />
                </div>
                <input
                  value={block.explanation}
                  onChange={(e) => updateBlock(i, { ...block, explanation: e.target.value })}
                  placeholder="Explanation (optional)"
                  className="w-full px-3 py-2 rounded-xl text-sm outline-none"
                  style={inputStyle}
                />
              </div>
            )}

            {block.type === "match" && (
              <textarea
                rows={4}
                value={block.pairsText}
                onChange={(e) => updateBlock(i, { ...block, pairsText: e.target.value })}
                placeholder={"term = definition\none pair per line"}
                className="w-full px-3 py-2 rounded-xl text-sm outline-none resize-none"
                style={inputStyle}
              />
            )}

            {block.type === "playground" && (
              <div className="space-y-2">
                <select
                  value={block.language}
                  onChange={(e) =>
                    updateBlock(i, {
                      ...block,
                      language: e.target.value as "html" | "js",
                    })
                  }
                  className="px-3 py-2 rounded-xl text-sm outline-none"
                  style={inputStyle}
                >
                  <option value="js">JavaScript</option>
                  <option value="html">HTML</option>
                </select>
                <textarea
                  rows={6}
                  value={block.code}
                  onChange={(e) => updateBlock(i, { ...block, code: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl text-sm outline-none resize-none font-mono"
                  style={inputStyle}
                />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function TrackLessons({
  trackId,
  trackName,
  onBack,
}: {
  trackId: Id<"tracks">;
  trackName: string;
  onBack: () => void;
}) {
  const lessons = useQuery(api.curriculumAdmin.listLessons, { trackId });
  const createLesson = useMutation(api.curriculumAdmin.createLesson);
  const updateLesson = useMutation(api.curriculumAdmin.updateLesson);
  const reorderLessons = useMutation(api.curriculumAdmin.reorderLessons);
  const [editingLesson, setEditingLesson] = useState<Id<"lessons"> | null>(null);
  const [creating, setCreating] = useState(false);
  const [newTitle, setNewTitle] = useState("");

  if (editingLesson) {
    return (
      <LessonEditor
        lessonId={editingLesson}
        onBack={() => setEditingLesson(null)}
      />
    );
  }

  async function handleCreate() {
    if (!newTitle.trim()) return;
    const id = await createLesson({
      trackId,
      title: newTitle.trim(),
      type: "content",
      published: false,
    });
    setNewTitle("");
    setCreating(false);
    toast.success("Lesson created");
    setEditingLesson(id);
  }

  async function moveLesson(index: number, dir: -1 | 1) {
    if (!lessons) return;
    const next = [...lessons];
    const j = index + dir;
    if (j < 0 || j >= next.length) return;
    [next[index], next[j]] = [next[j], next[index]];
    await reorderLessons({ trackId, lessonIds: next.map((l) => l._id) });
  }

  return (
    <div className="space-y-4">
      <button
        onClick={onBack}
        className="flex items-center gap-1.5 text-sm hover:opacity-70"
        style={{ color: "var(--text-muted)" }}
      >
        <ArrowLeft size={14} /> All tracks
      </button>

      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h3 className="font-bold text-lg" style={{ color: "var(--text)" }}>{trackName}</h3>
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>
            {lessons?.length ?? 0} lessons
          </p>
        </div>
        <button
          onClick={() => setCreating(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white"
          style={{ background: "linear-gradient(135deg, #2563EB, #F97316)" }}
        >
          <Plus size={14} /> New lesson
        </button>
      </div>

      {creating && (
        <div className="card p-4 flex gap-2 flex-wrap">
          <input
            autoFocus
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="Lesson title"
            className="flex-1 min-w-[200px] px-3 py-2 rounded-xl text-sm outline-none"
            style={inputStyle}
            onKeyDown={(e) => e.key === "Enter" && handleCreate()}
          />
          <button
            onClick={handleCreate}
            disabled={!newTitle.trim()}
            className="px-4 py-2 rounded-xl text-sm font-semibold text-white disabled:opacity-40"
            style={{ background: "#2563EB" }}
          >
            Create
          </button>
          <button
            onClick={() => { setCreating(false); setNewTitle(""); }}
            className="px-4 py-2 rounded-xl text-sm"
            style={{ background: "var(--surface-2)", color: "var(--text)" }}
          >
            Cancel
          </button>
        </div>
      )}

      {!lessons ? (
        <div className="card h-24 animate-pulse" style={{ background: "var(--surface-2)" }} />
      ) : lessons.length === 0 ? (
        <div className="card p-8 text-center text-sm" style={{ color: "var(--text-muted)" }}>
          No lessons in this track yet.
        </div>
      ) : (
        <div className="space-y-2">
          {lessons.map((lesson, i) => (
            <div
              key={lesson._id}
              className="card p-4 flex items-center gap-3"
            >
              <div className="flex flex-col gap-0.5">
                <button
                  onClick={() => moveLesson(i, -1)}
                  disabled={i === 0}
                  className="disabled:opacity-30"
                  style={{ color: "var(--text-muted)" }}
                >
                  <ChevronUp size={14} />
                </button>
                <button
                  onClick={() => moveLesson(i, 1)}
                  disabled={i === lessons.length - 1}
                  className="disabled:opacity-30"
                  style={{ color: "var(--text-muted)" }}
                >
                  <ChevronDown size={14} />
                </button>
              </div>
              <button
                onClick={() => setEditingLesson(lesson._id)}
                className="flex-1 text-left min-w-0"
              >
                <p className="font-semibold text-sm truncate" style={{ color: "var(--text)" }}>
                  {lesson.order}. {lesson.title}
                </p>
                <p className="text-xs" style={{ color: "var(--text-muted)" }}>{lesson.type}</p>
              </button>
              <button
                onClick={async () => {
                  await updateLesson({ lessonId: lesson._id, published: !lesson.published });
                  toast.success(lesson.published ? "Unpublished" : "Published");
                }}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold"
                style={{
                  background: lesson.published ? "#0EA5E920" : "var(--surface-2)",
                  color: lesson.published ? "#0EA5E9" : "var(--text-muted)",
                }}
              >
                {lesson.published ? <Eye size={12} /> : <EyeOff size={12} />}
                {lesson.published ? "Live" : "Draft"}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function CurriculumManager() {
  const tracks = useQuery(api.curriculumAdmin.listTracks);
  const createTrack = useMutation(api.curriculumAdmin.createTrack);
  const updateTrack = useMutation(api.curriculumAdmin.updateTrack);
  const removeTrack = useMutation(api.curriculumAdmin.removeTrack);

  const [selectedTrack, setSelectedTrack] = useState<{
    id: Id<"tracks">;
    name: string;
  } | null>(null);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState(TRACK_COLORS[0]);

  if (selectedTrack) {
    return (
      <TrackLessons
        trackId={selectedTrack.id}
        trackName={selectedTrack.name}
        onBack={() => setSelectedTrack(null)}
      />
    );
  }

  async function handleCreate() {
    if (!name.trim()) return;
    const id = await createTrack({
      name: name.trim(),
      description: description.trim(),
      color,
      icon: "book",
      published: false,
    });
    toast.success("Track created as draft");
    setCreating(false);
    setName("");
    setDescription("");
    setSelectedTrack({ id, name: name.trim() });
  }

  return (
    <div className="space-y-5">
      <div className="flex justify-end">
        <button
          onClick={() => setCreating(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white"
          style={{ background: "linear-gradient(135deg, #2563EB, #F97316)" }}
        >
          <Plus size={14} /> New track
        </button>
      </div>

      {creating && (
        <div className="card p-5 space-y-3 max-w-xl">
          <h3 className="font-bold" style={{ color: "var(--text)" }}>New learning track</h3>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Track name *"
            className="w-full px-3 py-2 rounded-xl text-sm outline-none"
            style={inputStyle}
          />
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Short description"
            rows={2}
            className="w-full px-3 py-2 rounded-xl text-sm outline-none resize-none"
            style={inputStyle}
          />
          <div className="flex gap-2">
            {TRACK_COLORS.map((c) => (
              <button
                key={c}
                onClick={() => setColor(c)}
                className="w-8 h-8 rounded-lg"
                style={{
                  background: c,
                  outline: color === c ? `3px solid ${c}` : "none",
                  outlineOffset: "2px",
                }}
              />
            ))}
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setCreating(false)}
              className="flex-1 py-2 rounded-xl text-sm"
              style={{ background: "var(--surface-2)", color: "var(--text)" }}
            >
              Cancel
            </button>
            <button
              onClick={handleCreate}
              disabled={!name.trim()}
              className="flex-1 py-2 rounded-xl text-sm font-semibold text-white disabled:opacity-40"
              style={{ background: "#2563EB" }}
            >
              Create
            </button>
          </div>
        </div>
      )}

      {!tracks ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="card h-20 animate-pulse" style={{ background: "var(--surface-2)" }} />
          ))}
        </div>
      ) : tracks.length === 0 ? (
        <div className="card p-10 text-center">
          <BookOpen size={28} className="mx-auto mb-2 opacity-25" />
          <p className="font-semibold" style={{ color: "var(--text)" }}>No tracks yet</p>
          <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>
            Create a track, then add lessons with interactive blocks.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {tracks.map((track) => (
            <div key={track._id} className="card p-5 flex items-center gap-4 flex-wrap">
              <div
                className="w-3 h-10 rounded-full flex-shrink-0"
                style={{ background: track.color }}
              />
              <button
                onClick={() => setSelectedTrack({ id: track._id, name: track.name })}
                className="flex-1 text-left min-w-0"
              >
                <p className="font-bold truncate" style={{ color: "var(--text)" }}>{track.name}</p>
                <p className="text-xs truncate" style={{ color: "var(--text-muted)" }}>
                  {track.lessonCount} lessons · /{track.slug}
                </p>
              </button>
              <button
                onClick={async () => {
                  await updateTrack({ trackId: track._id, published: !track.published });
                  toast.success(track.published ? "Track unpublished" : "Track published");
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold"
                style={{
                  background: track.published ? "#0EA5E920" : "var(--surface-2)",
                  color: track.published ? "#0EA5E9" : "var(--text-muted)",
                }}
              >
                {track.published ? <Eye size={12} /> : <EyeOff size={12} />}
                {track.published ? "Live" : "Draft"}
              </button>
              <button
                onClick={async () => {
                  if (!confirm(`Delete track “${track.name}” and all its lessons?`)) return;
                  await removeTrack({ trackId: track._id });
                  toast.success("Track deleted");
                }}
                className="w-8 h-8 rounded-xl flex items-center justify-center"
                style={{ background: "#EF444415" }}
              >
                <Trash2 size={13} style={{ color: "#EF4444" }} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
