export type CanonicalCharacterCard = {
  id: string;
  name: string;
  // SillyTavern-compatible core fields.
  description?: string;
  personality?: string;
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

  // Internal aliases kept for backward compatibility in this app.
  greeting?: string;
  persona: string;
  coverImageDataUrl?: string;
  scenario?: string;
  style?: string;
  rules?: string;
  examples?: {
    user: string;
    assistant: string;
  }[];
  metadata?: {
    origin?: string;
    version?: string;
    tags?: string[];
  };
};

export type ChatMessage = {
  role: "user" | "assistant";
  content: string;
  timestamp: number;
  tokenUsage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
};

export type PromptStackConfig = {
  maxHistory: number;
  includeExamples: boolean;
};

export type PromptStackInput = {
  character: CanonicalCharacterCard;
  history: ChatMessage[];
  userInput: string;
  config: PromptStackConfig;
};

export type PromptStackOutput = {
  messages: {
    role: "system" | "user" | "assistant";
    content: string;
  }[];
  debugInfo: {
    trimmedCount: number;
    exampleIncluded: boolean;
  };
};

export type UserSettings = {
  model: string;
};
