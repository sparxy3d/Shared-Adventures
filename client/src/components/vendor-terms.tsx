import { Fragment, type ReactNode } from "react";
import "@/components/vendor-terms.css";
import markdown from "@/content/vendor-terms.md?raw";

type HeadingBlock = { kind: "heading"; level: number; text: string; id: string };
type ParagraphBlock = { kind: "paragraph"; text: string };
type ListBlock = { kind: "list"; ordered: boolean; items: string[] };
type TableBlock = { kind: "table"; headers: string[]; rows: string[][] };
type Block = HeadingBlock | ParagraphBlock | ListBlock | TableBlock;

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[`*_~]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");
}

function cellsFromRow(line: string): string[] {
  const trimmed = line.trim().replace(/^\|/, "").replace(/\|$/, "");
  return trimmed.split("|").map((cell) => cell.trim().replace(/\\\|/g, "|"));
}

function isTableDivider(line: string): boolean {
  const cells = cellsFromRow(line);
  return cells.length > 0 && cells.every((cell) => /^:?-{3,}:?$/.test(cell));
}

function parseMarkdown(source: string): Block[] {
  const lines = source.replace(/\r\n?/g, "\n").split("\n");
  const blocks: Block[] = [];
  const slugCounts = new Map<string, number>();
  let index = 0;

  while (index < lines.length) {
    const line = lines[index].trim();
    if (!line) {
      index += 1;
      continue;
    }

    const heading = /^(#{1,6})\s+(.+?)\s*#*$/.exec(line);
    if (heading) {
      const level = heading[1].length;
      const text = heading[2].trim();
      const base = slugify(text) || "section";
      const count = slugCounts.get(base) ?? 0;
      slugCounts.set(base, count + 1);
      blocks.push({ kind: "heading", level, text, id: count ? `${base}-${count + 1}` : base });
      index += 1;
      continue;
    }

    if (index + 1 < lines.length && line.includes("|") && isTableDivider(lines[index + 1])) {
      const headers = cellsFromRow(line);
      index += 2;
      const rows: string[][] = [];
      while (index < lines.length && lines[index].trim().includes("|") && lines[index].trim()) {
        rows.push(cellsFromRow(lines[index]));
        index += 1;
      }
      blocks.push({ kind: "table", headers, rows });
      continue;
    }

    const listMatch = /^(?:[-*+]\s+|\d+\.\s+)/.exec(line);
    if (listMatch) {
      const ordered = /^\d+\.\s+/.test(line);
      const items: string[] = [];
      while (index < lines.length) {
        const current = lines[index].trim();
        const match = /^(?:[-*+]\s+|\d+\.\s+)/.exec(current);
        if (!match || /^\d+\.\s+/.test(current) !== ordered) break;
        items.push(current.slice(match[0].length));
        index += 1;
      }
      blocks.push({ kind: "list", ordered, items });
      continue;
    }

    const paragraphLines = [line];
    index += 1;
    while (index < lines.length && lines[index].trim()) {
      const next = lines[index].trim();
      if (/^#{1,6}\s+/.test(next) || /^(?:[-*+]\s+|\d+\.\s+)/.test(next)) break;
      if (next.includes("|") && index + 1 < lines.length && isTableDivider(lines[index + 1])) break;
      paragraphLines.push(next);
      index += 1;
    }
    blocks.push({ kind: "paragraph", text: paragraphLines.join(" ") });
  }
  return blocks;
}

function renderInline(text: string): ReactNode[] {
  const tokens = text.split(/(\*\*[^*]+\*\*|__[^_]+__|\*[^*]+\*|_[^_]+_|`[^`]+`)/g);
  return tokens.map((token, index) => {
    if ((token.startsWith("**") && token.endsWith("**")) || (token.startsWith("__") && token.endsWith("__"))) {
      return <strong key={index}>{token.slice(2, -2)}</strong>;
    }
    if ((token.startsWith("*") && token.endsWith("*")) || (token.startsWith("_") && token.endsWith("_"))) {
      return <em key={index}>{token.slice(1, -1)}</em>;
    }
    if (token.startsWith("`") && token.endsWith("`")) {
      return <code key={index}>{token.slice(1, -1)}</code>;
    }
    return <Fragment key={index}>{token}</Fragment>;
  });
}

function MarkdownContent({ blocks }: { blocks: Block[] }) {
  return (
    <>
      {blocks.map((block, index) => {
        if (block.kind === "heading") {
          const Heading = `h${block.level}` as keyof JSX.IntrinsicElements;
          return (
            <Heading id={block.id} key={`${block.id}-${index}`}>
              {renderInline(block.text)}
            </Heading>
          );
        }
        if (block.kind === "paragraph") {
          return <p key={index}>{renderInline(block.text)}</p>;
        }
        if (block.kind === "list") {
          const List = block.ordered ? "ol" : "ul";
          return (
            <List key={index}>
              {block.items.map((item, itemIndex) => <li key={itemIndex}>{renderInline(item)}</li>)}
            </List>
          );
        }
        return (
          <div className="vendor-terms-table-wrap" key={index} role="region" aria-label="Terms table" tabIndex={0}>
            <table>
              <thead><tr>{block.headers.map((cell, cellIndex) => <th key={cellIndex}>{renderInline(cell)}</th>)}</tr></thead>
              <tbody>
                {block.rows.map((row, rowIndex) => (
                  <tr key={rowIndex}>
                    {block.headers.map((_, cellIndex) => <td key={cellIndex}>{renderInline(row[cellIndex] ?? "")}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      })}
    </>
  );
}

export default function VendorTerms() {
  const blocks = parseMarkdown(markdown);
  const sections = blocks.filter((block): block is HeadingBlock => block.kind === "heading" && block.level === 2);

  return (
    <main className="stage-content stage-one vendor-terms-page">
      <div className="vendor-terms-layout">
        <aside className="vendor-terms-toc" aria-label="On this page">
          <p className="vendor-terms-toc-title">On this page</p>
          <nav>
            {sections.map((section) => (
              <a key={section.id} href={`#${section.id}`}>{section.text}</a>
            ))}
          </nav>
        </aside>
        <article className="vendor-terms-reading" aria-label="Vendor Terms">
          <MarkdownContent blocks={blocks} />
        </article>
      </div>
    </main>
  );
}
