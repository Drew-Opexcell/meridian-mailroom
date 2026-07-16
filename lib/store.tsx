"use client";

import { createContext, useContext, useReducer, type ReactNode } from "react";
import { buildAuditRow } from "./audit";
import { routeLetter } from "./router";
import { BY_SLUG } from "./taxonomy";
import type {
  AuditRow,
  CategorySlug,
  ClassifyResult,
  ExtractResult,
  Letter,
  LetterStatus,
  MatchResult,
  ReviewItem,
  StageEvent,
} from "./types";

export interface LetterState {
  status: LetterStatus;
  events: StageEvent[];
}

interface AppState {
  letters: Record<string, LetterState>;
  reviewQueue: ReviewItem[];
  auditRows: AuditRow[];
}

const initial: AppState = { letters: {}, reviewQueue: [], auditRows: [] };

type Action =
  | { type: "start"; letterId: string }
  | { type: "event"; letterId: string; event: StageEvent }
  | { type: "finish"; letterId: string; letter: Letter }
  | { type: "approve"; letterId: string; letter: Letter }
  | { type: "override"; letterId: string; letter: Letter; category: CategorySlug }
  | { type: "reject"; letterId: string }
  | { type: "reset" };

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case "start":
      return {
        ...state,
        letters: { ...state.letters, [action.letterId]: { status: "processing", events: [] } },
      };

    case "event": {
      const cur = state.letters[action.letterId] ?? { status: "processing", events: [] };
      return {
        ...state,
        letters: {
          ...state.letters,
          [action.letterId]: { ...cur, events: [...cur.events, action.event] },
        },
      };
    }

    case "finish": {
      const cur = state.letters[action.letterId];
      if (!cur) return state;
      const gate = payload<{ divert: boolean; reason: string | null }>(cur.events, "gate");
      const diverted = Boolean(gate?.divert);

      if (diverted) {
        const cls = payload<ClassifyResult>(cur.events, "classify")!;
        const ext = payload<ExtractResult>(cur.events, "extract")!;
        const match = payload<MatchResult>(cur.events, "match")!;
        const item: ReviewItem = {
          letterId: action.letterId,
          classify: cls,
          extract: ext,
          match,
          reason: gate?.reason ?? "held for review",
          queuedAt: new Date().toISOString(),
        };
        return {
          ...state,
          letters: { ...state.letters, [action.letterId]: { ...cur, status: "in_review" } },
          reviewQueue: dedupeQueue([...state.reviewQueue, item]),
          auditRows: [buildAuditRow(cur.events, "pending"), ...state.auditRows],
        };
      }

      return {
        ...state,
        letters: { ...state.letters, [action.letterId]: { ...cur, status: "routed" } },
        auditRows: [buildAuditRow(cur.events, "auto"), ...state.auditRows],
      };
    }

    case "approve": {
      const cur = state.letters[action.letterId];
      if (!cur) return state;
      const cls = payload<ClassifyResult>(cur.events, "classify")!;
      const ext = payload<ExtractResult>(cur.events, "extract")!;
      const match = payload<MatchResult>(cur.events, "match")!;
      const route = routeLetter(cls, ext, match, action.letter.receivedAt);
      return {
        ...state,
        letters: { ...state.letters, [action.letterId]: { ...cur, status: "approved" } },
        reviewQueue: state.reviewQueue.filter((r) => r.letterId !== action.letterId),
        auditRows: [buildAuditRow(cur.events, "approved", route), ...state.auditRows],
      };
    }

    case "override": {
      const cur = state.letters[action.letterId];
      if (!cur) return state;
      const clsOrig = payload<ClassifyResult>(cur.events, "classify")!;
      const cls: ClassifyResult = { ...clsOrig, category: action.category };
      const ext = payload<ExtractResult>(cur.events, "extract")!;
      const match = payload<MatchResult>(cur.events, "match")!;
      const route = routeLetter(cls, ext, match, action.letter.receivedAt);
      const label = BY_SLUG[action.category].label;
      return {
        ...state,
        letters: { ...state.letters, [action.letterId]: { ...cur, status: "overridden" } },
        reviewQueue: state.reviewQueue.filter((r) => r.letterId !== action.letterId),
        auditRows: [buildAuditRow(cur.events, `overridden -> ${label}`, route), ...state.auditRows],
      };
    }

    case "reject": {
      const cur = state.letters[action.letterId];
      if (!cur) return state;
      return {
        ...state,
        letters: { ...state.letters, [action.letterId]: { ...cur, status: "rejected" } },
        reviewQueue: state.reviewQueue.filter((r) => r.letterId !== action.letterId),
        auditRows: [buildAuditRow(cur.events, "rejected -> manual"), ...state.auditRows],
      };
    }

    case "reset":
      return initial;
  }
}

function dedupeQueue(q: ReviewItem[]): ReviewItem[] {
  const seen = new Set<string>();
  return q.filter((i) => (seen.has(i.letterId) ? false : (seen.add(i.letterId), true)));
}

function payload<T>(events: StageEvent[], stage: string): T | undefined {
  return events.find((e) => e.stage === stage && e.status === "complete")?.payload as T | undefined;
}

const StoreContext = createContext<{
  state: AppState;
  dispatch: React.Dispatch<Action>;
} | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initial);
  return <StoreContext.Provider value={{ state, dispatch }}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used inside StoreProvider");
  return ctx;
}
