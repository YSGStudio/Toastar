export function generateClassCode(): string {
  return String(Math.floor(Math.random() * 10000)).padStart(4, "0");
}
