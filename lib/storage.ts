import { CanonicalCharacterCard, ChatMessage, UserSettings } from "@/lib/types";

const KEYS = {
  accessGranted: "lt_access_granted",
  passcode: "lt_passcode",
  characters: "lt_characters_v1",
  settings: "lt_settings_v1"
};

export function isBrowser(): boolean {
  return typeof window !== "undefined";
}

function readJSON<T>(key: string, fallback: T): T {
  if (!isBrowser()) return fallback;
  const raw = localStorage.getItem(key);
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeJSON(key: string, value: unknown): void {
  if (!isBrowser()) return;
  localStorage.setItem(key, JSON.stringify(value));
}

export function saveAccess(passcode: string): void {
  if (!isBrowser()) return;
  try {
    localStorage.setItem(KEYS.accessGranted, "1");
    localStorage.setItem(KEYS.passcode, passcode);
  } catch {
    // Continue with cookie-only access when storage is restricted.
  }
  document.cookie = "lt_access=1; Path=/; Max-Age=2592000; SameSite=Lax";
}

export function clearAccess(): void {
  if (!isBrowser()) return;
  localStorage.removeItem(KEYS.accessGranted);
  localStorage.removeItem(KEYS.passcode);
  document.cookie = "lt_access=; Max-Age=0; Path=/; SameSite=Lax";
}

export function hasAccess(): boolean {
  return isBrowser() && localStorage.getItem(KEYS.accessGranted) === "1";
}

export function getPasscode(): string {
  if (!isBrowser()) return "";
  return localStorage.getItem(KEYS.passcode) ?? "";
}

export function getSettings(): UserSettings {
  return readJSON<UserSettings>(KEYS.settings, {
    llmApiKey: "",
    model: "openai/gpt-4o-mini"
  });
}

export function setSettings(value: UserSettings): void {
  writeJSON(KEYS.settings, value);
}

export function clearApiKey(): void {
  const current = getSettings();
  setSettings({ ...current, llmApiKey: "" });
}

export function getCharacters(): CanonicalCharacterCard[] {
  return readJSON<CanonicalCharacterCard[]>(KEYS.characters, []);
}

export function upsertCharacter(character: CanonicalCharacterCard): void {
  const list = getCharacters();
  const index = list.findIndex((item) => item.id === character.id);
  if (index === -1) {
    list.push(character);
  } else {
    list[index] = character;
  }
  writeJSON(KEYS.characters, list);
}

export function removeCharacter(id: string): void {
  writeJSON(
    KEYS.characters,
    getCharacters().filter((item) => item.id !== id)
  );
  if (!isBrowser()) return;
  localStorage.removeItem(getHistoryKey(id));
}

export function exportCharactersJSON(): string {
  return JSON.stringify(getCharacters(), null, 2);
}

export function getHistoryKey(characterId: string): string {
  return `lt_chat_history_v1_${characterId}`;
}

export function getHistory(characterId: string): ChatMessage[] {
  return readJSON<ChatMessage[]>(getHistoryKey(characterId), []);
}

export function saveHistory(characterId: string, history: ChatMessage[]): void {
  writeJSON(getHistoryKey(characterId), history);
}

export function clearHistory(characterId: string): void {
  if (!isBrowser()) return;
  localStorage.removeItem(getHistoryKey(characterId));
}
