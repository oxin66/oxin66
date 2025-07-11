import { z } from 'zod';

export const ChatMessageContentSchema = z.object({
  content: z.string()
    .trim()
    .min(1, { message: 'متن پیام نمی‌تواند خالی باشد.' })
    .max(2000, { message: 'متن پیام نمی‌تواند بیشتر از ۲۰۰۰ کاراکتر باشد.' }),
});

export type TChatMessageContentRequest = z.infer<typeof ChatMessageContentSchema>;

// Validator for updating last_seen_at for a room participant
export const UpdateLastSeenSchema = z.object({
    // No specific data needed in body, action is based on user and roomId from path
});
