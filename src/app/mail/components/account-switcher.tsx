"use client";

import * as React from "react";

import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { api } from "@/trpc/react";
import { useLocalStorage } from "usehooks-ts";
import { Plus } from "lucide-react";
import { getAurinkoAuthorizationUrl } from "@/lib/aurinko";
import { toast } from "sonner";

interface AccountSwitcherProps {
  isCollapsed: boolean;
}

export function AccountSwitcher({ isCollapsed }: AccountSwitcherProps) {
  const { data: accounts, isLoading } = api.mail.getAccounts.useQuery();

  // IMPORTANT: default is null (NOT empty string)
  const [accountId, setAccountId] = useLocalStorage<string | null>(
    "accountId",
    null
  );

  // Auto-select first account safely
  React.useEffect(() => {
    if (isLoading) return;

    if (accounts && accounts.length > 0) {
      // If we DO have an account loaded but no selected ID, set the first
      if (!accountId) {
        setAccountId(accounts[0].id);
      }
      return;
    }

    if (accounts && accounts.length === 0) {
      toast("Link an account to continue", {
        action: {
          label: "Add account",
          onClick: async () => {
            try {
              const url = await getAurinkoAuthorizationUrl("Google");
              window.location.href = url;
            } catch (error) {
              toast.error((error as Error).message);
            }
          },
        },
      });
    }
  }, [accounts, isLoading, accountId, setAccountId]);

  // Don't render until accounts + accountId are ready
  if (isLoading || !accounts) return null;

  return (
    <div className="items-center gap-2 flex w-full">
      <Select
        value={accountId ?? undefined}
        onValueChange={(value) => setAccountId(value)}
      >
        <SelectTrigger
          className={cn(
            "flex w-full flex-1 items-center gap-2 [&>span]:line-clamp-1 [&>span]:flex [&>span]:w-full [&>span]:items-center [&>span]:gap-1 [&>span]:truncate [&_svg]:h-4 [&_svg]:w-4 [&_svg]:shrink-0",
            isCollapsed &&
              "flex h-9 w-9 shrink-0 items-center justify-center p-0 [&>span]:w-auto [&>svg]:hidden"
          )}
          aria-label="Select account"
        >
          <SelectValue placeholder="Select an account">
            <span className={cn({ hidden: !isCollapsed })}>
              {accounts.find((a) => a.id === accountId)?.emailAddress?.[0]}
            </span>
            <span className={cn("ml-2", isCollapsed && "hidden")}>
              {accounts.find((a) => a.id === accountId)?.emailAddress}
            </span>
          </SelectValue>
        </SelectTrigger>

        <SelectContent>
          {accounts.map((account) => (
            <SelectItem key={account.id} value={account.id}>
              <div className="flex items-center gap-3">
                {account.emailAddress}
              </div>
            </SelectItem>
          ))}

          <div
            onClick={async () => {
              try {
                const url = await getAurinkoAuthorizationUrl("Google");
                window.location.href = url;
              } catch (error) {
                toast.error((error as Error).message);
              }
            }}
            className="relative flex hover:bg-gray-50 w-full cursor-pointer items-center rounded-sm py-1.5 pl-2 pr-8 text-sm"
          >
            <Plus className="size-4 mr-1" />
            Add account
          </div>
        </SelectContent>
      </Select>
    </div>
  );
}
