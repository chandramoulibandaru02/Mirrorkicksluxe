import { Fragment } from "react";

/** Minimal, injection-safe renderer: "## " headings, "- " bullets, blank-line separated paragraphs. Rendered as React text, never HTML. */
export function RichText({ body }: { body: string }) {
  const blocks = body.replace(/\r\n/g, "\n").split(/\n{2,}/);
  return (
    <div className="space-y-3 text-sm leading-relaxed sm:text-base">
      {blocks.map((block, i) => {
        const lines = block.split("\n").filter((l) => l.trim() !== "");
        if (lines.length === 0) return null;
        if (lines[0].startsWith("## ")) {
          return (
            <Fragment key={i}>
              <h2 className="pt-3 text-lg font-bold">{lines[0].slice(3)}</h2>
              {lines.length > 1 && <RichText body={lines.slice(1).join("\n")} />}
            </Fragment>
          );
        }
        if (lines.every((l) => l.startsWith("- "))) {
          return (
            <ul key={i} className="list-disc space-y-1 pl-5">
              {lines.map((l, j) => (
                <li key={j}>{l.slice(2)}</li>
              ))}
            </ul>
          );
        }
        return <p key={i} className={block.includes("[CONFIRM") ? "rounded-[3px] bg-amber-50 p-2 text-warn" : undefined}>{lines.join(" ")}</p>;
      })}
    </div>
  );
}
