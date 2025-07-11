import { z } from 'zod';

export const ChefVerificationStatusSchema = z.object({
  verification_status: z.enum(
    ['pending_review', 'approved', 'rejected', 'needs_more_info'],
    {
      required_error: "وضعیت تأیید الزامی است.",
      invalid_type_error: "مقدار وضعیت تأیید نامعتبر است. مقادیر مجاز: pending_review, approved, rejected, needs_more_info",
    }
  ),
  // Optionally, admin can provide a reason, especially for rejection or needs_more_info
  admin_notes: z.string().max(500, "یادداشت ادمین نمی‌تواند بیشتر از ۵۰۰ کاراکتر باشد.").optional(),
});

export type TChefVerificationStatusRequest = z.infer<typeof ChefVerificationStatusSchema>;
