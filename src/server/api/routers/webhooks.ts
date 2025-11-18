import { z } from "zod"
import { createTRPCRouter, protectedProcedure } from "../trpc"
import { authoriseAccountAccess } from "./mail"
import Account from "@/lib/account"

const accountIdSchema = z.string().min(1, "accountId is required")

export const webhooksRouter = createTRPCRouter({
  getWebhooks: protectedProcedure
    .input(
      z.object({
        accountId: accountIdSchema
      })
    )
    .query(async ({ ctx, input }) => {
      const acc = await authoriseAccountAccess(input.accountId, ctx.auth.userId)
      const account = new Account(acc.token)
      return await account.getWebhooks()
    }),

  createWebhook: protectedProcedure
    .input(
      z.object({
        accountId: accountIdSchema,
        notificationUrl: z.string().min(1, "notificationUrl is required")
      })
    )
    .mutation(async ({ ctx, input }) => {
      const acc = await authoriseAccountAccess(input.accountId, ctx.auth.userId)
      const account = new Account(acc.token)
      return await account.createWebhook("/email/messages", input.notificationUrl)
    }),

  deleteWebhook: protectedProcedure
    .input(
      z.object({
        accountId: accountIdSchema,
        webhookId: z.string().min(1, "webhookId is required")
      })
    )
    .mutation(async ({ ctx, input }) => {
      const acc = await authoriseAccountAccess(input.accountId, ctx.auth.userId)
      const account = new Account(acc.token)
      return await account.deleteWebhook(input.webhookId)
    })
})
