import { Calendar } from "lucide-react";
import { CASSANDRA_CALENDLY_URL } from "@/lib/calendly";

type Variant = "card" | "button";

export function BookOfficeHours({
  variant = "card",
  instructorName = "Cassandra",
  className = "",
}: {
  variant?: Variant;
  instructorName?: string;
  className?: string;
}) {
  const label = `Book 15 min with ${instructorName}`;

  if (variant === "button") {
    return (
      <a
        href={CASSANDRA_CALENDLY_URL}
        target="_blank"
        rel="noopener noreferrer"
        className={`inline-flex items-center justify-center gap-2 px-4 py-2 text-xs font-semibold transition-all hover:opacity-80 ${className}`}
        style={{
          border: "1px solid var(--primary)",
          color: "var(--primary)",
          borderRadius: "8px",
          background: "transparent",
        }}
      >
        <Calendar size={13} /> {label}
      </a>
    );
  }

  return (
    <div className={`index-card p-5 ${className}`}>
      <p className="eyebrow mb-2">Office hours</p>
      <h3 className="font-serif text-lg font-bold mb-1" style={{ color: "var(--text)" }}>
        1:1 with {instructorName}
      </h3>
      <p className="text-sm leading-relaxed mb-4" style={{ color: "var(--text-muted)" }}>
        Stuck on a lab, need resume eyes, or want to talk through a job lead? Pick a slot on her calendar.
      </p>
      <a
        href={CASSANDRA_CALENDLY_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="btn-ink btn-sm inline-flex items-center gap-2"
      >
        <Calendar size={14} /> {label}
      </a>
    </div>
  );
}
