'use server'
import axios from 'axios'
import type { EmailMessage } from './types'
import { auth, currentUser } from '@clerk/nextjs/server'
import { getSubscriptionStatus } from './stripe-actions'
import { db } from '@/server/db'
import { FREE_ACCOUNTS_PER_USER, PRO_ACCOUNTS_PER_USER } from '@/app/constants'

export const getAurinkoAuthorizationUrl = async (serviceType: 'Google' | 'Office365') => {
    const { userId } = await auth()
    if (!userId) throw new Error('User not found')

    // 1. try to find user in DB
    let user = await db.user.findUnique({
        where: { id: userId },
        select: { id: true, role: true, emailAddress: true }
    })

    // 2. if not found, fetch Clerk user and create DB user
    if (!user) {
        const clerk = await currentUser()
        if (!clerk) throw new Error("User not found in Clerk")

        const email = clerk.emailAddresses[0]?.emailAddress ?? "unknown@example.com"

        user = await db.user.create({
            data: {
                id: userId,
                emailAddress: email,
                role: 'user'
            }
        })
    }

    // subscription logic
    const isSubscribed = await getSubscriptionStatus()

    const accounts = await db.account.count({
        where: { userId }
    })

    if (user.role === 'user') {
        if (isSubscribed && accounts >= PRO_ACCOUNTS_PER_USER) {
            throw new Error('You reached your PRO account limit')
        }
        if (!isSubscribed && accounts >= FREE_ACCOUNTS_PER_USER) {
            throw new Error('You reached your FREE account limit')
        }
    }

    const params = new URLSearchParams({
        clientId: process.env.AURINKO_CLIENT_ID as string,
        serviceType,
        scopes: 'Mail.Read Mail.ReadWrite Mail.Send Mail.Drafts Mail.All',
        responseType: 'code',
        returnUrl: `${process.env.NEXT_PUBLIC_URL}/api/aurinko/callback`
    })

    return `https://api.aurinko.io/v1/auth/authorize?${params.toString()}`
}
