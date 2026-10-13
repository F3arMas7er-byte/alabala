export interface Match {
  id: string;
  country: string;
  league: string;
  homeTeam: string;
  awayTeam: string;
  score: string;
  time: string; // e.g. "78:42" or "45+2'"
  currentMinute: number; // e.g. 79
  isNew?: boolean;
  status: 'LIVE' | 'HT' | 'FINISHED';
  currentDrop: number; // current drop on TOTAL
  line: string; // e.g. "Over 2.5"
  initialOdd: number; // e.g. 2.10
  currentOdd: number; // e.g. 1.38
  link: string;
  history: DropMinutePoint[];
}

export interface DropMinutePoint {
  minute: number;
  drop: number; // e.g. 0.20, 0.45, 0.68
  totalLine: string; // "O 2.5"
  odd: number;
  timestamp?: string;
}

export interface BotAlert {
  id: string;
  matchId: string;
  matchName: string;
  league: string;
  country: string;
  score: string;
  minute: number;
  dropValue: number;
  threshold: number;
  line: string;
  odd: number;
  timestamp: string;
  telegramStatus: 'SENT' | 'SIMULATED' | 'FAILED' | 'PENDING';
  telegramError?: string;
  link: string;
}

export interface BotConfig {
  telegramToken: string;
  telegramChatId: string;
  dropThreshold: number;
  checkIntervalSeconds: number;
  soundEnabled: boolean;
  autoScrollToAlert: boolean;
  filterHighDropsOnly: boolean;
}

export interface LogEntry {
  id: string;
  timestamp: string;
  level: 'INFO' | 'SUCCESS' | 'WARNING' | 'ALERT' | 'ERROR';
  message: string;
  matchId?: string;
}

export type MatchSubPage = '1X2' | 'TOTAL' | 'HANDICAP' | 'HT TOTAL' | 'HT 1X2';
