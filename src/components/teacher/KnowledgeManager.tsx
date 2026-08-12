"use client";

import { useState } from "react";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { Plus, Save, Trash2, Pencil, X, Sparkles, RefreshCw } from "lucide-react";
import toast from "react-hot-toast";

type EditingDoc = {
  id: Id<"knowledgeDocs"> | null;
  title: string;
  category: string;
  content: string;
};

const EMPTY: EditingDoc = { id: null, title: "", category: "", content: "" };

export function KnowledgeManager() {
  const docs = useQuery(api.knowledge.list);
  const createDoc = useMutation(api.knowledge.create);
  const updateDoc = useMutation(api.knowledge.update);
  const removeDoc = useMutation(api.knowledge.remove);
  const seedResume = useMutation(api.resumeCoach.seedResumeGuidance);
  const rebuild = useAction(api.embeddings.generateAllEmbeddings);

  const [editing, setEditing] = useState<EditingDoc | null>(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<Id<"knowledgeDocs"> | null>(null);
  const [syncing, setSyncing] = useState(false);

  function startNew() {
    setEditing({ ...EMPTY });
  }

  function startEdit(doc: NonNullable<typeof docs>[number]) {
    setEditing({
      id: doc._id,
      title: doc.title,
      category: doc.category ?? "",
      content: doc.content,
    });
  }

  async function handleSave() {
    if (!editing) return;
    if (!editing.title.trim() || !editing.content.trim()) {
      toast.error("Title and content are required");
      return;
    }
    setSaving(true);
    try {
      if (editing.id) {
        await updateDoc({
          id: editing.id,
          title: editing.title,
          content: editing.content,
          category: editing.category || undefined,
        });
        toast.success("Updated! Stark will refresh in a few seconds.");
      } else {
        await createDoc({
          title: editing.title,
          content: editing.content,
          category: editing.category || undefined,
        });
        toast.success("Added! Stark will learn this in a few seconds.");
      }
      setEditing(null);
    } catch {
      toast.error("Could not save. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: Id<"knowledgeDocs">) {
    setDeletingId(id);
    try {
      await removeDoc({ id });
      toast.success("Deleted.");
      if (editing?.id === id) setEditing(null);
    } catch {
      toast.error("Could not delete.");
    } finally {
      setDeletingId(null);
    }
  }

  async function handleSync() {
    setSyncing(true);
    try {
      const res = await rebuild();
      toast.success(`Stark synced (${res.embedded} chunks indexed).`);
    } catch {
      toast.error("Sync failed. Check your API keys.");
    } finally {
      setSyncing(false);
    }
  }

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Actions */}
      <div className="flex items-center gap-3 flex-wrap">
        {!editing && (
          <button
            onClick={startNew}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-white text-sm transition-all hover:opacity-90"
            style={{ background: "linear-gradient(135deg, #2563EB, #F97316)" }}
          >
            <Plus size={15} /> Add knowledge
          </button>
        )}
        <button
          onClick={handleSync}
          disabled={syncing}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm transition-all hover:opacity-80 disabled:opacity-50"
          style={{ background: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--text)" }}
        >
          <RefreshCw size={14} className={syncing ? "animate-spin" : ""} />
          {syncing ? "Syncing…" : "Sync Stark now"}
        </button>
        <button
          onClick={async () => {
            try {
              const res = await seedResume({});
              toast.success(
                res.inserted > 0
                  ? `Added ${res.inserted} resume guidance doc(s). Sync Stark to index them.`
                  : "Resume guidance already present.",
              );
            } catch {
              toast.error("Could not seed resume guidance.");
            }
          }}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm transition-all hover:opacity-80"
          style={{ background: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--text)" }}
        >
          Seed Coach resume tips
        </button>
      </div>
      <p className="text-xs" style={{ color: "var(--text-muted)" }}>
        Use category <code className="px-1 rounded" style={{ background: "var(--surface-2)" }}>resume</code> for Coach Mode guidance.
        Rubric weights stay in code so scores stay consistent; knowledge shapes the advice.
      </p>

      {/* Editor */}
      {editing && (
        <div className="card p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm flex items-center gap-2" style={{ color: "var(--text)" }}>
              <Sparkles size={15} style={{ color: "#14B8A6" }} />
              {editing.id ? "Edit knowledge" : "New knowledge"}
            </h3>
            <button onClick={() => setEditing(null)} style={{ color: "var(--text-muted)" }}>
              <X size={16} />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-muted)" }}>Title *</label>
              <input
                type="text"
                value={editing.title}
                onChange={(e) => setEditing({ ...editing, title: e.target.value })}
                placeholder="e.g. Class schedule & office hours"
                className="w-full px-3 py-2 rounded-xl text-sm outline-none transition-all"
                style={{ background: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--text)" }}
                onFocus={(e) => (e.target.style.borderColor = "#2563EB")}
                onBlur={(e) => (e.target.style.borderColor = "var(--border)")}
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-muted)" }}>Category</label>
              <input
                type="text"
                value={editing.category}
                onChange={(e) => setEditing({ ...editing, category: e.target.value })}
                placeholder='e.g. resume (feeds Coach Mode tips)'
                className="w-full px-3 py-2 rounded-xl text-sm outline-none transition-all"
                style={{ background: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--text)" }}
                onFocus={(e) => (e.target.style.borderColor = "#2563EB")}
                onBlur={(e) => (e.target.style.borderColor = "var(--border)")}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-muted)" }}>Content *</label>
            <textarea
              rows={8}
              value={editing.content}
              onChange={(e) => setEditing({ ...editing, content: e.target.value })}
              placeholder="Paste or type anything you want Stark to know. Long docs are automatically split into searchable chunks."
              className="w-full px-3 py-2.5 rounded-xl text-sm outline-none resize-y transition-all"
              style={{ background: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--text)", lineHeight: "1.6" }}
              onFocus={(e) => (e.target.style.borderColor = "#2563EB")}
              onBlur={(e) => (e.target.style.borderColor = "var(--border)")}
            />
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-white text-sm transition-all hover:opacity-90 disabled:opacity-50"
              style={{ background: "linear-gradient(135deg, #2563EB, #F97316)" }}
            >
              <Save size={14} /> {saving ? "Saving…" : "Save"}
            </button>
            <button
              onClick={() => setEditing(null)}
              className="px-4 py-2.5 rounded-xl font-medium text-sm transition-all hover:opacity-80"
              style={{ background: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--text)" }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Note */}
      <p className="text-xs" style={{ color: "var(--text-muted)" }}>
        Stark updates automatically a few seconds after you save. Use “Sync Stark now” to force a refresh.
      </p>

      {/* List */}
      <div className="space-y-3">
        {!docs ? (
          <div className="space-y-3">
            {[1, 2].map((i) => (
              <div key={i} className="card h-20 animate-pulse" style={{ background: "var(--surface-2)" }} />
            ))}
          </div>
        ) : docs.length === 0 ? (
          <div className="card p-8 text-center">
            <Sparkles size={28} className="mx-auto mb-2 opacity-25" />
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>
              No knowledge added yet. Click “Add knowledge” to teach Stark something new.
            </p>
          </div>
        ) : (
          docs.map((doc) => (
            <div key={doc._id} className="card p-4 flex items-start gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <p className="font-semibold text-sm" style={{ color: "var(--text)" }}>{doc.title}</p>
                  {doc.category && (
                    <span
                      className="text-xs px-2 py-0.5 rounded-full font-medium"
                      style={{ background: "#14B8A615", color: "#14B8A6", border: "1px solid #14B8A630" }}
                    >
                      {doc.category}
                    </span>
                  )}
                </div>
                <p className="text-xs line-clamp-2" style={{ color: "var(--text-muted)" }}>{doc.content}</p>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                <button
                  onClick={() => startEdit(doc)}
                  className="w-8 h-8 rounded-lg flex items-center justify-center transition-all hover:opacity-80"
                  style={{ background: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--text-muted)" }}
                  aria-label="Edit"
                >
                  <Pencil size={13} />
                </button>
                <button
                  onClick={() => handleDelete(doc._id)}
                  disabled={deletingId === doc._id}
                  className="w-8 h-8 rounded-lg flex items-center justify-center transition-all hover:opacity-80"
                  style={{ background: "#EF444415", border: "1px solid #EF444433", color: "#EF4444" }}
                  aria-label="Delete"
                >
                  {deletingId === doc._id ? (
                    <span className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Trash2 size={13} />
                  )}
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
