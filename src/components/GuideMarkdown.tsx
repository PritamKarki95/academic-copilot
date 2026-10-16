import { Fragment, type ReactNode } from "react";

// React escapes all text; backend HTML is deliberately rendered as text.
function inline(text: string): ReactNode {
  return text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g).map((part, i) =>
    part.startsWith("**") ? <strong key={i} className="font-semibold text-zinc-800">{part.slice(2, -2)}</strong>
      : part.startsWith("`") ? <code key={i} className="rounded bg-zinc-100 px-1 font-mono text-xs">{part.slice(1, -1)}</code>
        : <Fragment key={i}>{part}</Fragment>);
}

export function GuideMarkdown({ content }: { content: string }) {
  const lines = content.split(/\r?\n/);
  const blocks: ReactNode[] = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) continue;
    if (line.startsWith("```")) {
      const code: string[] = [];
      while (++i < lines.length && !lines[i].startsWith("```")) code.push(lines[i]);
      blocks.push(<pre key={i} className="overflow-x-auto rounded-lg bg-zinc-900 p-4 text-xs leading-relaxed text-zinc-100"><code>{code.join("\n")}</code></pre>);
    } else if (/^#{1,6}\s/.test(line)) {
      blocks.push(<h3 key={i} className="pt-3 text-base font-semibold text-zinc-900">{inline(line.replace(/^#{1,6}\s+/, ""))}</h3>);
    } else if (/^\s*([-*+] |\d+\. )/.test(line)) {
      const items: ReactNode[] = [];
      const ordered = /^\s*\d+\./.test(line);
      while (i < lines.length && /^\s*([-*+] |\d+\. )/.test(lines[i])) {
        items.push(<li key={i}>{inline(lines[i].replace(/^\s*([-*+] |\d+\. )/, ""))}</li>);
        i++;
      }
      i--;
      blocks.push(ordered ? <ol key={i} className="list-decimal space-y-2 pl-5">{items}</ol> : <ul key={i} className="list-disc space-y-2 pl-5">{items}</ul>);
    } else {
      blocks.push(<p key={i} className="whitespace-pre-wrap">{inline(line)}</p>);
    }
  }
  return <div className="mt-5 space-y-3 text-sm leading-relaxed text-zinc-600">{blocks}</div>;
}
