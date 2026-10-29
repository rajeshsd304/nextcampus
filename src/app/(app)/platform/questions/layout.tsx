import type { ReactNode } from "react";
// KaTeX styles are only needed where question content is rendered.
import "katex/dist/katex.min.css";

export default function QuestionsLayout({ children }: { children: ReactNode }) {
  return children;
}
