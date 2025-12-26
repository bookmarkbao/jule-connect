export function fmtTime(ms: number) {
  const d = new Date(ms);
  return d.toLocaleString();
}

