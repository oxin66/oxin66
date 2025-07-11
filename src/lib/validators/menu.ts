import { z } from 'zod';

export const MenuItemSchema = z.object({
  name: z.string()
    .min(3, { message: 'نام آیتم منو باید حداقل ۳ کاراکتر باشد.' })
    .max(150, { message: 'نام آیتم منو نمی‌تواند بیشتر از ۱۵۰ کاراکتر باشد.' }),
  description: z.string()
    .max(1000, { message: 'توضیحات نمی‌تواند بیشتر از ۱۰۰۰ کاراکتر باشد.' })
    .optional()
    .nullable(),
  price: z.preprocess(
    (val) => parseFloat(String(val)),
    z.number({ required_error: 'قیمت الزامی است.', invalid_type_error: 'قیمت باید یک عدد باشد.' })
     .min(0, { message: 'قیمت نمی‌تواند منفی باشد.' })
  ),
  category: z.string()
    .max(50, { message: 'دسته‌بندی نمی‌تواند بیشتر از ۵۰ کاراکتر باشد.' })
    .optional()
    .nullable(),
  image_url: z.string()
    .url({ message: 'آدرس تصویر نامعتبر است.' })
    .max(2048, { message: 'آدرس تصویر بسیار طولانی است.'})
    .optional()
    .nullable(),
  is_available: z.boolean().default(true).optional(),
  tags: z.array(z.string().max(30, { message: 'هر تگ نمی‌تواند بیشتر از ۳۰ کاراکتر باشد.' }))
    .max(10, { message: 'حداکثر ۱۰ تگ مجاز است.' })
    .optional()
    .nullable(),
  preparation_time_minutes: z.preprocess(
    (val) => (val ? parseInt(String(val), 10) : undefined),
    z.number({ invalid_type_error: 'زمان آماده‌سازی باید یک عدد صحیح باشد.' })
     .int()
     .min(0, { message: 'زمان آماده‌سازی نمی‌تواند منفی باشد.' })
     .optional()
     .nullable(),
  )
});

// For PATCH, all fields are optional
export const PartialMenuItemSchema = MenuItemSchema.partial();

export type TMenuItemRequest = z.infer<typeof MenuItemSchema>;
export type TPartialMenuItemRequest = z.infer<typeof PartialMenuItemSchema>;
