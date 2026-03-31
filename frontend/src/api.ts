import { getSession } from "./auth";

const API_URL = import.meta.env.VITE_API_URL;

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
): Promise<T> {
  const session = await getSession();
  if (!session) throw new Error("Not authenticated");

  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.token}`,
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || `Request failed: ${res.status}`);
  }

  return res.json();
}

export interface LeaderboardEntry {
  id: string;
  userId: string;
  username: string;
  score: number;
  date: string;
}

export interface MyScoresResponse {
  entries: LeaderboardEntry[];
  totalScore: number;
}

export interface UserDataResponse {
  achievements: string[];
  knownStreets: string[];
}

export function submitScore(score: number): Promise<LeaderboardEntry> {
  return request("POST", "/leaderboard", { score });
}

export function getTopScores(): Promise<LeaderboardEntry[]> {
  return request("GET", "/leaderboard/top");
}

export function getMyScores(): Promise<MyScoresResponse> {
  return request("GET", "/leaderboard/me");
}

export function getUserData(): Promise<UserDataResponse> {
  return request("GET", "/userdata");
}

export function saveUserData(
  achievements: string[],
  knownStreets: string[],
): Promise<{ success: boolean }> {
  return request("PUT", "/userdata", { achievements, knownStreets });
}
