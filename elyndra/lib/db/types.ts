// ── JSONB shapes (mirroring schema.$type<> declarations) ────────────────────

export interface HomeConstraints {
  minAge: number;
  maxAge: number;
  genderAllowed: ("male" | "female")[];
  notes?: string;
}

export interface HomeCapabilities {
  diabetesTrained: boolean;
  traumaInformed: boolean;
  adhdSupport: boolean;
  specialistStaff: boolean;
  mentalHealth: boolean;
}

export interface ChildProfile {
  name: string;
  age: number;
  gender: "male" | "female";
  location: string;
  localAuthority: string;
}

export interface ChildNeeds {
  adhd: boolean;
  diabetes: boolean;
  trauma: boolean;
  specialistStaff: boolean;
  mentalHealth: boolean;
  selfHarm: boolean;
  violence: boolean;
  absconding: boolean;
}

// ── Enum value types ─────────────────────────────────────────────────────────

export type Role = "COORDINATOR" | "HOME_MANAGER";
export type Priority = "EMERGENCY" | "HIGH" | "NORMAL";
export type Status =
  | "NEW"
  | "TRIAGED"
  | "OUTREACH"
  | "AWAITING_RESPONSE"
  | "DECISION"
  | "PLACED"
  | "CLOSED";
export type WaitingOn = "HOME" | "COORDINATOR";
export type Decision = "ACCEPTED" | "REJECTED";
export type MessageType =
  | "message"
  | "phone_call"
  | "meeting_note"
  | "document"
  | "note";

export type EventType =
  | "STATUS_CHANGE"
  | "MESSAGE_SENT"
  | "DECISION_MADE"
  | "THREAD_CREATED";

// ── Inferred row types from schema ───────────────────────────────────────────

export type { InferSelectModel, InferInsertModel } from "drizzle-orm";
