import { processCoverImage } from "@/lib/image";
import { CanonicalCharacterCard } from "@/lib/types";

type TextChunkMap = Record<string, string>;

type SillyTavernCardData = {
  name?: string;
  description?: string;
  personality?: string;
  scenario?: string;
  first_mes?: string;
  mes_example?: string;
  creator_notes?: string;
  system_prompt?: string;
  post_history_instructions?: string;
  alternate_greetings?: string[];
  tags?: string[];
  creator?: string;
  character_version?: string;
  extensions?: Record<string, unknown>;
};

type SillyTavernEnvelope = {
  data?: SillyTavernCardData;
} & SillyTavernCardData;

export type SillyTavernImportResult = {
  fields: Partial<CanonicalCharacterCard>;
  coverImageDataUrl: string;
  metadataFound: boolean;
};

const PNG_SIGNATURE = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);

export async function importSillyTavernPng(file: File): Promise<SillyTavernImportResult> {
  const [coverImageDataUrl, arrayBuffer] = await Promise.all([processCoverImage(file), file.arrayBuffer()]);
  const textChunks = readPngTextChunks(arrayBuffer);
  const rawCard = findCardPayload(textChunks);
  if (!rawCard) {
    return {
      fields: { coverImageDataUrl },
      coverImageDataUrl,
      metadataFound: false
    };
  }

  const card = normalizeCard(rawCard);
  const persona = (card.personality ?? "").trim();
  const firstMes = (card.first_mes ?? "").trim();

  const fields: Partial<CanonicalCharacterCard> = {
    name: (card.name ?? "").trim() || undefined,
    description: (card.description ?? "").trim() || undefined,
    personality: persona || undefined,
    persona,
    first_mes: firstMes || undefined,
    greeting: firstMes || undefined,
    scenario: (card.scenario ?? "").trim() || undefined,
    mes_example: (card.mes_example ?? "").trim() || undefined,
    creator_notes: (card.creator_notes ?? "").trim() || undefined,
    system_prompt: (card.system_prompt ?? "").trim() || undefined,
    post_history_instructions: (card.post_history_instructions ?? "").trim() || undefined,
    alternate_greetings: normalizeStringArray(card.alternate_greetings),
    tags: normalizeStringArray(card.tags),
    creator: (card.creator ?? "").trim() || undefined,
    character_version: (card.character_version ?? "").trim() || undefined,
    extensions: card.extensions ?? {},
    coverImageDataUrl
  };

  return {
    fields,
    coverImageDataUrl,
    metadataFound: true
  };
}

function readPngTextChunks(buffer: ArrayBuffer): TextChunkMap {
  const bytes = new Uint8Array(buffer);
  if (!hasPngSignature(bytes)) {
    throw new Error("不是有效的 PNG 文件");
  }

  const view = new DataView(buffer);
  let offset = 8;
  const chunks: TextChunkMap = {};

  while (offset + 12 <= bytes.length) {
    const length = view.getUint32(offset);
    const type = readAscii(bytes, offset + 4, 4);
    const dataStart = offset + 8;
    const dataEnd = dataStart + length;
    if (dataEnd + 4 > bytes.length) break;

    const data = bytes.slice(dataStart, dataEnd);
    if (type === "tEXt") {
      const parsed = parseTextChunk(data);
      if (parsed) chunks[parsed.keyword.toLowerCase()] = parsed.value;
    } else if (type === "iTXt") {
      const parsed = parseITxtChunk(data);
      if (parsed) chunks[parsed.keyword.toLowerCase()] = parsed.value;
    }

    offset = dataEnd + 4;
    if (type === "IEND") break;
  }

  return chunks;
}

function hasPngSignature(bytes: Uint8Array): boolean {
  if (bytes.length < PNG_SIGNATURE.length) return false;
  for (let i = 0; i < PNG_SIGNATURE.length; i += 1) {
    if (bytes[i] !== PNG_SIGNATURE[i]) return false;
  }
  return true;
}

function readAscii(bytes: Uint8Array, start: number, length: number): string {
  return new TextDecoder("ascii").decode(bytes.slice(start, start + length));
}

function parseTextChunk(data: Uint8Array): { keyword: string; value: string } | null {
  const nullIndex = data.indexOf(0);
  if (nullIndex <= 0) return null;
  const keyword = new TextDecoder("latin1").decode(data.slice(0, nullIndex));
  const value = new TextDecoder("latin1").decode(data.slice(nullIndex + 1));
  return { keyword, value };
}

function parseITxtChunk(data: Uint8Array): { keyword: string; value: string } | null {
  const firstNull = data.indexOf(0);
  if (firstNull <= 0) return null;
  const keyword = new TextDecoder("latin1").decode(data.slice(0, firstNull));

  const compressionFlagIndex = firstNull + 1;
  const compressionFlag = data[compressionFlagIndex];
  if (compressionFlag !== 0) {
    return null;
  }

  let cursor = compressionFlagIndex + 2;
  const langNull = data.indexOf(0, cursor);
  if (langNull < 0) return null;
  cursor = langNull + 1;

  const translatedNull = data.indexOf(0, cursor);
  if (translatedNull < 0) return null;
  cursor = translatedNull + 1;

  const value = new TextDecoder("utf-8").decode(data.slice(cursor));
  return { keyword, value };
}

function findCardPayload(chunks: TextChunkMap): unknown | null {
  const candidates = [chunks.chara, chunks.ccv3, chunks["character"], chunks["chara_card"]].filter(
    (item): item is string => Boolean(item)
  );

  for (const candidate of candidates) {
    const parsed = tryParseCard(candidate);
    if (parsed) return parsed;
  }

  return null;
}

function tryParseCard(content: string): unknown | null {
  const direct = tryParseJson(content);
  if (direct) return direct;
  const decoded = decodeBase64Utf8(content);
  if (!decoded) return null;
  return tryParseJson(decoded);
}

function tryParseJson(raw: string): unknown | null {
  const trimmed = raw.trim();
  if (!trimmed.startsWith("{") || !trimmed.endsWith("}")) return null;
  try {
    return JSON.parse(trimmed) as unknown;
  } catch {
    return null;
  }
}

function decodeBase64Utf8(raw: string): string | null {
  const normalized = raw.trim().replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized + "=".repeat((4 - (normalized.length % 4)) % 4);
  try {
    const binary = atob(padded);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) {
      bytes[i] = binary.charCodeAt(i);
    }
    return new TextDecoder("utf-8").decode(bytes);
  } catch {
    return null;
  }
}

function normalizeCard(raw: unknown): SillyTavernCardData {
  if (!raw || typeof raw !== "object") return {};
  const envelope = raw as SillyTavernEnvelope;
  const data = envelope.data && typeof envelope.data === "object" ? envelope.data : envelope;
  return {
    name: asString(data.name),
    description: asString(data.description),
    personality: asString(data.personality),
    scenario: asString(data.scenario),
    first_mes: asString(data.first_mes),
    mes_example: asString(data.mes_example),
    creator_notes: asString(data.creator_notes),
    system_prompt: asString(data.system_prompt),
    post_history_instructions: asString(data.post_history_instructions),
    alternate_greetings: asStringArray(data.alternate_greetings),
    tags: asStringArray(data.tags),
    creator: asString(data.creator),
    character_version: asString(data.character_version),
    extensions: asRecord(data.extensions)
  };
}

function asString(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function asStringArray(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  return value.filter((item): item is string => typeof item === "string");
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  return value as Record<string, unknown>;
}

function normalizeStringArray(value: string[] | undefined): string[] {
  return (value ?? []).map((item) => item.trim()).filter(Boolean);
}
