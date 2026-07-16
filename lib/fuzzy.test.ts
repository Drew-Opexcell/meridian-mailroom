import { describe, expect, it } from "vitest";
import { damerauLevenshtein, matchClient, nameSimilarity, normalizeName } from "./fuzzy";
import type { Client } from "./types";

describe("damerauLevenshtein", () => {
  it("is zero for identical strings", () => {
    expect(damerauLevenshtein("robert", "robert")).toBe(0);
  });
  it("counts a substitution as one", () => {
    expect(damerauLevenshtein("robert", "rXbert")).toBe(1);
  });
  it("counts an adjacent transposition as one, not two", () => {
    // plain Levenshtein would call this 2; Damerau-Levenshtein says 1
    expect(damerauLevenshtein("robert", "rboert")).toBe(1);
  });
  it("handles insertions and deletions", () => {
    expect(damerauLevenshtein("castillo", "castiilo")).toBe(1);
    expect(damerauLevenshtein("okonkwo", "okonkw")).toBe(1);
  });
});

describe("normalizeName", () => {
  it("strips suffixes and punctuation", () => {
    expect(normalizeName("Marcus Lee, Jr.")).toBe("marcus lee");
    expect(normalizeName("O'Brien")).toBe("obrien");
    expect(normalizeName("Okonkwo-Hale")).toBe("okonkwo hale");
  });
});

describe("nameSimilarity", () => {
  it("is 1 for exact matches after normalization", () => {
    expect(nameSimilarity("Marcus Lee Jr.", "Marcus Lee")).toBeCloseTo(1, 5);
  });
  it("stays high through a single OCR error", () => {
    expect(nameSimilarity("Robert Castiilo", "Robert Castillo")).toBeGreaterThan(0.9);
  });
});

const CLIENTS: Client[] = [
  { id: "c1", matterId: "M-1001", firstName: "Robert", lastName: "Castillo", dob: "1974-03-12", ssnLast4: "4821", attorney: "Nguyen", stage: "Hearing" },
  { id: "c2", matterId: "M-1002", firstName: "Maria", lastName: "Gonzales", dob: "1988-07-02", ssnLast4: "1190", attorney: "Reyes", stage: "Reconsideration" },
  { id: "c3", matterId: "M-1003", firstName: "Maria", lastName: "Gonzalez", dob: "1991-11-25", ssnLast4: "7734", attorney: "Reyes", stage: "Initial" },
];

describe("matchClient", () => {
  it("matches through OCR noise via fuzzy distance", () => {
    const r = matchClient({ claimantName: "R0bert Castiilo", dob: null, ssnLast4: null, docDate: null }, CLIENTS);
    expect(r.matched).toBe(true);
    expect(r.clientId).toBe("c1");
    expect(r.method).toBe("fuzzy");
  });

  it("uses DOB to break a near-duplicate-name tie", () => {
    const r = matchClient({ claimantName: "Maria Gonzalez", dob: "1988-07-02", ssnLast4: null, docDate: null }, CLIENTS);
    expect(r.matched).toBe(true);
    expect(r.clientId).toBe("c2"); // DOB points at Gonzales, not the closer-spelled Gonzalez
    expect(r.method).toBe("fuzzy+dob");
  });

  it("returns no match for a stranger", () => {
    const r = matchClient({ claimantName: "Zachary Ellsworth", dob: null, ssnLast4: null, docDate: null }, CLIENTS);
    expect(r.matched).toBe(false);
    expect(r.method).toBe("none");
  });

  it("returns no match when no name was extracted", () => {
    const r = matchClient({ claimantName: null, dob: null, ssnLast4: null, docDate: null }, CLIENTS);
    expect(r.matched).toBe(false);
  });
});
