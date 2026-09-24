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

export async function syncAudioToCloud(
  fireSound?: string | null,
  reloadSound?: string | null
): Promise<{ success: boolean; error?: string }> {
  const scriptUrl = getAppsScriptUrl();
  if (!scriptUrl || !scriptUrl.startsWith('http')) {
    return { success: false, error: 'No Google Apps Script Web App URL configured.' };
  }

  const fireToSave = fireSound || localStorage.getItem('pubg_custom_fire_sound') || '';
  const reloadToSave = reloadSound || localStorage.getItem('pubg_custom_reload_sound') || '';

  try {
    const payload = JSON.stringify({
      action: 'saveAudio',
      fireSound: fireToSave,
      reloadSound: reloadToSave,
    });

    await fetch(scriptUrl, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: payload,
    });

    return { success: true };
  } catch (err) {
    console.error('Failed to sync audio to cloud:', err);
    return { success: false, error: String(err) };
  }
}

export async function fetchCloudAudio(): Promise<{ fireSound?: string; reloadSound?: string } | null> {
  const scriptUrl = getAppsScriptUrl();
  if (!scriptUrl || !scriptUrl.startsWith('http')) {
    return null;
  }

  try {
    const resp = await fetch(scriptUrl, { method: 'GET' });
    if (!resp.ok) return null;
    const data = await resp.json();
    if (data && data.status === 'success') {
      return {
        fireSound: data.fireSound || undefined,
        reloadSound: data.reloadSound || undefined,
      };
    }
    return null;
  } catch {
    return null;
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

// Complete ready-to-paste Google Apps Script code with Google Sheet URL support & multi-device sound sync:
export const APPS_SCRIPT_TEMPLATE = `// 1. (OPTIONAL) PASTE YOUR GOOGLE SHEET LINK HERE BETWEEN THE QUOTES:
// If left blank, it automatically uses the spreadsheet this script is attached to.
var SPREADSHEET_URL = "";

function getTargetSheet() {
  if (SPREADSHEET_URL && SPREADSHEET_URL.trim().length > 0) {
    return SpreadsheetApp.openByUrl(SPREADSHEET_URL.trim()).getActiveSheet();
  }
  return SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
}

function doGet(e) {
  try {
    var props = PropertiesService.getScriptProperties().getProperties();
    var result = {
      status: "success",
      fireSound: props.fireSound || "",
      reloadSound: props.reloadSound || ""
    };
    return ContentService
      .createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ status: "error", message: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    
    // Check if this is an audio save request from Leaderboard Settings
    if (data.action === "saveAudio") {
      var propsToSave = {};
      if (data.fireSound) propsToSave.fireSound = data.fireSound;
      if (data.reloadSound) propsToSave.reloadSound = data.reloadSound;
      PropertiesService.getScriptProperties().setProperties(propsToSave);
      return ContentService
        .createTextOutput(JSON.stringify({ status: "success" }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    // Otherwise, append student leaderboard record to Google Sheet
    var sheet = getTargetSheet();
    if (sheet.getLastRow() === 0) {
      sheet.appendRow(["Timestamp", "Student Name", "Score", "Accuracy", "Total Time (s)"]);
    }
    
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
