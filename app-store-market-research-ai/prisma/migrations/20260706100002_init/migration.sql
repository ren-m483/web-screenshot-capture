-- CreateTable
CREATE TABLE "Storefront" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "defaultLang" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Genre" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "parentId" TEXT,
    "type" TEXT NOT NULL DEFAULT 'app',
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "App" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "bundleId" TEXT,
    "name" TEXT NOT NULL,
    "developerName" TEXT,
    "sellerName" TEXT,
    "primaryGenreId" TEXT,
    "primaryGenreName" TEXT,
    "genreIds" TEXT,
    "genres" TEXT,
    "price" REAL,
    "formattedPrice" TEXT,
    "currency" TEXT,
    "averageUserRating" REAL,
    "userRatingCount" INTEGER,
    "version" TEXT,
    "releaseDate" DATETIME,
    "currentVersionReleaseDate" DATETIME,
    "description" TEXT,
    "screenshotUrls" TEXT,
    "ipadScreenshotUrls" TEXT,
    "artworkUrl100" TEXT,
    "trackViewUrl" TEXT,
    "contentAdvisoryRating" TEXT,
    "rawLookupJson" TEXT,
    "lastLookupAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "RankingSnapshot" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "storefrontId" TEXT NOT NULL,
    "genreId" TEXT,
    "chartType" TEXT NOT NULL,
    "limit" INTEGER NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'apple_rss',
    "sourceUrlHash" TEXT NOT NULL,
    "fetchedAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "RankingEntry" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "snapshotId" TEXT NOT NULL,
    "appId" TEXT NOT NULL,
    "rank" INTEGER NOT NULL,
    "appNameAtFetch" TEXT NOT NULL,
    "developerNameAtFetch" TEXT,
    "rawEntryJson" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RankingEntry_snapshotId_fkey" FOREIGN KEY ("snapshotId") REFERENCES "RankingSnapshot" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "RankingEntry_appId_fkey" FOREIGN KEY ("appId") REFERENCES "App" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AppMetric" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "appId" TEXT NOT NULL,
    "storefrontId" TEXT NOT NULL,
    "averageUserRating" REAL,
    "userRatingCount" INTEGER,
    "price" REAL,
    "formattedPrice" TEXT,
    "version" TEXT,
    "capturedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AppMetric_appId_fkey" FOREIGN KEY ("appId") REFERENCES "App" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Review" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "appId" TEXT NOT NULL,
    "sourceType" TEXT NOT NULL,
    "territory" TEXT,
    "lang" TEXT,
    "rating" INTEGER,
    "title" TEXT,
    "body" TEXT NOT NULL,
    "author" TEXT,
    "reviewCreatedAt" DATETIME,
    "sentiment" TEXT,
    "categories" TEXT,
    "rawJson" TEXT,
    "fetchedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Review_appId_fkey" FOREIGN KEY ("appId") REFERENCES "App" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Analysis" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "analysisType" TEXT NOT NULL,
    "targetType" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "inputHash" TEXT NOT NULL,
    "promptVersion" TEXT NOT NULL,
    "modelName" TEXT NOT NULL,
    "scoreJson" TEXT,
    "resultJson" TEXT NOT NULL,
    "resultMarkdown" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "AppIdea" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "analysisId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "targetUser" TEXT NOT NULL,
    "problem" TEXT NOT NULL,
    "solution" TEXT NOT NULL,
    "mvpFeatures" TEXT NOT NULL,
    "monetization" TEXT NOT NULL,
    "difficulty" TEXT NOT NULL,
    "personalDevScore" INTEGER NOT NULL,
    "aiDevScore" INTEGER NOT NULL,
    "recommendation" TEXT NOT NULL,
    "devPrompt" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AppIdea_analysisId_fkey" FOREIGN KEY ("analysisId") REFERENCES "Analysis" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Report" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "analysisId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "reportType" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Report_analysisId_fkey" FOREIGN KEY ("analysisId") REFERENCES "Analysis" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Setting" (
    "key" TEXT NOT NULL PRIMARY KEY,
    "value" TEXT NOT NULL,
    "encrypted" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "ApiUsageLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "provider" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "status" INTEGER,
    "durationMs" INTEGER,
    "errorMessage" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE INDEX "RankingSnapshot_storefrontId_genreId_chartType_limit_idx" ON "RankingSnapshot"("storefrontId", "genreId", "chartType", "limit");

-- CreateIndex
CREATE INDEX "RankingEntry_snapshotId_idx" ON "RankingEntry"("snapshotId");

-- CreateIndex
CREATE INDEX "RankingEntry_appId_idx" ON "RankingEntry"("appId");

-- CreateIndex
CREATE INDEX "AppMetric_appId_idx" ON "AppMetric"("appId");

-- CreateIndex
CREATE INDEX "Review_appId_idx" ON "Review"("appId");

-- CreateIndex
CREATE INDEX "Analysis_analysisType_targetId_idx" ON "Analysis"("analysisType", "targetId");

-- CreateIndex
CREATE INDEX "AppIdea_analysisId_idx" ON "AppIdea"("analysisId");

-- CreateIndex
CREATE INDEX "Report_analysisId_idx" ON "Report"("analysisId");

-- CreateIndex
CREATE INDEX "ApiUsageLog_provider_createdAt_idx" ON "ApiUsageLog"("provider", "createdAt");
