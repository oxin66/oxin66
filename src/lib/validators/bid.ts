import { z } from 'zod';

export const BidCreationSchema = z.object({
  bid_amount: z.preprocess(
    (val) => parseFloat(String(val)),
    z.number({ required_error: 'مبلغ پیشنهاد الزامی است.', invalid_type_error: 'مبلغ پیشنهاد باید یک عدد باشد.' })
     .positive({ message: 'مبلغ پیشنهاد باید بیشتر از صفر باشد.' })
  ),
  estimated_delivery_time_minutes: z.preprocess(
    (val) => (val ? parseInt(String(val), 10) : undefined),
    z.number({ invalid_type_error: 'زمان تخمینی تحویل باید یک عدد باشد.' })
     .int()
     .positive({ message: 'زمان تخمینی تحویل باید بیشتر از صفر باشد.' })
     .optional()
  ),
  chef_notes: z.string().max(1000, { message: 'یادداشت آشپز نمی‌تواند بیشتر از ۱۰۰۰ کاراکتر باشد.' }).optional(),
});

export type TBidCreationRequest = z.infer<typeof BidCreationSchema>;


export const BidUpdateStatusSchema = z.object({
    status: z.enum(['accepted', 'rejected', 'withdrawn_by_chef'], {
        required_error: "وضعیت جدید پیشنهاد الزامی است.",
        invalid_type_error: "مقدار وضعیت نامعتبر است."
    })
});

export type TBidUpdateStatusRequest = z.infer<typeof BidUpdateStatusSchema>;
