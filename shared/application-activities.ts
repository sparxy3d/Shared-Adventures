import { z } from "zod";
import { CATEGORY_VALUES } from "./catalog";
import { CONTACT_DETAILS_MESSAGE, containsContactDetails } from "./contact-policy";

export const GROUP_SIZE_VALUES = ["1", "2", "3-5", "6+"] as const;
export const applicationActivitySchema = z.object({
  name: z.string().trim().min(1, "Enter an activity name.").max(60, "Keep the activity name to 60 characters.")
    .refine(value => !containsContactDetails(value), CONTACT_DETAILS_MESSAGE),
  category: z.enum(CATEGORY_VALUES, { errorMap: () => ({ message: "Choose a category." }) }),
  priceAmount: z.number().int("Enter whole rupees.").min(0).max(10_000_000),
  differentVisitorPrice: z.boolean(),
  visitorPriceUsd: z.number().int("Enter whole dollars.").min(0).max(1_000_000).nullable(),
  groupSizes: z.array(z.enum(GROUP_SIZE_VALUES)).min(1, "Choose at least one typical group size.").max(4),
  description: z.string().trim().max(300, "Keep the description to 300 characters.")
    .refine(value => !containsContactDetails(value), CONTACT_DETAILS_MESSAGE).default(""),
}).strict().superRefine((activity, context) => {
  if (activity.differentVisitorPrice && activity.visitorPriceUsd == null) {
    context.addIssue({ code: "custom", path: ["visitorPriceUsd"], message: "Enter the visitor price in whole US dollars." });
  }
  if (!activity.differentVisitorPrice && activity.visitorPriceUsd != null) {
    context.addIssue({ code: "custom", path: ["visitorPriceUsd"], message: "Turn on different visitor pricing or leave its price empty." });
  }
});
export const applicationActivitiesSchema = z.array(applicationActivitySchema).min(1).max(10);
export type ApplicationActivity = z.infer<typeof applicationActivitySchema>;
