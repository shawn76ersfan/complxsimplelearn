"use client";

import {
  Children,
  isValidElement,
  useMemo,
  type ReactElement,
  type ReactNode,
} from "react";

type ParsedTable = {
  headers: ReactNode[];
  rows: ReactNode[][];
};

function tagName(el: ReactElement): string {
  const fromNode = (el.props as { node?: { tagName?: string } }).node?.tagName;
  if (fromNode) return String(fromNode).toLowerCase();
  return typeof el.type === "string" ? el.type.toLowerCase() : "";
}

function rowCells(row: ReactElement): ReactNode[] {
  return Children.toArray(row.props.children)
    .filter(isValidElement)
    .filter((cell) => {
      const tag = tagName(cell as ReactElement);
      return tag === "th" || tag === "td";
    })
    .map((cell) => (cell as ReactElement).props.children as ReactNode);
}

function parseMarkdownTable(children: ReactNode): ParsedTable | null {
  const headers: ReactNode[] = [];
  const rows: ReactNode[][] = [];

  Children.forEach(children, (section) => {
    if (!isValidElement(section)) return;
    const tag = tagName(section);
    if (tag !== "thead" && tag !== "tbody") return;

    Children.forEach(section.props.children, (row) => {
      if (!isValidElement(row) || tagName(row) !== "tr") return;
      const cells = rowCells(row);
      if (cells.length === 0) return;
      if (tag === "thead") headers.push(...cells);
      else rows.push(cells);
    });
  });

  if (headers.length < 2 || rows.length === 0) return null;
  return { headers, rows };
}

function cellText(node: ReactNode): string {
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(cellText).join("");
  if (isValidElement(node) && "children" in node.props) {
    return cellText(node.props.children as ReactNode);
  }
  return "";
}

function HeaderLabel({ children }: { children: ReactNode }) {
  return (
    <p
      className="text-[10px] font-bold uppercase tracking-[0.14em] mb-1.5"
      style={{ color: "var(--stark-accent)" }}
    >
      {children}
    </p>
  );
}

function ComparisonCards({ headers, rows }: ParsedTable) {
  const labelHeader = headers[0];
  const colHeaders = headers.slice(1);

  return (
    <div className="my-4 space-y-3">
      {rows.map((row, i) => {
        const label = row[0];
        const values = row.slice(1);
        return (
          <div
            key={`${cellText(label)}-${i}`}
            className="rounded-2xl overflow-hidden"
            style={{
              border: "1px solid var(--stark-border)",
              background: "var(--stark-surface)",
            }}
          >
            <div
              className="px-4 py-2.5"
              style={{
                background: "color-mix(in srgb, var(--stark-accent) 10%, transparent)",
                borderBottom: "1px solid var(--stark-border)",
              }}
            >
              <p className="text-sm font-semibold" style={{ color: "var(--stark-text)" }}>
                {label}
              </p>
              {labelHeader ? (
                <p className="sr-only">{cellText(labelHeader)}</p>
              ) : null}
            </div>
            <div
              className={`grid ${colHeaders.length === 2 ? "sm:grid-cols-2" : ""}`}
            >
              {values.map((value, j) => (
                <div
                  key={j}
                  className={`px-4 py-3 ${j > 0 ? "border-t sm:border-t-0 sm:border-l" : ""}`}
                  style={{ borderColor: "var(--stark-border)" }}
                >
                  {colHeaders[j] ? <HeaderLabel>{colHeaders[j]}</HeaderLabel> : null}
                  <div
                    className="text-sm leading-relaxed [&_p]:mb-0 [&_code]:whitespace-normal"
                    style={{ color: "var(--stark-text)" }}
                  >
                    {value}
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function StyledHtmlTable({ children }: { children: ReactNode }) {
  return (
    <div
      className="my-4 overflow-x-auto rounded-2xl"
      style={{
        border: "1px solid var(--stark-border)",
        background: "var(--stark-surface)",
      }}
    >
      <table
        className="w-full text-left border-separate"
        style={{ borderSpacing: 0, minWidth: 440 }}
      >
        {children}
      </table>
    </div>
  );
}

export function StarkMarkdownTable({ children }: { children: ReactNode }) {
  const parsed = useMemo(() => parseMarkdownTable(children), [children]);

  if (parsed && parsed.headers.length >= 2 && parsed.headers.length <= 4) {
    return <ComparisonCards headers={parsed.headers} rows={parsed.rows} />;
  }

  return <StyledHtmlTable>{children}</StyledHtmlTable>;
}

export function StarkTableHead({ children }: { children: ReactNode }) {
  return (
    <thead
      style={{
        background: "color-mix(in srgb, var(--stark-accent) 10%, transparent)",
      }}
    >
      {children}
    </thead>
  );
}

export function StarkTableHeaderCell({ children }: { children: ReactNode }) {
  return (
    <th
      className="text-[11px] font-bold uppercase tracking-[0.12em] px-3.5 py-2.5"
      style={{
        color: "var(--stark-accent)",
        borderBottom: "1px solid var(--stark-border)",
        verticalAlign: "bottom",
      }}
    >
      {children}
    </th>
  );
}

export function StarkTableCell({ children }: { children: ReactNode }) {
  return (
    <td
      className="text-sm leading-relaxed px-3.5 py-3 align-top"
      style={{
        color: "var(--stark-text)",
        borderTop: "1px solid var(--stark-border)",
        wordBreak: "break-word",
      }}
    >
      {children}
    </td>
  );
}
