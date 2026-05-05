"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut, User as UserIcon, Settings, Mail, ShieldCheck } from "lucide-react";
import { logoutAction } from "@/lib/auth-actions";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { InvitationsDialog } from "@/components/header/InvitationsDialog";

type Props = {
  user: { name?: string | null; email?: string | null; role?: "seed" | "member" };
  shareableCities: { id: string; name: string }[];
};

export function UserMenu({ user, shareableCities }: Props) {
  const initial = (user.name ?? user.email ?? "?").trim().charAt(0).toUpperCase();
  const router = useRouter();
  const [invitationsOpen, setInvitationsOpen] = useState(false);

  return (
    <div className="absolute top-3 right-3 z-40">
      <DropdownMenu>
        <DropdownMenuTrigger
          aria-label="Cuenta"
          className="rounded-full border border-[var(--hairline)] bg-white shadow-[var(--shadow-card)] transition-shadow hover:shadow-md"
        >
          <Avatar className="h-10 w-10">
            <AvatarFallback className="bg-[var(--ink)] text-white font-medium">
              {initial}
            </AvatarFallback>
          </Avatar>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuGroup>
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
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => {
              // El menú se cierra al click; diferimos el open del Dialog para
              // que no compita con el cierre del popup.
              setTimeout(() => setInvitationsOpen(true), 0);
            }}
          >
            <Mail /> Invitaciones
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => router.push("/profile")}>
            <UserIcon /> Perfil
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => router.push("/change-password")}>
            <Settings /> Cambiar contraseña
          </DropdownMenuItem>
          {user.role === "seed" && (
            <DropdownMenuItem onClick={() => router.push("/admin/users")}>
              <ShieldCheck /> Usuarios (admin)
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => {
              logoutAction();
            }}
            className="text-red-600 focus:text-red-600"
          >
            <LogOut /> Salir
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <InvitationsDialog
        open={invitationsOpen}
        onOpenChange={setInvitationsOpen}
        cities={shareableCities}
      />
    </div>
  );
}
