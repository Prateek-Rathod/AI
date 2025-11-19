'use server';

import axios from 'axios';
import type { EmailMessage } from './types';
import { auth, currentUser } from '@clerk/nextjs/server';
import { getSubscriptionStatus } from './stripe-actions';
import { db } from '@/server/db';
import { FREE_ACCOUNTS_PER_USER, PRO_ACCOUNTS_PER_USER } from '@/app/constants';

/**
 * Build Aurinko OAuth authorization URL
 */
export const getAurinkoAuthorizationUrl = async (
  serviceType: 'Google' | 'Office365'
) => {
  const { userId } = await auth();
  if (!userId) throw new Error('User not found');

  // find user
  let user = await db.user.findUnique({
    where: { id: userId },
    select: { id: true, role: true, emailAddress: true }
  });

  // create user if missing
  if (!user) {
    const clerk = await currentUser();
    if (!clerk) throw new Error('User not found in Clerk');

    const email = clerk.emailAddresses[0]?.emailAddress ?? 'unknown@example.com';

    user = await db.user.create({
      data: {
        id: userId,
        emailAddress: email,
        role: 'user'
      }
    });
  }

  // subscription limits
  const isSubscribed = await getSubscriptionStatus();
  const accounts = await db.account.count({ where: { userId } });

  if (user.role === 'user') {
    if (isSubscribed && accounts >= PRO_ACCOUNTS_PER_USER) {
      throw new Error('You reached your PRO account limit');
    }
    if (!isSubscribed && accounts >= FREE_ACCOUNTS_PER_USER) {
      throw new Error('You reached your FREE account limit');
    }
  }

  const params = new URLSearchParams({
    clientId: process.env.AURINKO_CLIENT_ID as string,
    serviceType,
    scopes: 'Mail.Read Mail.ReadWrite Mail.Send Mail.Drafts Mail.All',
    responseType: 'code',
    returnUrl: `${process.env.NEXT_PUBLIC_URL}/api/aurinko/callback`
  });

  return `https://api.aurinko.io/v1/auth/authorize?${params.toString()}`;
};

/**
 * Exchange authorization code for Aurinko access token
 */
export const getAurinkoToken = async (code: string) => {
  try {
    const res = await axios.post('https://api.aurinko.io/v1/auth/token', {
      clientId: process.env.AURINKO_CLIENT_ID,
      clientSecret: process.env.AURINKO_CLIENT_SECRET,
      code,
      grantType: 'authorization_code'
    });

    return res.data; // accessToken, accountId, expiresIn...
  } catch (err: any) {
    console.log('Aurinko token error:', err.response?.data);
    return null;
  }
};

/**
 * Fetch account details (email, name, etc.)
 */
export const getAccountDetails = async (accessToken: string) => {
  try {
    const res = await axios.get('https://api.aurinko.io/v1/account', {
      headers: { Authorization: `Bearer ${accessToken}` }
    });

    return res.data;
  } catch (err: any) {
    console.log('Aurinko account details error:', err.response?.data);
    throw new Error('Failed to fetch account details');
  }
};

export { getSubscriptionStatus };
