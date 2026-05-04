"use client";

import { LogOut, User as UserIcon, Settings } from "lucide-react";
import { logoutAction } from "@/lib/auth-actions";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type Props = {
  user: { name?: string | null; email?: string | null; role?: "seed" | "member" };
};

export function UserMenu({ user }: Props) {
  const initial = (user.name ?? user.email ?? "?").trim().charAt(0).toUpperCase();

  return (
    <div className="absolute top-3 right-3 z-40">
      <DropdownMenu>
        <DropdownMenuTrigger
          aria-label="Cuenta"
          className="rounded-full border border-zinc-200 bg-white shadow-md hover:shadow-lg transition-shadow"
        >
          <Avatar className="h-10 w-10">
            <AvatarFallback className="bg-zinc-900 text-white font-medium">
              {initial}
            </AvatarFallback>
          </Avatar>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel className="font-normal">
            <div className="flex flex-col gap-0.5">
              <span className="text-sm font-medium">{user.name ?? "Usuario"}</span>
              <span className="text-xs text-zinc-500 truncate">{user.email}</span>
              {user.role === "seed" && (
                <span className="text-[10px] uppercase tracking-wide text-amber-600 font-medium mt-0.5">
                  seed
                </span>
              )}
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem disabled>
            <UserIcon /> Perfil
          </DropdownMenuItem>
          <DropdownMenuItem disabled>
            <Settings /> Cambiar contraseña
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onSelect={(e) => {
              e.preventDefault();
              logoutAction();
            }}
            className="text-red-600 focus:text-red-600"
          >
            <LogOut /> Salir
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
