"use client";

import { useState, useCallback } from "react";
import dynamic from "next/dynamic";
import { Play, RotateCcw, CheckCircle } from "lucide-react";
import { useSoundFeedback } from "@/lib/useSoundFeedback";

const CodeMirror = dynamic(() => import("@uiw/react-codemirror"), { ssr: false });

interface Props {
  language: "html" | "js";
  code: string;
  onComplete: (score: number, maxScore: number) => void;
}

function escapeScript(code: string): string {
  return code.replace(/<\/script/gi, "<\\/script");
}

function wrapJsPreview(code: string): string {
  return `<!DOCTYPE html><html><body><pre id="out" style="margin:0;padding:12px;font:14px/1.4 ui-monospace,monospace;white-space:pre-wrap"></pre>
<script>
const out = document.getElementById("out");
const write = (...args) => { out.textContent += args.map(String).join(" ") + "\\n"; };
console.log = write; console.error = write; console.warn = write;
try {
${escapeScript(code)}
} catch (e) {
  write("Error: " + (e && e.message ? e.message : e));
}
if (!out.textContent) out.textContent = "(no output — try adding console.log())";
</script></body></html>`;
}

export function PlaygroundBlock({ language, code: initialCode, onComplete }: Props) {
  const [code, setCode] = useState(initialCode);
  const [output, setOutput] = useState<string | null>(null);
  const [ran, setRan] = useState(false);
  const [completed, setCompleted] = useState(false);
  const { playComplete } = useSoundFeedback();

  const [extensions, setExtensions] = useState<unknown[]>([]);

  // Lazy-load language extensions
  const loadExtensions = useCallback(async () => {
    if (extensions.length > 0) return;
    if (language === "html") {
      const { html } = await import("@codemirror/lang-html");
      setExtensions([html()]);
    } else {
      const { javascript } = await import("@codemirror/lang-javascript");
      setExtensions([javascript()]);
    }
  }, [language, extensions.length]);

  function handleRun() {
    setRan(true);
    if (language === "html") {
      setOutput(code);
    } else {
      setOutput(wrapJsPreview(code));
    }
    if (!completed) {
      setCompleted(true);
      playComplete();
      onComplete(1, 1);
    }
  }

  function handleReset() {
    setCode(initialCode);
    setOutput(null);
    setRan(false);
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold px-2 py-1 rounded-lg uppercase tracking-wide" style={{ background: "#2563EB22", color: "#2563EB" }}>
            {language}
          </span>
          <span className="text-xs" style={{ color: "var(--text-muted)" }}>Edit the code, then click Run</span>
        </div>
        {completed && (
          <span className="flex items-center gap-1 text-xs font-semibold" style={{ color: "#0EA5E9" }}>
            <CheckCircle size={13} /> Completed
          </span>
        )}
      </div>

      {/* Editor */}
      <div
        className="rounded-xl overflow-hidden"
        style={{ border: "1px solid var(--border)" }}
        onClick={loadExtensions}
      >
        <CodeMirror
          value={code}
          height="200px"
          extensions={extensions as never}
          onChange={(val) => setCode(val)}
          theme="dark"
          basicSetup={{ lineNumbers: true, foldGutter: false, dropCursor: false, allowMultipleSelections: false, indentOnInput: true }}
        />
      </div>

      {/* Output */}
      {output !== null && (
        <div className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--border)" }}>
          {language === "html" || language === "js" ? (
            <iframe
              srcDoc={output}
              sandbox="allow-scripts"
              className="w-full bg-white"
              style={{ height: "200px", display: "block" }}
              title="Code Preview"
            />
          ) : (
            <pre className="p-4 text-sm font-mono leading-relaxed overflow-x-auto" style={{ background: "var(--surface-2)", color: "#38BDF8", minHeight: "60px" }}>
              {output}
            </pre>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3">
        <button
          onClick={handleReset}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all hover:scale-105"
          style={{ background: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--text)" }}
        >
          <RotateCcw size={13} /> Reset
        </button>
        <button
          onClick={handleRun}
          className="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl font-semibold text-white text-sm transition-all hover:opacity-90 hover:scale-105"
          style={{ background: "linear-gradient(135deg, #2563EB, #F97316)" }}
        >
          <Play size={14} /> {language === "html" ? "Preview" : "Run Code"}
        </button>
      </div>
    </div>
  );
}
