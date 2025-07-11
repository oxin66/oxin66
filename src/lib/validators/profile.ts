import { z } from 'zod';

export const ProfileUpdateSchema = z.object({
  full_name: z.string()
    .min(3, { message: 'نام و نام خانوادگی باید حداقل ۳ کاراکتر باشد.' })
    .max(100, { message: 'نام و نام خانوادگی نمی‌تواند بیشتر از ۱۰۰ کاراکتر باشد.' })
    .optional(),
  phone_number: z.string()
    .regex(/^09[0-9]{9}$/, { message: 'شماره موبایل نامعتبر است. مثال: 09123456789' })
    .optional()
    .nullable(),
  bio: z.string()
    .max(500, { message: 'بیوگرافی نمی‌تواند بیشتر از ۵۰۰ کاراکتر باشد.' })
    .optional()
    .nullable(),
  avatar_url: z.string()
    .url({ message: 'آدرس تصویر پروفایل نامعتبر است.' })
    .optional()
    .nullable(),

  // Fields specific to chefs (should only be updatable if user is a chef)
  kitchen_name: z.string()
    .max(100, { message: 'نام آشپزخانه نمی‌تواند بیشتر از ۱۰۰ کاراکتر باشد.' })
    .optional()
    .nullable(),
  specialties: z.array(z.string().max(50, { message: 'هر تخصص نمی‌تواند بیشتر از ۵۰ کاراکتر باشد.' }))
    .max(10, { message: 'حداکثر ۱۰ تخصص می‌توانید وارد کنید.' })
    .optional()
    .nullable(),
});

export type TProfileUpdateRequest = z.infer<typeof ProfileUpdateSchema>;
