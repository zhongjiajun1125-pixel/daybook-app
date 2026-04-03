export type InputMode = "text" | "voice" | "mixed";

export interface Profile {
  id: string;
  email: string;
  created_at: string;
  display_name?: string | null;
}

export interface Tag {
  id: string;
  user_id: string;
  name: string;
  color: string | null;
  created_at: string;
}

export interface Entry {
  id: string;
  user_id: string;
  content: string;
  created_at: string;
  updated_at: string;
  is_archived: boolean;
  input_mode: InputMode;
  tags?: Tag[];
}

export interface Insight {
  id: string;
  user_id: string;
  title: string;
  summary: string;
  type: string;
  created_at: string;
  sources?: string[];
}

export interface InsightBundle {
  themes: string[];
  tensions: string[];
  repeatedPatterns: string[];
  suggestedTags: string[];
}
