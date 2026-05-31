export type ProfileStatus = "pending" | "approved" | "rejected";
export type ProfileRole = "user" | "admin";

export type Profile = {
  id: string;
  first_name: string;
  last_name: string;
  phone: string;
  email: string;
  status: ProfileStatus;
  role: ProfileRole;
  created_at: string;
};

export type Team = {
  id: number;
  name: string;
  code: string;
  flag_emoji: string;
  group_letter: string; // "A".."L"
};

export type Stage = "group" | "r32" | "r16" | "qf" | "sf" | "final";
export type MatchStatus = "scheduled" | "finished";

export type Match = {
  id: number;
  stage: Stage;
  group_letter: string | null;
  match_no: number;
  slot_label: string | null;
  home_team_id: number | null;
  away_team_id: number | null;
  kickoff_at: string | null;
  match_date: string | null;
  kickoff: string | null; // local kickoff label, e.g. "3:00 PM ET"
  venue: string | null;
  city: string | null;
  home_score: number | null;
  away_score: number | null;
  status: MatchStatus;
};

export type Pick = "HOME" | "DRAW" | "AWAY";

export type MatchPrediction = {
  id: number;
  user_id: string;
  match_id: number;
  pick: Pick;
  pred_home_score: number | null;
  pred_away_score: number | null;
  points: number;
};

export type AdvancementPrediction = {
  id: number;
  user_id: string;
  group_letter: string;
  first_team_id: number;
  second_team_id: number;
  third_team_id: number | null;
};

export type ThirdPlacePrediction = {
  id: number;
  user_id: string;
  team_id: number;
};

export type BracketPrediction = {
  id: number;
  user_id: string;
  round: "r32" | "r16" | "qf" | "sf" | "final";
  slot: number;
  team_id: number;
};

export type AppSettings = {
  id: number;
  lock_at: string; // ISO timestamp; predictions lock at/after this time
  tournament_name: string;
};
