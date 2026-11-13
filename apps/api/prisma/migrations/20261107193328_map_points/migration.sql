-- CreateTable
CREATE TABLE "MapPoint" (
    "id" TEXT NOT NULL,
    "mapId" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "position" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MapPoint_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MapPoint_mapId_position_idx" ON "MapPoint"("mapId", "position");

-- CreateIndex
CREATE UNIQUE INDEX "MapPoint_mapId_position_key" ON "MapPoint"("mapId", "position");

-- AddForeignKey
ALTER TABLE "MapPoint" ADD CONSTRAINT "MapPoint_mapId_fkey" FOREIGN KEY ("mapId") REFERENCES "Map"("id") ON DELETE CASCADE ON UPDATE CASCADE;
