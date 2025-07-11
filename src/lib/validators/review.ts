import { z } from 'zod';

export const ReviewSubmissionSchema = z.object({
  rating: z.number()
    .int({ message: 'امتیاز باید یک عدد صحیح باشد.' })
    .min(1, { message: 'امتیاز نمی‌تواند کمتر از ۱ باشد.' })
    .max(5, { message: 'امتیاز نمی‌تواند بیشتر از ۵ باشد.' }),
  comment: z.string()
    .max(1500, { message: 'نظر نمی‌تواند بیشتر از ۱۵۰۰ کاراکتر باشد.' })
    .optional()
    .nullable(),
  // order_id, user_id, and chef_id will be determined server-side or from path params
});

export type TReviewSubmissionRequest = z.infer<typeof ReviewSubmissionSchema>;
