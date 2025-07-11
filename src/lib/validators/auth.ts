import { z } from 'zod';

export const SignupValidator = z.object({
  email: z.string().email({ message: 'ایمیل نامعتبر است.' }),
  password: z.string().min(8, { message: 'رمز عبور باید حداقل ۸ کاراکتر باشد.' }),
  fullName: z.string().min(3, { message: 'نام و نام خانوادگی نمی‌تواند خالی باشد.' }),
  phoneNumber: z.string().optional(), // شماره تلفن اختیاری است
  role: z.enum(['user', 'chef'], { message: 'نقش انتخاب شده معتبر نیست.' }),
});

export type TSignupRequest = z.infer<typeof SignupValidator>;

export const LoginValidator = z.object({
  identifier: z.string().min(1, { message: "ایمیل یا شماره موبایل نمی‌تواند خالی باشد."}), // Can be email or phone
  password: z.string().min(1, { message: "رمز عبور نمی‌تواند خالی باشد."}),
});

export type TLoginRequest = z.infer<typeof LoginValidator>;
