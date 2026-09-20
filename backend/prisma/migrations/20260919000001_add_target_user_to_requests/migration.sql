-- AlterTable
ALTER TABLE "requests" ADD COLUMN "target_user_id" UUID;

-- CreateIndex
CREATE INDEX "requests_target_user_id_idx" ON "requests"("target_user_id");

-- AddForeignKey
ALTER TABLE "requests" ADD CONSTRAINT "requests_target_user_id_fkey" FOREIGN KEY ("target_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
