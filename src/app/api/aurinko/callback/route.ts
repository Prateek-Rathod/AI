import { getAccountDetails, getAurinkoToken } from "@/lib/aurinko";
import { db } from "@/server/db";
import { auth } from "@clerk/nextjs/server";
import axios from "axios";
import { type NextRequest, NextResponse } from "next/server";

export const GET = async (req: NextRequest) => {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

    const params = req.nextUrl.searchParams;
    const status = params.get("status");
    if (status !== "success")
        return NextResponse.json({ error: "Account connection failed" }, { status: 400 });

    const code = params.get("code");
    const token = await getAurinkoToken(code as string);
    if (!token) return NextResponse.json({ error: "Failed to fetch token" }, { status: 400 });

    const accountDetails = await getAccountDetails(token.accessToken);

    await db.account.upsert({
        where: { id: token.accountId.toString() },
        create: {
            id: token.accountId.toString(),
            userId,
            token: token.accessToken,
            provider: "Aurinko",
            emailAddress: accountDetails.email,
            name: accountDetails.name
        },
        update: {
            token: token.accessToken
        }
    });

    // Use req.waitUntil if supported (Edge runtime)
    if (typeof req.waitUntil === "function") {
        req.waitUntil(
            axios
                .post(`${process.env.NEXT_PUBLIC_URL}/api/initial-sync`, {
                    accountId: token.accountId.toString(),
                    userId
                })
                .catch((err) => {
                    console.log(err.response?.data);
                })
        );
    } else {
        // Fallback if not Edge
        axios
            .post(`${process.env.NEXT_PUBLIC_URL}/api/initial-sync`, {
                accountId: token.accountId.toString(),
                userId
            })
            .catch((err) => {
                console.log(err.response?.data);
            });
    }

    return NextResponse.redirect(new URL("/mail", req.url));
};
