export const CEBU_DISTRICTS = [
  "Minglanilla I", "Minglanilla II", "San Fernando I", "San Fernando II", "Sibonga", "Alcoy",
  "Argao I", "Argao II", "Boljoon", "Dalaguete I", "Dalaguete II", "Oslob", "Samboan", "Santander",
  "Alcantara", "Alegria", "Badian", "Dumanjug I", "Dumanjug II", "Ginatilan", "Malabuyoc", "Moalboal",
  "Ronda", "Aloguinsan", "Asturias I", "Asturias II", "Balamban I", "Balamban II", "Barili I", "Barili II",
  "Pinamungajan I", "Pinamungajan II", "Tuburan I", "Tuburan II", "Borbon", "Carmen", "Catmon", "Compostela",
  "Consolacion I", "Consolacion II", "Cordova", "Liloan", "Pilar", "Poro", "San Francisco", "Sogod", "Tudela",
  "Bantayan I", "Bantayan II", "Daan Bantayan I", "Daan Bantayan II", "Madridejos", "Medellin",
  "San Remigio I", "San Remigio II", "Santa Fe", "Tabogon", "Tabuelan",
] as const;

export const CEBU_DISTRICTS_ALPHABETICAL = [...CEBU_DISTRICTS].sort((a, b) => a.localeCompare(b));

function comparisonKey(value: string) {
  let key = value.normalize("NFKC").trim().toUpperCase()
    .replace(/^DISTRICT\s+OF\s+/, "")
    .replace(/([A-Z])([0-9])$/g, "$1 $2")
    .replace(/\s+/g, " ")
    .replace(/\s+II$/i, " 2")
    .replace(/\s+I$/i, " 1");
  if (key === "ALCANATARA") key = "ALCANTARA";
  return key;
}

const OFFICIAL_DISTRICT_BY_KEY = new Map<string, string>();
for (const district of CEBU_DISTRICTS) {
  const key = comparisonKey(district);
  OFFICIAL_DISTRICT_BY_KEY.set(key, district);
  OFFICIAL_DISTRICT_BY_KEY.set(key.replace(/\s+/g, ""), district);
}

export function normalizedDistrict(value?: string) {
  if (!value?.trim()) return { key: "", label: "" };
  const key = comparisonKey(value);
  const official = OFFICIAL_DISTRICT_BY_KEY.get(key) || OFFICIAL_DISTRICT_BY_KEY.get(key.replace(/\s+/g, ""));
  if (official) return { key: comparisonKey(official), label: official };
  const label = key.toLowerCase().replace(/(^|\s)([a-z])/g, (_, space, letter) => `${space}${letter.toUpperCase()}`);
  return { key, label };
}

export function officialDistrict(value?: string) {
  const normalized = normalizedDistrict(value);
  return OFFICIAL_DISTRICT_BY_KEY.has(normalized.key) ? normalized.label : null;
}
