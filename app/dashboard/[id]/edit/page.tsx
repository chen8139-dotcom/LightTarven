"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import CharacterEditorForm from "@/app/components/character-editor-form";
import { getCharacter } from "@/lib/cloud-client";
import { CanonicalCharacterCard } from "@/lib/types";

export default function EditCharacterPage() {
  const params = useParams<{ id: string }>();
  const [character, setCharacter] = useState<CanonicalCharacterCard | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const run = async () => {
      try {
        const found = await getCharacter(params.id);
        setCharacter(found);
      } catch {
        setCharacter(null);
      } finally {
        setLoaded(true);
      }
    };
    run();
  }, [params.id]);

  if (!loaded) {
    return <main className="text-sm text-zinc-400">加载中...</main>;
  }

  if (loaded && !character) {
    return <main className="text-sm text-red-400">角色不存在，请返回角色列表重新选择。</main>;
  }

  return <CharacterEditorForm initialCharacter={character} />;
}
