export function h1(text: string): string {
  return `# ${text}\n`;
}

export function h2(text: string): string {
  return `## ${text}\n`;
}

export function bulletList(items: string[]): string {
  if (items.length === 0) return "_なし_\n";
  return items.map((item) => `- ${item}`).join("\n") + "\n";
}

export function table(headers: string[], rows: (string | number)[][]): string {
  const headerLine = `| ${headers.join(" | ")} |`;
  const dividerLine = `| ${headers.map(() => "---").join(" | ")} |`;
  const rowLines = rows.map((row) => `| ${row.join(" | ")} |`);
  return [headerLine, dividerLine, ...rowLines].join("\n") + "\n";
}

export function section(title: string, body: string): string {
  return `${h2(title)}\n${body}\n`;
}
