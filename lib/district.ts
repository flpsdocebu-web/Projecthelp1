export function normalizedDistrict(value?: string) {
  if (!value?.trim()) return { key: "", label: "" };
  let key = value.normalize("NFKC").trim().toUpperCase()
    .replace(/^DISTRICT\s+OF\s+/, "")
    .replace(/([A-Z])([0-9])$/g, "$1 $2")
    .replace(/\s+/g, " ");
  key = key.replace(/\s+II$/i, " 2").replace(/\s+I$/i, " 1");
  if (key === "ALCANATARA") key = "ALCANTARA";
  const label = key.toLowerCase().replace(/(^|\s)([a-z])/g, (_, space, letter) => `${space}${letter.toUpperCase()}`);
  return { key, label };
}
