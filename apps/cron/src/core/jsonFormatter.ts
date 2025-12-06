export function formatJson(data: Array<Record<string, string | number>>) {
  return `{
${data.map((item) => `  ${JSON.stringify(item)}`).join(",\n")}  
}`;
}
