import { CanonicalCharacterCard, ChatMessage, UserSettings } from "@/lib/types";

const KEYS = {
  accessGranted: "lt_access_granted",
  passcode: "lt_passcode",
  characters: "lt_characters_v1",
  settings: "lt_settings_v1",
  currentChatId: "lt_current_chat_id"
};

const DEFAULT_CHARACTERS: CanonicalCharacterCard[] = [
  {
    id: "default-victoria",
    name: "维多利亚·凌",
    persona: "冷静、成熟、表达克制，重视现实判断和边界感。",
    greeting: "你来了。我们从你真正关心的问题开始。",
    coverImageDataUrl: "/testdata/victoria.png",
    metadata: { origin: "system-seed", version: "v1" }
  },
  {
    id: "default-tangjuan",
    name: "唐娟",
    persona: "温和耐心，擅长把复杂问题拆解成可执行步骤。",
    greeting: "你好，我在。说说你现在最想先解决的事。",
    coverImageDataUrl: "/testdata/tangjuan.png",
    metadata: { origin: "system-seed", version: "v1" }
  },
  {
    id: "default-baldrick",
    name: "巴尔德里克大人",
    persona: "理性严谨，偏策略视角，善于给出结构化建议。",
    greeting: "欢迎。先说目标，我会给你最直接的路径。",
    coverImageDataUrl: "/testdata/baldrick.png",
    metadata: { origin: "system-seed", version: "v1" }
  }
];

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
  const raw = readJSON<{ llmApiKey?: string; model?: string }>(KEYS.settings, {});
  return {
    model: raw.model?.trim() || "openai/gpt-4o-mini"
  };
}

export function setSettings(value: UserSettings): void {
  writeJSON(KEYS.settings, value);
}

export function getCharacters(): CanonicalCharacterCard[] {
  const list = readJSON<CanonicalCharacterCard[]>(KEYS.characters, []);
  if (list.length > 0) return list;
  if (!isBrowser()) return [];
  writeJSON(KEYS.characters, DEFAULT_CHARACTERS);
  return DEFAULT_CHARACTERS;
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

export function resetLocalCharacterData(): void {
  if (!isBrowser()) return;
  localStorage.removeItem(KEYS.characters);
  localStorage.removeItem(KEYS.currentChatId);

  const historyKeys: string[] = [];
  for (let index = 0; index < localStorage.length; index += 1) {
    const key = localStorage.key(index);
    if (key?.startsWith("lt_chat_history_v1_")) {
      historyKeys.push(key);
    }
  }
  for (const key of historyKeys) {
    localStorage.removeItem(key);
  }
}

export function importCharactersJSON(raw: string): { imported: number } {
  const parsed = JSON.parse(raw) as unknown;
  if (!Array.isArray(parsed)) {
    throw new Error("JSON 必须是数组格式");
  }

  const current = getCharacters();
  const byId = new Map(current.map((item) => [item.id, item] as const));
  let imported = 0;

  for (const item of parsed) {
    if (!item || typeof item !== "object") continue;
    const candidate = item as Partial<CanonicalCharacterCard>;
    const persona = candidate.persona || candidate.personality;
    if (!candidate.id || !candidate.name || !persona) continue;
    byId.set(candidate.id, {
      ...candidate,
      id: candidate.id,
      name: candidate.name,
      persona,
      coverImageDataUrl: candidate.coverImageDataUrl
    } as CanonicalCharacterCard);
    imported += 1;
  }

  writeJSON(KEYS.characters, Array.from(byId.values()));
  return { imported };
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

export function setCurrentChatId(characterId: string): void {
  if (!isBrowser()) return;
  localStorage.setItem(KEYS.currentChatId, characterId);
}

export function getCurrentChatId(): string {
  if (!isBrowser()) return "";
  return localStorage.getItem(KEYS.currentChatId) ?? "";
}
