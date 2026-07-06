import { afterEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { POST as importCsvRoute } from "@/app/api/reviews/import-csv/route";
import { POST as analyzeRoute } from "@/app/api/reviews/analyze/route";

const APP_ID = "4444444444";

describe("POST /api/reviews/import-csv + /api/reviews/analyze", () => {
  afterEach(async () => {
    await prisma.review.deleteMany({ where: { appId: APP_ID } });
    await prisma.analysis.deleteMany({ where: { targetId: APP_ID } });
    await prisma.app.deleteMany({ where: { id: APP_ID } });
  });

  it("rejects a request with no file", async () => {
    const formData = new FormData();
    formData.append("appId", APP_ID);
    const req = new Request("http://localhost/api/reviews/import-csv", { method: "POST", body: formData });
    const res = await importCsvRoute(req);
    expect(res.status).toBe(400);
  });

  it("imports a CSV and produces a review analysis", async () => {
    const csv = [
      "appId,rating,title,body,author,createdAt,country",
      `${APP_ID},1,ひどい,アプリがすぐ落ちる。バグが多すぎて使えない,taro,2026-01-01,jp`,
      `${APP_ID},5,最高,とても使いやすいアプリで満足しています,jiro,2026-01-02,jp`,
      `${APP_ID},2,課金,課金が高いです。もっと安くしてほしい,saburo,2026-01-03,jp`,
    ].join("\n");

    const formData = new FormData();
    formData.append("file", new File([csv], "reviews.csv", { type: "text/csv" }));
    formData.append("appId", APP_ID);

    const importReq = new Request("http://localhost/api/reviews/import-csv", { method: "POST", body: formData });
    const importRes = await importCsvRoute(importReq);
    expect(importRes.status).toBe(200);
    const importJson = await importRes.json();
    expect(importJson).toMatchObject({ imported: 3, skipped: 0 });

    const analyzeReq = new Request("http://localhost/api/reviews/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ appId: APP_ID }),
    });
    const analyzeRes = await analyzeRoute(analyzeReq);
    expect(analyzeRes.status).toBe(200);
    const analyzeJson = await analyzeRes.json();
    expect(analyzeJson.result.categoryCounts.bug).toBe(1);
    expect(analyzeJson.result.categoryCounts.pricing_issue).toBe(1);
    expect(analyzeJson.usedLlm).toBe(false);
  });
});
