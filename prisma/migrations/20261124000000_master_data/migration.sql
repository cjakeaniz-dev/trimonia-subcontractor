CREATE TYPE "MasterDataKind" AS ENUM ('UNIT', 'SUPPLIER', 'LOCATION');

CREATE TABLE "MasterData" (
    "id" UUID NOT NULL,
    "kind" "MasterDataKind" NOT NULL,
    "name" TEXT NOT NULL,
    "nameKey" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT "MasterData_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "MasterData_kind_nameKey_key" ON "MasterData"("kind", "nameKey");

INSERT INTO "MasterData" ("id", "kind", "name", "nameKey")
SELECT gen_random_uuid(), 'UNIT', name, lower(name)
FROM unnest(ARRAY['bag','meter','liter','piece','kg','gram','roll','box','set','pair','sheet','bundle','square meter','cubic meter','hour','day','lot']) AS units(name);

INSERT INTO "MasterData" ("id", "kind", "name", "nameKey", "isActive")
SELECT gen_random_uuid(), 'UNIT', min("unit"), lower("unit"), false
FROM "ExpenseItem"
GROUP BY lower("unit")
ON CONFLICT ("kind", "nameKey") DO NOTHING;

INSERT INTO "MasterData" ("id", "kind", "name", "nameKey")
SELECT gen_random_uuid(), 'LOCATION', min("location"), lower("location")
FROM "Project"
GROUP BY lower("location");
