import { SupabaseClient } from "@supabase/supabase-js";

export function getCharacterCoverBucket(): string {
  return process.env.SUPABASE_CHARACTER_COVERS_BUCKET ?? "character-covers";
}

export async function uploadCharacterCoverFromDataUrl(
  supabase: SupabaseClient,
  userId: string,
  dataUrl: string
): Promise<{ path: string; publicUrl: string }> {
  const match = dataUrl.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
  if (!match) {
    throw new Error("Invalid cover image format");
  }

  const mimeType = match[1];
  const base64Data = match[2];
  const extension = mimeType.includes("png") ? "png" : "jpg";
  const filename = `${userId}/${crypto.randomUUID()}.${extension}`;
  const binary = Buffer.from(base64Data, "base64");
  const bucket = getCharacterCoverBucket();

  const { error } = await supabase.storage.from(bucket).upload(filename, binary, {
    contentType: mimeType,
    upsert: true
  });
  if (error) {
    throw new Error(error.message);
  }

  const { data } = supabase.storage.from(bucket).getPublicUrl(filename);
  return {
    path: filename,
    publicUrl: data.publicUrl
  };
}
