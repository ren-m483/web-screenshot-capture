/*
 * バズ投稿サンプルを分析し、スタイルプロファイルを
 * 標準出力とJSONファイルへ書き出します。
 *
 *   npm run analyze
 */

import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";

import { viralSamples } from "../config/viral-samples.js";
import { postOptions } from "../config/post-options.js";
import { buildProfile } from "../lib/profile.js";


function formatRanked(list, limit = 5) {
  if (list.length === 0) {
    return "  （なし）";
  }

  return list
    .slice(0, limit)
    .map(
      (item) =>
        `  - ${item.value}（重み ${item.weight}）`,
    )
    .join("\n");
}


function printProfile(profile) {
  const { length, ratios } = profile;

  console.log("");
  console.log("=== バズ投稿スタイル分析レポート ===");
  console.log(`サンプル数：${profile.sampleCount}件`);
  console.log("");

  console.log("[文字数]");
  console.log(
    `  平均 ${length.characters.average} / 中央値 ${length.characters.median} / 最小 ${length.characters.min} / 最大 ${length.characters.max}`,
  );

  console.log("[本文の行数（空行を除く）]");
  console.log(
    `  平均 ${length.nonEmptyLines.average} / 中央値 ${length.nonEmptyLines.median}`,
  );

  console.log("[箇条書きの行数]");
  console.log(
    `  平均 ${length.bulletLines.average} / 最大 ${length.bulletLines.max}`,
  );

  console.log("[1投稿あたりの絵文字数]");
  console.log(
    `  平均 ${length.emojisPerPost.average} / 最大 ${length.emojisPerPost.max}`,
  );

  console.log("");
  console.log("[使用率]");
  console.log(`  箇条書きあり：${ratios.bulletListPercent}%`);
  console.log(`  CTAあり：${ratios.ctaPercent}%`);
  console.log(`  問いかけあり：${ratios.questionPercent}%`);

  console.log("");
  console.log("[フックの型（多い順）]");
  console.log(formatRanked(profile.hookTypes));

  console.log("[よく使われる絵文字]");
  console.log(formatRanked(profile.topEmojis));

  console.log("[CTA表現]");
  console.log(formatRanked(profile.ctaKeywords));

  console.log("[箇条書き記号]");
  console.log(formatRanked(profile.bulletMarkers));
  console.log("");
}


async function main() {
  if (viralSamples.length === 0) {
    console.error(
      "config/viral-samples.js に分析対象の投稿がありません。",
    );
    process.exitCode = 1;
    return;
  }

  const profile = buildProfile(viralSamples);

  printProfile(profile);

  const outputDirectory = path.resolve(
    process.cwd(),
    postOptions.outputDirectory,
  );

  await fs.mkdir(outputDirectory, { recursive: true });

  const profilePath = path.join(outputDirectory, "profile.json");

  await fs.writeFile(
    profilePath,
    JSON.stringify(profile, null, 2),
    "utf8",
  );

  console.log(
    `プロファイルを保存しました：${path.relative(process.cwd(), profilePath)}`,
  );
}


main().catch((error) => {
  console.error("分析中に予期しないエラーが発生しました。");
  console.error(error instanceof Error ? error.stack : error);
  process.exitCode = 1;
});
