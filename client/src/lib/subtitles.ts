export type SubtitleCue = {
  id: number;
  start: string;
  end: string;
  text: string;
};

export function timeToSeconds(value: string): number {
  const parts = value.trim().split(":").map(Number);
  if (parts.some((part) => Number.isNaN(part) || part < 0)) return 0;
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  return 0;
}

export function toSrtTime(value: string): string {
  const total = Math.max(0, timeToSeconds(value));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = Math.floor(total % 60);
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")},000`;
}

export function formatSrt(cues: SubtitleCue[]): string {
  return cues
    .filter((cue) => cue.text.trim())
    .map((cue, index) => `${index + 1}\n${toSrtTime(cue.start)} --> ${toSrtTime(cue.end)}\n${cue.text.trim()}`)
    .join("\n\n");
}
