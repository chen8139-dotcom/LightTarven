import { CanonicalCharacterCard, ChatMessage } from "@/lib/types";

export type CloudChat = {
  id: string;
  characterId: string;
  title: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ChatInitPayload = {
  character: CanonicalCharacterCard;
  model: string;
  chat: CloudChat;
  messages: ChatMessage[];
};

export async function cloudFetch<T>(input: RequestInfo | URL, init?: RequestInit): Promise<T> {
  const response = await fetch(input, init);
  const payload = (await response.json().catch(() => ({}))) as Record<string, unknown>;
  if (!response.ok) {
    throw new Error(String(payload.error ?? "Request failed"));
  }
  return payload as T;
}

export async function listCharacters(): Promise<CanonicalCharacterCard[]> {
  const payload = await cloudFetch<{ characters: CanonicalCharacterCard[] }>("/api/cloud/characters", {
    cache: "no-store"
  });
  return payload.characters;
}

export async function createCharacter(card: CanonicalCharacterCard): Promise<CanonicalCharacterCard> {
  const payload = await cloudFetch<{ character: CanonicalCharacterCard }>("/api/cloud/characters", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(card)
  });
  return payload.character;
}

export async function getCharacter(id: string): Promise<CanonicalCharacterCard> {
  const payload = await cloudFetch<{ character: CanonicalCharacterCard }>(`/api/cloud/characters/${id}`, {
    cache: "no-store"
  });
  return payload.character;
}

export async function updateCharacter(id: string, card: CanonicalCharacterCard): Promise<CanonicalCharacterCard> {
  const payload = await cloudFetch<{ character: CanonicalCharacterCard }>(`/api/cloud/characters/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(card)
  });
  return payload.character;
}

export async function removeCharacterCloud(id: string): Promise<void> {
  await cloudFetch<{ ok: true }>(`/api/cloud/characters/${id}`, {
    method: "DELETE"
  });
}

export async function listChats(characterId: string): Promise<CloudChat[]> {
  const payload = await cloudFetch<{ chats: CloudChat[] }>(
    `/api/cloud/chats?characterId=${encodeURIComponent(characterId)}`,
    { cache: "no-store" }
  );
  return payload.chats;
}

export async function createChat(characterId: string, title?: string): Promise<CloudChat> {
  const payload = await cloudFetch<{ chat: CloudChat }>("/api/cloud/chats", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ characterId, title })
  });
  return payload.chat;
}

export async function getChatMessages(chatId: string): Promise<ChatMessage[]> {
  const payload = await cloudFetch<{ messages: ChatMessage[] }>(`/api/cloud/chats/${chatId}/messages`, {
    cache: "no-store"
  });
  return payload.messages;
}

export async function getCloudSettings(): Promise<{ model: string }> {
  const payload = await cloudFetch<{ settings: { model: string } }>("/api/cloud/settings", {
    cache: "no-store"
  });
  return payload.settings;
}

export async function getChatInit(characterId: string): Promise<ChatInitPayload> {
  return cloudFetch<ChatInitPayload>(`/api/cloud/chat-init?characterId=${encodeURIComponent(characterId)}`, {
    cache: "no-store"
  });
}

export async function updateCloudSettings(model: string): Promise<{ model: string }> {
  const payload = await cloudFetch<{ settings: { model: string } }>("/api/cloud/settings", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model })
  });
  return payload.settings;
}
