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

export const UserUpdateByAdminSchema = z.object({
  full_name: z.string()
    .min(3, { message: 'نام و نام خانوادگی باید حداقل ۳ کاراکتر باشد.' })
    .max(100)
    .optional(),
  phone_number: z.string()
    .regex(/^09[0-9]{9}$/, { message: 'شماره موبایل نامعتبر است.' })
    .optional()
    .nullable(),
  role: z.enum(['user', 'chef', 'admin'], { invalid_type_error: "نقش انتخاب شده معتبر نیست."}).optional(),
  // For chefs, admin can also update verification_status via this endpoint if desired, or use the dedicated one
  verification_status: z.enum(['pending_review', 'approved', 'rejected', 'needs_more_info']).optional(),
  account_status: z.enum(['active', 'suspended', 'banned_by_admin', 'pending_deletion'], { invalid_type_error: "وضعیت حساب نامعتبر است."}).optional(),
  // Admin notes can be part of this update too
  admin_general_notes: z.string().max(1000, "یادداشت ادمین نمی‌تواند بیشتر از ۱۰۰۰ کاراکتر باشد.").optional().nullable(),
});

export type TUserUpdateByAdminRequest = z.infer<typeof UserUpdateByAdminSchema>;

// Validator for updating order status by admin
export const OrderStatusUpdateByAdminSchema = z.object({
  status: z.string().min(1, { message: "وضعیت سفارش نمی‌تواند خالی باشد." }),
  admin_reason: z.string().max(500, "دلیل تغییر وضعیت نمی‌تواند بیشتر از ۵۰۰ کاراکتر باشد.").optional().nullable(),
});

export type TOrderStatusUpdateByAdminRequest = z.infer<typeof OrderStatusUpdateByAdminSchema>;

// Validator for updating a review by admin
export const ReviewUpdateByAdminSchema = z.object({
  rating: z.number()
    .int()
    .min(1, { message: 'امتیاز نمی‌تواند کمتر از ۱ باشد.' })
    .max(5, { message: 'امتیاز نمی‌تواند بیشتر از ۵ باشد.' })
    .optional(),
  comment: z.string()
    .max(1500, { message: 'نظر نمی‌تواند بیشتر از ۱۵۰۰ کاراکتر باشد.' })
    .optional()
    .nullable(),
  is_public: z.boolean({invalid_type_error: "مقدار نمایش عمومی باید true یا false باشد."}).optional(),
  admin_moderation_notes: z.string().max(500, "یادداشت بررسی ادمین نمی‌تواند بیشتر از ۵۰۰ کاراکتر باشد.").optional().nullable(),
});

export type TReviewUpdateByAdminRequest = z.infer<typeof ReviewUpdateByAdminSchema>;
