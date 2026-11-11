-- One identity can belong to many teams, but only once per team.
CREATE UNIQUE INDEX "merchant_members_merchant_id_auth_user_id_key" ON "merchant_members"("merchant_id", "auth_user_id");
CREATE TABLE "merchant_invitations" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "merchant_id" UUID NOT NULL REFERENCES "merchants"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  "email" VARCHAR(320) NOT NULL,
  "role" "MerchantRole" NOT NULL DEFAULT 'VIEWER',
  "invited_by" UUID NOT NULL,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expires_at" TIMESTAMPTZ(3) NOT NULL,
  "accepted_at" TIMESTAMPTZ(3),
  "revoked_at" TIMESTAMPTZ(3),
  CONSTRAINT "merchant_invitations_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "merchant_invitations_email_expires_at_idx" ON "merchant_invitations"("email", "expires_at");
CREATE INDEX "merchant_invitations_merchant_id_idx" ON "merchant_invitations"("merchant_id");
-- Browser clients access invitations through the authenticated API only.
ALTER TABLE "merchant_invitations" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "merchant_invitations" FORCE ROW LEVEL SECURITY;
