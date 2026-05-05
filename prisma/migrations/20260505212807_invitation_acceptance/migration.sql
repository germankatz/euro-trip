-- CreateTable
CREATE TABLE "InvitationAcceptance" (
    "invitationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "acceptedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InvitationAcceptance_pkey" PRIMARY KEY ("invitationId","userId")
);

-- CreateIndex
CREATE INDEX "InvitationAcceptance_invitationId_idx" ON "InvitationAcceptance"("invitationId");

-- CreateIndex
CREATE INDEX "InvitationAcceptance_userId_idx" ON "InvitationAcceptance"("userId");

-- AddForeignKey
ALTER TABLE "InvitationAcceptance" ADD CONSTRAINT "InvitationAcceptance_invitationId_fkey" FOREIGN KEY ("invitationId") REFERENCES "Invitation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvitationAcceptance" ADD CONSTRAINT "InvitationAcceptance_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
