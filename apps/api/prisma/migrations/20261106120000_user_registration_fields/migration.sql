ALTER TABLE "User" ADD COLUMN "name" TEXT;
ALTER TABLE "User" ADD COLUMN "cpfHash" CHAR(64);

CREATE UNIQUE INDEX "User_cpfHash_key" ON "User"("cpfHash");
