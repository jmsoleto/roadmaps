/**
 * Handing the browser a file.
 *
 * One place, because there were about to be three: Roadmaps exports a roadmap,
 * Decisions exports its decisions, and API Hub exports four different things
 * from a dialog. Three copies of an object URL that has to be revoked is three
 * chances to forget.
 */

/** What each extension is, so the browser and the OS agree about the file. */
const MIME: Record<string, string> = {
  json: 'application/json',
  yaml: 'application/yaml',
  yml: 'application/yaml',
  md: 'text/markdown',
};

export function downloadText(filename: string, text: string): void {
  const extension = filename.split('.').pop()?.toLowerCase() ?? '';
  const type = `${MIME[extension] ?? 'text/plain'};charset=utf-8`;
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
