-- CreateTable
CREATE TABLE "MapRoute" (
    "id" TEXT NOT NULL,
    "mapId" TEXT NOT NULL,
    "geometry" JSONB,
    "costing" VARCHAR(40) NOT NULL DEFAULT 'auto',
    "calculatedAt" TIMESTAMP(3),
    "error" VARCHAR(500),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MapRoute_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MapRoute_mapId_key" ON "MapRoute"("mapId");

-- AddForeignKey
ALTER TABLE "MapRoute" ADD CONSTRAINT "MapRoute_mapId_fkey" FOREIGN KEY ("mapId") REFERENCES "Map"("id") ON DELETE CASCADE ON UPDATE CASCADE;
