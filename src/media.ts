export function filePathToUrl(filePath: string): string {
  if (!filePath) return "";
  return `kaosan-file://local/${encodeURIComponent(filePath)}`;
}
