import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { chromium } from "playwright";

import { targets } from "../config/targets.js";
import { captureDevices } from "../config/devices.js";
import { options } from "../config/options.js";


const OUTPUT_ROOT = path.resolve(
  process.cwd(),
  "screenshots",
);


function createTimestamp() {
  const now = new Date();

  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const hours = String(now.getHours()).padStart(2, "0");
  const minutes = String(now.getMinutes()).padStart(2, "0");
  const seconds = String(now.getSeconds()).padStart(2, "0");

  return `${year}-${month}-${day}_${hours}${minutes}${seconds}`;
}


function sanitizeFileName(value) {
  const sanitizedValue = String(value)
    .replace(/[<>:"/\\|?*\u0000-\u001F]/g, "-")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  return sanitizedValue || "unnamed";
}


function toRelativePath(filePath) {
  return path.relative(
    process.cwd(),
    filePath,
  );
}


async function ensureDirectory(directoryPath) {
  await fs.mkdir(
    directoryPath,
    {
      recursive: true,
    },
  );
}


async function autoScroll(page) {
  await page.evaluate(async () => {
    await new Promise((resolve) => {
      const distance = 500;
      const interval = 100;
      const maximumDuration = 30_000;

      let position = 0;
      const startedAt = Date.now();

      const timer = window.setInterval(() => {
        const documentHeight = Math.max(
          document.body.scrollHeight,
          document.documentElement.scrollHeight,
        );

        const maximumScrollPosition = Math.max(
          documentHeight - window.innerHeight,
          0,
        );

        window.scrollBy({
          top: distance,
          behavior: "auto",
        });

        position += distance;

        const reachedBottom =
          position >= maximumScrollPosition;

        const timedOut =
          Date.now() - startedAt >= maximumDuration;

        if (reachedBottom || timedOut) {
          window.clearInterval(timer);

          window.scrollTo({
            top: 0,
            behavior: "auto",
          });

          window.setTimeout(resolve, 300);
        }
      }, interval);
    });
  });
}


async function waitForFonts(page) {
  await page.evaluate(async () => {
    if (document.fonts?.ready) {
      await document.fonts.ready;
    }
  });
}


async function waitForImages(page) {
  await page.locator("img").evaluateAll(
    async (images) => {
      await Promise.all(
        images.map((image) => {
          if (image.complete) {
            return Promise.resolve();
          }

          return new Promise((resolve) => {
            image.addEventListener(
              "load",
              resolve,
              {
                once: true,
              },
            );

            image.addEventListener(
              "error",
              resolve,
              {
                once: true,
              },
            );
          });
        }),
      );
    },
  );
}


async function injectAnimationStopCss(page) {
  await page.addStyleTag({
    content: `
      *,
      *::before,
      *::after {
        animation-duration: 0s !important;
        animation-delay: 0s !important;
        transition-duration: 0s !important;
        transition-delay: 0s !important;
        scroll-behavior: auto !important;
        caret-color: transparent !important;
      }
    `,
  });
}


async function waitForPage(page) {
  try {
    await page.waitForLoadState(
      "networkidle",
      {
        timeout: options.networkIdleTimeout,
      },
    );
  } catch {
    console.warn(
      "  networkidleにならなかったため、固定時間待機へ移行します。",
    );
  }

  await waitForFonts(page);

  if (options.autoScroll) {
    await autoScroll(page);
  }

  if (options.waitForImages) {
    await Promise.race([
      waitForImages(page),
      page.waitForTimeout(10_000),
    ]);
  }

  await page.waitForTimeout(
    options.waitAfterLoad,
  );

  if (options.injectAnimationStopCss) {
    await injectAnimationStopCss(page);
    await page.waitForTimeout(200);
  }
}


async function captureMenuOpenState({
  page,
  device,
  targetDirectory,
  baseFileName,
  result,
}) {
  if (!options.captureMenuOpen) {
    return;
  }

  const isMobileDevice =
    device.category === "mobile"
    || device.settings?.isMobile === true;

  if (!isMobileDevice) {
    return;
  }

  const menuButton = page.locator(
    options.menuButtonSelector,
  );

  if (await menuButton.count() === 0) {
    console.log(
      "  メニューボタンがないため、メニュー展開撮影を省略します。",
    );
    return;
  }

  const firstMenuButton = menuButton.first();

  if (!await firstMenuButton.isVisible()) {
    console.log(
      "  メニューボタンが非表示のため、メニュー展開撮影を省略します。",
    );
    return;
  }

  try {
    await firstMenuButton.click({
      timeout: 5_000,
    });

    await page.waitForTimeout(500);

    const menuOpenPath = path.join(
      targetDirectory,
      `${baseFileName}-menu-open.png`,
    );

    await page.screenshot({
      path: menuOpenPath,
      fullPage: false,
      animations: "disabled",
    });

    result.files.push({
      type: "menu-open",
      path: toRelativePath(menuOpenPath),
    });
  } catch (error) {
    console.warn(
      "  メニュー展開状態の撮影に失敗しました。",
    );

    console.warn(
      error instanceof Error
        ? error.message
        : String(error),
    );
  }
}


async function captureTarget({
  browser,
  browserName,
  target,
  device,
  runDirectory,
}) {
  let context = null;

  const targetDirectory = path.join(
    runDirectory,
    sanitizeFileName(target.name),
  );

  await ensureDirectory(targetDirectory);

  const baseFileName = sanitizeFileName(
    device.name,
  );

  const result = {
    browserName,
    targetName: target.name,
    url: target.url,
    deviceName: device.name,
    viewport: device.settings?.viewport ?? null,
    success: false,
    files: [],
    error: null,
  };

  try {
    context = await browser.newContext({
      ...device.settings,
      colorScheme: options.colorScheme,
      locale: options.locale,
    });

    const page = await context.newPage();

    page.setDefaultNavigationTimeout(
      options.navigationTimeout,
    );

    page.setDefaultTimeout(
      options.navigationTimeout,
    );

    console.log(
      `[撮影開始] ${browserName} / ${target.name} / ${device.name}`,
    );

    const response = await page.goto(
      target.url,
      {
        waitUntil: "domcontentloaded",
        timeout: options.navigationTimeout,
      },
    );

    if (!response) {
      console.warn(
        "  HTTPレスポンスを取得できませんでした。",
      );
    } else if (!response.ok()) {
      console.warn(
        `  HTTPステータス：${response.status()} ${response.statusText()}`,
      );
    }

    await waitForPage(page);

    const viewportPath = path.join(
      targetDirectory,
      `${baseFileName}-viewport.png`,
    );

    await page.screenshot({
      path: viewportPath,
      fullPage: false,
      animations: "disabled",
    });

    result.files.push({
      type: "viewport",
      path: toRelativePath(viewportPath),
    });

    const fullPagePath = path.join(
      targetDirectory,
      `${baseFileName}-full.png`,
    );

    await page.screenshot({
      path: fullPagePath,
      fullPage: true,
      animations: "disabled",
    });

    result.files.push({
      type: "full-page",
      path: toRelativePath(fullPagePath),
    });

    await captureMenuOpenState({
      page,
      device,
      targetDirectory,
      baseFileName,
      result,
    });

    result.success = true;

    console.log(
      `[撮影完了] ${browserName} / ${target.name} / ${device.name}`,
    );
  } catch (error) {
    result.error = String(
      error instanceof Error
        ? error.message
        : error,
    );

    console.error(
      `[撮影失敗] ${browserName} / ${target.name} / ${device.name}`,
    );

    console.error(result.error);
  } finally {
    if (context) {
      await context.close();
    }
  }

  return result;
}


async function writeReport({
  runDirectory,
  results,
}) {
  const report = {
    capturedAt: new Date().toISOString(),
    outputDirectory: toRelativePath(runDirectory),
    options,
    total: results.length,
    succeeded: results.filter(
      (result) => result.success,
    ).length,
    failed: results.filter(
      (result) => !result.success,
    ).length,
    results,
  };

  const reportPath = path.join(
    runDirectory,
    "capture-report.json",
  );

  await fs.writeFile(
    reportPath,
    JSON.stringify(
      report,
      null,
      2,
    ),
    "utf8",
  );

  return {
    report,
    reportPath,
  };
}


async function main() {
  const timestamp = createTimestamp();

  const runDirectory = path.join(
    OUTPUT_ROOT,
    timestamp,
    "chromium",
  );

  await ensureDirectory(runDirectory);

  const browserName = "chromium";

  const browser = await chromium.launch({
    headless:
      process.env.HEADLESS !== "false",
  });

  const results = [];

  try {
    for (const target of targets) {
      for (const device of captureDevices) {
        const result = await captureTarget({
          browser,
          browserName,
          target,
          device,
          runDirectory,
        });

        results.push(result);
      }
    }
  } finally {
    await browser.close();
  }

  const {
    report,
    reportPath,
  } = await writeReport({
    runDirectory,
    results,
  });

  console.log("");
  console.log("撮影処理が完了しました。");
  console.log(`成功：${report.succeeded}件`);
  console.log(`失敗：${report.failed}件`);
  console.log(`保存先：${runDirectory}`);
  console.log(`レポート：${reportPath}`);

  if (report.failed > 0) {
    process.exitCode = 1;
  }
}


main().catch((error) => {
  console.error(
    "予期しないエラーが発生しました。",
  );

  console.error(
    error instanceof Error
      ? error.stack
      : error,
  );

  process.exitCode = 1;
});
