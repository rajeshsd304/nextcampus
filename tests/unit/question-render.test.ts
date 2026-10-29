import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { MathText, parseMath } from "@/features/questions/math";

function render(text: string): string {
  return renderToStaticMarkup(createElement(MathText, { text }));
}

describe("parseMath", () => {
  it("splits text, inline and display math", () => {
    expect(parseMath("Area $A = \\pi r^2$ and $$E = mc^2$$ done")).toEqual([
      { kind: "text", value: "Area " },
      { kind: "math", value: "A = \\pi r^2", display: false },
      { kind: "text", value: " and " },
      { kind: "math", value: "E = mc^2", display: true },
      { kind: "text", value: " done" },
    ]);
  });

  it("treats escaped and unmatched dollars as text", () => {
    expect(parseMath("Costs \\$5 and $10")).toEqual([{ kind: "text", value: "Costs $5 and $10" }]);
    expect(parseMath("$ $")).toEqual([{ kind: "text", value: "$ $" }]);
  });

  it("does not let inline math span lines", () => {
    expect(parseMath("$a\nb$")).toEqual([{ kind: "text", value: "$a\nb$" }]);
  });

  it("handles Bangla text around math", () => {
    expect(parseMath("বেগ $v = u + at$ হবে")).toHaveLength(3);
  });
});

const MALICIOUS = [
  "<script>alert(1)</script>",
  '<img src=x onerror="alert(1)">',
  "<iframe src='javascript:alert(1)'></iframe>",
  "$\\href{javascript:alert(1)}{click}$",
  "$\\url{javascript:alert(1)}$",
  "$\\htmlId{x}{y}$ $\\htmlClass{x}{y}$ $\\htmlStyle{color:red}{y}$ $\\htmlData{a=b}{y}$",
  "$\\includegraphics{https://evil.example/x.png}$",
  "$<img src=x onerror=alert(1)>$",
  "$x$</span><script>alert(1)</script>",
  "$\\text{<script>alert(1)</script>}$",
  "$$\\def\\a{\\a\\a}\\a$$",
  '$\\href{" onmouseover="alert(1)}{x}$',
  '<a href="javascript:alert(1)">x</a>',
  "$\\rule{100000em}{100000em}$",
];

/** Real tags in the output (text content is entity-escaped, so `<` in text never forms a tag). */
function tags(html: string): string[] {
  return html.match(/<[^>]+>/g) ?? [];
}

describe("MathText sanitization", () => {
  for (const payload of MALICIOUS) {
    it(`neutralizes ${JSON.stringify(payload).slice(0, 60)}`, () => {
      const html = render(payload);
      for (const tag of tags(html)) {
        expect(tag).not.toMatch(/^<\/?(script|img|iframe|a|object|embed|svg|link|style)\b/i);
        expect(tag).not.toMatch(/\son[a-z]+\s*=/i);
        expect(tag).not.toMatch(/\s(href|src|xlink:href|formaction)\s*=/i);
        expect(tag).not.toMatch(/javascript:/i);
      }
      // Anything that looked like markup in the input is shown as text.
      if (payload.includes("<") && !payload.startsWith("$")) expect(html).toContain("&lt;");
    });
  }

  it("still renders legitimate math", () => {
    const html = render("$\\frac{a}{b}$");
    expect(html).toContain('class="katex"');
    expect(html).toContain("<math");
  });

  it("escapes plain text instead of interpreting it", () => {
    expect(render("<b>bold</b>")).toContain("&lt;b&gt;bold&lt;/b&gt;");
  });

  it("caps oversized expressions", () => {
    expect(() => render(`$${"x+".repeat(5000)}x$`)).not.toThrow();
  });
});
