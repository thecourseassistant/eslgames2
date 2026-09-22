import { LeaderboardEntry } from '../types';

const LEADERBOARD_KEY = 'vocab_sniper_leaderboard_v1';
const APPS_SCRIPT_URL_KEY = 'vocab_sniper_apps_script_url';

export function getLeaderboard(): LeaderboardEntry[] {
  try {
    const raw = localStorage.getItem(LEADERBOARD_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw);
    // If old mock data was previously cached, clear it
    if (Array.isArray(parsed) && parsed.some((e) => e.studentName === 'Alex K.' || e.studentName === 'Sarah M.')) {
      localStorage.setItem(LEADERBOARD_KEY, JSON.stringify([]));
      return [];
    }
    return parsed;
  } catch {
    return [];
  }
}

export interface SaveResult {
  entry: LeaderboardEntry;
  cloudSyncStatus: 'synced' | 'no_url' | 'failed';
  errorDetails?: string;
}

export async function saveLeaderboardEntry(
  entry: Omit<LeaderboardEntry, 'id' | 'date'>
): Promise<SaveResult> {
  const current = getLeaderboard();
  const newEntry: LeaderboardEntry = {
    ...entry,
    id: Math.random().toString(36).substring(2, 9),
    date: new Date().toISOString().replace('T', ' ').slice(0, 19),
  };

  const updated = [...current, newEntry].sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.totalTime - b.totalTime;
  });

  try {
    localStorage.setItem(LEADERBOARD_KEY, JSON.stringify(updated.slice(0, 50)));
  } catch {
    // Ignore storage issues
  }

  const scriptUrl = getAppsScriptUrl();
  if (!scriptUrl || !scriptUrl.startsWith('http')) {
    return { entry: newEntry, cloudSyncStatus: 'no_url' };
  }

  // Submit automatically to Google Apps Script Web App
  try {
    // Send as text/plain to avoid CORS preflight options blocking from browser / GitHub Pages
    const payload = JSON.stringify({
      studentName: newEntry.studentName,
      score: newEntry.score,
      accuracy: `${newEntry.accuracy.toFixed(0)}%`,
      totalTime: `${newEntry.totalTime.toFixed(1)}s`,
      date: newEntry.date,
    });

    await fetch(scriptUrl, {
      method: 'POST',
      mode: 'no-cors', // Standard robust pattern for Google Apps Script Web Apps
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      },
      body: payload,
    });

    return { entry: newEntry, cloudSyncStatus: 'synced' };
  } catch (err) {
    console.error('Failed to sync to Google Sheet via Apps Script', err);
    return {
      entry: newEntry,
      cloudSyncStatus: 'failed',
      errorDetails: String(err),
    };
  }
}

export function getAppsScriptUrl(): string {
  try {
    return localStorage.getItem(APPS_SCRIPT_URL_KEY) || '';
  } catch {
    return '';
  }
}

export function setAppsScriptUrl(url: string) {
  try {
    localStorage.setItem(APPS_SCRIPT_URL_KEY, url);
  } catch {
    // Ignore
  }
}

export function clearLeaderboard(): void {
  try {
    localStorage.setItem(LEADERBOARD_KEY, JSON.stringify([]));
  } catch {
    // Ignore
  }
}

export function exportLeaderboardToCSV(entries: LeaderboardEntry[]) {
  const headers = ['Rank,Student Name,Score,Accuracy (%),Total Time (s),Date'];
  const rows = entries.map(
    (e, index) =>
      `${index + 1},"${e.studentName.replace(/"/g, '""')}",${e.score},${e.accuracy}%,${e.totalTime.toFixed(1)},${e.date}`
  );
  const csvContent = 'data:text/csv;charset=utf-8,' + [headers, ...rows].join('\n');
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement('a');
  link.setAttribute('href', encodedUri);
  link.setAttribute('download', `vocabulary_sniper_leaderboard_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// Complete ready-to-paste Google Apps Script code for the user:
export const APPS_SCRIPT_TEMPLATE = `function doPost(e) {
  try {
    // OPTION A: If this script is attached directly to your Sheet (Extensions > Apps Script):
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    
    // OPTION B: Or if you want to embed your specific Google Sheet URL or ID explicitly:
    // var ss = SpreadsheetApp.openByUrl("PASTE_YOUR_GOOGLE_SHEET_URL_HERE");
    // var sheet = ss.getActiveSheet(); // or ss.getSheetByName("Sheet1");

    // Ensure header row exists
    if (sheet.getLastRow() === 0) {
      sheet.appendRow(["Timestamp", "Student Name", "Score", "Accuracy", "Total Time (s)"]);
    }
    
    var data = JSON.parse(e.postData.contents);
    sheet.appendRow([
      data.date || new Date().toISOString(),
      data.studentName || "Anonymous",
      data.score || 0,
      data.accuracy || "0%",
      data.totalTime || "0s"
    ]);
    
    return ContentService
      .createTextOutput(JSON.stringify({ status: "success" }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ status: "error", message: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}`;
