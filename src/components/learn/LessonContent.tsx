"use client";

interface Block {
  type: "heading" | "paragraph" | "code" | "list";
  content: string;
}

export function LessonContent({ contentJson }: { contentJson: string }) {
  let blocks: Block[] = [];
  try {
    const parsed = JSON.parse(contentJson);
    blocks = parsed.blocks ?? [];
  } catch {
    return <p style={{ color: "var(--text-muted)" }}>Content unavailable.</p>;
  }

  return (
    <div className="flex flex-col gap-5">
      {blocks.map((block, i) => {
        switch (block.type) {
          case "heading":
            return (
              <h2
                key={i}
                className="font-serif text-2xl font-bold tracking-tight mt-4 pb-2"
                style={{ color: "var(--text)", borderBottom: "1px solid var(--border)" }}
              >
                {block.content}
              </h2>
            );
          case "paragraph":
            return (
              <p key={i} className="text-[17px] leading-8" style={{ color: "color-mix(in srgb, var(--text) 88%, var(--text-muted))" }}>
                {block.content}
              </p>
            );
          case "code":
            return (
              <div key={i} className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--border)" }}>
                <div className="flex items-center gap-1.5 px-4 py-2" style={{ background: "var(--surface-2)", borderBottom: "1px solid var(--border)" }}>
                  <span className="w-2.5 h-2.5 rounded-full" style={{ background: "#F87171" }} />
                  <span className="w-2.5 h-2.5 rounded-full" style={{ background: "#FBBF24" }} />
                  <span className="w-2.5 h-2.5 rounded-full" style={{ background: "#34D399" }} />
                  <span className="ml-auto text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: "var(--text-muted)" }}>code</span>
                </div>
                <pre
                  className="p-5 overflow-x-auto text-[13.5px] font-mono leading-7"
                  style={{ background: "#0F172A", color: "#E2E8F0", margin: 0 }}
                >
                  {block.content}
                </pre>
              </div>
            );
          case "list":
            return (
              <ul key={i} className="flex flex-col gap-2.5 pl-1">
                {block.content.split("\n").filter((line) => line.trim()).map((item, j) => (
                  <li key={j} className="flex items-start gap-3 text-[16px] leading-7" style={{ color: "color-mix(in srgb, var(--text) 88%, var(--text-muted))" }}>
                    <span
                      className="mt-[11px] w-2 h-2 rounded-full flex-shrink-0"
                      style={{ background: "var(--track-color, var(--accent))" }}
                    />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            );
          default:
            return null;
        }
      })}
    </div>
  );
}
