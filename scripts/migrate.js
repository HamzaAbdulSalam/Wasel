require("dotenv").config();
const { Client } = require("pg");
const client = new Client({
  connectionString: process.env.DATABASE_URL,
});
async function runMigration() {
  try {
    console.log("Database URL:", process.env.DATABASE_URL ? "Configured" : "NOT SET");
    await client.connect();
    console.log("Connected to database...");
    const sql = `
-- CreateTable Report
CREATE TABLE "Report" (
    "id" SERIAL NOT NULL,
    "category" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "latitude" DECIMAL(10,8) NOT NULL,
    "longitude" DECIMAL(11,8) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "credibilityScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "userId" INTEGER NOT NULL,
    "isDuplicate" BOOLEAN NOT NULL DEFAULT false,
    "duplicateOf" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Report_pkey" PRIMARY KEY ("id")
);
-- CreateTable ReportVote
CREATE TABLE "ReportVote" (
    "id" SERIAL NOT NULL,
    "reportId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "voteType" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ReportVote_pkey" PRIMARY KEY ("id")
);
-- CreateTable ReportModeration
CREATE TABLE "ReportModeration" (
    "id" SERIAL NOT NULL,
    "reportId" INTEGER NOT NULL,
    "action" TEXT NOT NULL,
    "reason" TEXT,
    "notes" TEXT,
    "moderatorId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ReportModeration_pkey" PRIMARY KEY ("id")
);
-- CreateIndex
CREATE INDEX "Report_city_idx" ON "Report"("city");
-- CreateIndex
CREATE INDEX "Report_status_idx" ON "Report"("status");
-- CreateIndex
CREATE INDEX "Report_userId_idx" ON "Report"("userId");
-- CreateIndex
CREATE INDEX "Report_credibilityScore_idx" ON "Report"("credibilityScore");
-- CreateIndex
CREATE UNIQUE INDEX "ReportVote_reportId_userId_key" ON "ReportVote"("reportId", "userId");
-- CreateIndex
CREATE INDEX "ReportVote_reportId_idx" ON "ReportVote"("reportId");
-- CreateIndex
CREATE INDEX "ReportVote_userId_idx" ON "ReportVote"("userId");
-- CreateIndex
CREATE INDEX "ReportModeration_reportId_idx" ON "ReportModeration"("reportId");
-- CreateIndex
CREATE INDEX "ReportModeration_moderatorId_idx" ON "ReportModeration"("moderatorId");
-- CreateIndex
CREATE INDEX "ReportModeration_createdAt_idx" ON "ReportModeration"("createdAt");
-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
-- AddForeignKey
ALTER TABLE "ReportVote" ADD CONSTRAINT "ReportVote_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "Report"("id") ON DELETE CASCADE ON UPDATE CASCADE;
-- AddForeignKey
ALTER TABLE "ReportVote" ADD CONSTRAINT "ReportVote_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
-- AddForeignKey
ALTER TABLE "ReportModeration" ADD CONSTRAINT "ReportModeration_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "Report"("id") ON DELETE CASCADE ON UPDATE CASCADE;
-- AddForeignKey
ALTER TABLE "ReportModeration" ADD CONSTRAINT "ReportModeration_moderatorId_fkey" FOREIGN KEY ("moderatorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    `;
    await client.query(sql);
    console.log("✅ Migration applied successfully!");
  } catch (error) {
    console.error("❌ Migration failed:", error.message);
    console.error("Full error:", error);
  } finally {
    await client.end();
  }
}
runMigration();
