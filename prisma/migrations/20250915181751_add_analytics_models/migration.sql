-- CreateTable
CREATE TABLE "analytics_metrics" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "metricType" TEXT NOT NULL,
    "metricName" TEXT NOT NULL,
    "value" REAL NOT NULL,
    "metadata" TEXT,
    "periodStart" DATETIME NOT NULL,
    "periodEnd" DATETIME NOT NULL,
    "calculatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "analytics_alerts" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "alertType" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "data" TEXT,
    "triggeredAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "acknowledgedAt" DATETIME,
    "acknowledgedBy" TEXT,
    "resolvedAt" DATETIME
);

-- CreateTable
CREATE TABLE "analytics_cache" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "cacheKey" TEXT NOT NULL,
    "data" TEXT NOT NULL,
    "expiresAt" DATETIME NOT NULL,
    "lastUpdated" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE INDEX "analytics_metrics_metricType_periodStart_idx" ON "analytics_metrics"("metricType", "periodStart");

-- CreateIndex
CREATE UNIQUE INDEX "analytics_metrics_metricType_metricName_periodStart_key" ON "analytics_metrics"("metricType", "metricName", "periodStart");

-- CreateIndex
CREATE INDEX "analytics_alerts_alertType_severity_triggeredAt_idx" ON "analytics_alerts"("alertType", "severity", "triggeredAt");

-- CreateIndex
CREATE UNIQUE INDEX "analytics_cache_cacheKey_key" ON "analytics_cache"("cacheKey");

-- CreateIndex
CREATE INDEX "analytics_cache_cacheKey_expiresAt_idx" ON "analytics_cache"("cacheKey", "expiresAt");
