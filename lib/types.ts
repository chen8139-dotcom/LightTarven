export type CanonicalCharacterCard = {
  id: string;
  name: string;
  description?: string;
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
