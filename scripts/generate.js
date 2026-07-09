/*
 * スタイルプロファイルとお題から、投稿案を自動生成します。
 *
 *   npm run generate
 *   npm run generate -- --topic "朝活" --count 4
 *   npm run generate -- --topic "読書" --points "1日10分,寝る前に読む,感想を残す"
 *
 * 事前に `npm run analyze` を実行すると、その結果
 * （data/profile.json）を使って生成します。
 * 無い場合は、サンプルからその場でプロファイルを作ります。
 */

import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";

import { viralSamples } from "../config/viral-samples.js";
import { postOptions } from "../config/post-options.js";
import { buildProfile } from "../lib/profile.js";
import { generatePosts } from "../lib/generator.js";


/*
 * `--key value` 形式のコマンドライン引数を簡易パースします。
 */
function parseArgs(argv) {
  const args = {};

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];

    if (!token.startsWith("--")) {
      continue;
    }

    const key = token.slice(2);
    const next = argv[index + 1];

    if (next === undefined || next.startsWith("--")) {
      args[key] = true;
    } else {
      args[key] = next;
      index += 1;
    }
  }

  return args;
}


async function loadProfile(outputDirectory) {
  const profilePath = path.join(outputDirectory, "profile.json");

  try {
    const raw = await fs.readFile(profilePath, "utf8");

    console.log(
      `既存のプロファイルを利用します：${path.relative(process.cwd(), profilePath)}`,
    );

    return JSON.parse(raw);
  } catch {
    console.log(
      "プロファイルが無いため、サンプルから新規に作成します。",
    );

    return buildProfile(viralSamples);
  }
}


function printResult(result) {
  console.log("");
  console.log("=== 投稿案 ===");
  console.log(`お題：${result.topic}`);
  console.log(
    `参考にした型：${result.basedOn.hookType} / 目安 ${result.basedOn.targetCharacters}文字`,
  );

  for (const post of result.posts) {
    console.log("");
    console.log(
      `--- 案${post.variant}（${post.hookLabel} / ${post.charCount}文字${post.withinLimit ? "" : " ※140字超"}）---`,
    );
    console.log(post.text);
  }

  console.log("");
}


async function main() {
  const args = parseArgs(process.argv.slice(2));

  const outputDirectory = path.resolve(
    process.cwd(),
    postOptions.outputDirectory,
  );

  const profile = await loadProfile(outputDirectory);

  const keyPoints =
    typeof args.points === "string"
      ? args.points.split(/[,、]/)
      : postOptions.keyPoints;

  const request = {
    topic: args.topic ?? postOptions.topic,
    keyPoints,
    count: args.count ? Number(args.count) : postOptions.count,
  };

  const result = generatePosts(request, profile);

  printResult(result);

  await fs.mkdir(outputDirectory, { recursive: true });

  const outputPath = path.join(outputDirectory, "generated-posts.json");

  await fs.writeFile(
    outputPath,
    JSON.stringify(result, null, 2),
    "utf8",
  );

  console.log(
    `生成結果を保存しました：${path.relative(process.cwd(), outputPath)}`,
  );
}


main().catch((error) => {
  console.error("生成中に予期しないエラーが発生しました。");
  console.error(error instanceof Error ? error.stack : error);
  process.exitCode = 1;
});
