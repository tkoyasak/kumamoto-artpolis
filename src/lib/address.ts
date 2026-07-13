// `municipality` is derived from `location` (ADR 0016) — the address is
// hand-curated, so it always carries what the derivation needs. The one thing
// it must carry is the 政令市 ward: a bare 熊本市 address is rejected rather
// than silently yielding a ward-less municipality, because the prefecture's
// pre-2012 addresses name no ward and that is exactly the value we'd lose.

const KUMAMOTO_CITY_WARD = /^熊本市(?:中央|東|西|南|北)区/;

export function municipalityOf(location: string): string | null {
  const addr = location.replace(/^熊本県/, "");
  if (KUMAMOTO_CITY_WARD.test(addr)) return addr.match(KUMAMOTO_CITY_WARD)![0];
  if (/^熊本市/.test(addr)) return null; // a 熊本市 address must name its ward
  // Strip the 郡, which the site never displays: 阿蘇郡南小国町 → 南小国町.
  return addr.replace(/^.+?郡/, "").match(/^.+?[市町村]/)?.[0] ?? null;
}

if (import.meta.vitest) {
  const { expect, test } = import.meta.vitest;

  test("a 熊本市 address must name its ward — pre-2012 addresses don't, and deriving 熊本市 from one would silently drop the ward the table shows", () => {
    expect(municipalityOf("熊本市中央区帯山1丁目28")).toBe("熊本市中央区");
    expect(municipalityOf("熊本県熊本市北区清水町新地1917")).toBe("熊本市北区");
    expect(municipalityOf("熊本市帯山1丁目28")).toBeNull();
  });

  test("the 郡 is stripped: the catalog names municipalities the way the prefecture's own tables do", () => {
    expect(municipalityOf("阿蘇郡南小国町中杉田1650")).toBe("南小国町");
    expect(municipalityOf("熊本県葦北郡芦北町大字告787")).toBe("芦北町");
  });

  test("a plain 市 address keeps its lot number out of the municipality", () => {
    expect(municipalityOf("天草市有明町上津浦1955")).toBe("天草市");
    expect(municipalityOf("宇土市境目町字帆立町521-1")).toBe("宇土市");
  });

  test("an address naming no municipality at all is rejected, not guessed", () => {
    expect(municipalityOf("熊本県")).toBeNull();
    expect(municipalityOf("立田山憩の森")).toBeNull();
  });
}
