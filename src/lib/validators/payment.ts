import { z } from 'zod';

export const PaymentRequestSchema = z.object({
  orderId: z.string().uuid({ message: 'شناسه سفارش نامعتبر است.' }),
});

export type TPaymentRequest = z.infer<typeof PaymentRequestSchema>;

// برای verify، زرین پال پارامترها را در query string می فرستد، بنابراین نیازی به Zod schema برای body نیست.
// اما می توان برای پارامترهای query یک schema تعریف کرد اگر بخواهیم آنها را اعتبارسنجی کنیم.
export const ZarinpalVerifyQuerySchema = z.object({
    Status: z.string(), // 'OK' or 'NOK'
    Authority: z.string(),
});

export type TZarinpalVerifyQuery = z.infer<typeof ZarinpalVerifyQuerySchema>;
