import katex from "katex";
import { Fragment } from "react";
import { cn } from "@/lib/utils";

/**
 * Question content is PLAIN TEXT with inline math `$…$` and display math
 * `$$…$$` (`\$` is a literal dollar sign). There is no HTML or Markdown:
 *
 *   - text segments are rendered as React text nodes, so any `<script>`,
 *     `<img onerror>` etc. is shown literally, never interpreted;
 *   - math segments go through KaTeX with `trust: false` (no \href, \url,
 *     \includegraphics, \htmlId/\htmlClass/\htmlStyle/\htmlData), strict
 *     parsing errors rendered inline, and expansion/size limits, so the only
 *     HTML ever injected is KaTeX's own generated markup.
 *
 * tests/unit/question-render.test.ts runs malicious payloads through this.
 */

export type MathSegment = { kind: "text"; value: string } | { kind: "math"; value: string; display: boolean };

const MAX_MATH_LENGTH = 2000;

export function parseMath(input: string): MathSegment[] {
  const segments: MathSegment[] = [];
  let text = "";
  let i = 0;
  const pushText = () => {
    if (text) segments.push({ kind: "text", value: text });
    text = "";
  };

  while (i < input.length) {
    const char = input[i];
    if (char === "\\" && input[i + 1] === "$") {
      text += "$";
      i += 2;
      continue;
    }
    if (char === "$") {
      const display = input[i + 1] === "$";
      const delimiter = display ? "$$" : "$";
      const start = i + delimiter.length;
      let end = start;
      while (end < input.length) {
        if (input[end] === "\\") {
          end += 2;
          continue;
        }
        if (input.startsWith(delimiter, end)) break;
        end += 1;
      }
      const body = input.slice(start, end);
      if (end < input.length && body.trim() && !(!display && body.includes("\n"))) {
        pushText();
        segments.push({ kind: "math", value: body, display });
        i = end + delimiter.length;
        continue;
      }
    }
    text += char;
    i += 1;
  }
  pushText();
  return segments;
}

export function renderMathToHtml(tex: string, display: boolean): string {
  return katex.renderToString(tex.slice(0, MAX_MATH_LENGTH), {
    displayMode: display,
    throwOnError: false,
    trust: false,
    strict: "ignore",
    maxSize: 10,
    maxExpand: 200,
    output: "htmlAndMathml",
  });
}

/** Renders question content safely. Usable in Server and Client Components. */
export function MathText({ text, className, lang }: { text: string; className?: string; lang?: string }) {
  const segments = parseMath(text);
  return (
    <div className={cn("break-words whitespace-pre-wrap", className)} lang={lang}>
      {segments.map((segment, index) =>
        segment.kind === "text" ? (
          <Fragment key={index}>{segment.value}</Fragment>
        ) : (
          <span
            key={index}
            className={segment.display ? "my-2 block overflow-x-auto" : undefined}
            // Safe: KaTeX output with trust disabled; see the module comment.
            dangerouslySetInnerHTML={{ __html: renderMathToHtml(segment.value, segment.display) }}
          />
        ),
      )}
    </div>
  );
}
