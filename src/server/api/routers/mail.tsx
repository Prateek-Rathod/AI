// src/server/api/routers/mail.ts
import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { db } from "@/server/db";
import type { Prisma } from "@prisma/client";
import { FREE_CREDITS_PER_DAY } from "@/app/constants";

// Auth helper
export const authoriseAccountAccess = async (accountId: string, userId: string) => {
  const account = await db.account.findFirst({
    where: { id: accountId, userId },
    select: { id: true, emailAddress: true, name: true, token: true },
  });
  if (!account) throw new Error("Invalid token");
  return account;
};

// Filters
const inboxFilter = (accountId: string): Prisma.ThreadWhereInput => ({ accountId, inboxStatus: true });
const sentFilter = (accountId: string): Prisma.ThreadWhereInput => ({ accountId, sentStatus: true });
const draftFilter = (accountId: string): Prisma.ThreadWhereInput => ({ accountId, draftStatus: true });

export const mailRouter = createTRPCRouter({
  // --------------------------
  // Get all accounts
  // --------------------------
  getAccounts: protectedProcedure.query(async ({ ctx }) => {
    return await ctx.db.account.findMany({
      where: { userId: ctx.auth.userId },
      select: { id: true, emailAddress: true, name: true },
    });
  }),

  // --------------------------
  // FIXED: getMyAccount
  // --------------------------
  getMyAccount: protectedProcedure
    .input(
      z.object({
        accountId: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      if (!input.accountId) return null;

      const account = await ctx.db.account.findFirst({
        where: { id: input.accountId, userId: ctx.auth.userId },
        select: { id: true, emailAddress: true, name: true },
      });

      if (!account) throw new Error("Invalid token");

      return account;
    }),

  // --------------------------
  // Get number of threads
  // --------------------------
  getNumThreads: protectedProcedure
    .input(z.object({ accountId: z.string(), tab: z.string() }))
    .query(async ({ ctx, input }) => {
      const account = await authoriseAccountAccess(input.accountId, ctx.auth.userId);
      let filter: Prisma.ThreadWhereInput = {};

      if (input.tab === "inbox") filter = inboxFilter(account.id);
      else if (input.tab === "sent") filter = sentFilter(account.id);
      else if (input.tab === "drafts") filter = draftFilter(account.id);

      return await ctx.db.thread.count({ where: filter });
    }),

  // --------------------------
  // Get threads with emails
  // --------------------------
  getThreads: protectedProcedure
    .input(z.object({ accountId: z.string(), tab: z.string(), done: z.boolean() }))
    .query(async ({ ctx, input }) => {
      const account = await authoriseAccountAccess(input.accountId, ctx.auth.userId);

      let filter: Prisma.ThreadWhereInput = {};
      if (input.tab === "inbox") filter = inboxFilter(account.id);
      else if (input.tab === "sent") filter = sentFilter(account.id);
      else if (input.tab === "drafts") filter = draftFilter(account.id);

      filter.done = { equals: input.done };

      return await ctx.db.thread.findMany({
        where: filter,
        include: {
          emails: {
            orderBy: { sentAt: "asc" },
            select: {
              from: true,
              body: true,
              bodySnippet: true,
              emailLabel: true,
              sysLabels: true,
              id: true,
              sentAt: true,
            },
          },
        },
        take: 15,
        orderBy: { lastMessageDate: "desc" },
      });
    }),

  // --------------------------
  // Get remaining AI credits
  // --------------------------
  getChatbotInteraction: protectedProcedure.query(async ({ ctx }) => {
    const today = new Date().toISOString().split("T")[0];

    const interaction = await ctx.db.chatbotInteraction.findUnique({
      where: { day_userId: { day: today, userId: ctx.auth.userId } },
      select: { count: true },
    });

    return {
      remainingCredits: FREE_CREDITS_PER_DAY - (interaction?.count || 0),
    };
  }),
});
