export interface VocabularyItem {
  id: string;
  phrase: string;
  condition: string;
  image: string;
  hint: string;
}

export interface ActiveTarget {
  id: string;
  vocabId: string;
  x: number; // percentage 10% to 90%
  y: number; // percentage 15% to 85%
  radius: number; // in pixels
  speedX: number;
  speedY: number;
  scale: number;
  condition: string;
  phrase: string;
  image: string;
}

export interface LeaderboardEntry {
  id: string;
  studentName: string;
  score: number;
  accuracy: number;
  totalTime: number; // seconds
  date: string;
}

export type GameState = 'MENU' | 'PLAYING' | 'ROUND_OVER' | 'LEADERBOARD';
