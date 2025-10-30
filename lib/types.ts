import { z } from 'zod';
import type { InferUITool, UIMessage } from 'ai';

export type DataPart = { type: 'append-message'; message: string };

export const messageMetadataSchema = z.object({
  createdAt: z.string(),
});

export type MessageMetadata = z.infer<typeof messageMetadataSchema>;

export type Attachment = {
  url: string;
  name: string;
  contentType: string;
};

export type ChatMessage = UIMessage & {
  attachments?: Array<Attachment>;
};

export type CustomUIDataTypes = {
  textDelta: string;
  imageDelta: string;
  sheetDelta: string;
  codeDelta: string;
  appendMessage: string;
  id: string;
  title: string;
  clear: null;
  finish: null;
};
