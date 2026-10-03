import { z } from 'zod';
import { SUPPORTED_TOPICS } from '../config/feeds.js';

export const updatePreferencesSchema = z.object({
  topics: z
    .array(z.string().min(1).max(50))
    .min(1, 'Select at least one topic')
    .max(20, 'Maximum 20 topics allowed')
    .optional(),
  frequency: z.enum(['realtime', 'daily', 'weekly']).optional(),
  alertThreshold: z.enum(['all', 'high', 'critical']).optional(),
  timezone: z.string().max(50).optional(),
});

export const paginationSchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

export { SUPPORTED_TOPICS };
export type UpdatePreferencesInput = z.infer<typeof updatePreferencesSchema>;
