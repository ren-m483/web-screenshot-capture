/*
 * スタイルプロファイルとお題（トピック）から、
 * バズ投稿の型を真似た投稿案を生成するモジュールです。
 *
 * 既定では外部API不要のルールベースで動作します。
 * 分析で得た「優勢なフックの型・箇条書き有無・絵文字・CTA・
 * 目安の文字数」をなぞって、複数の投稿案を組み立てます。
 */

import { topOf } from "./profile.js";
import { countCharacters } from "./analyzer.js";


/*
 * フックの型ごとの冒頭テンプレートです。
 * {topic} はお題に、{n} は要点の数に置換されます。
 */
const HOOK_TEMPLATES = {
  問いかけ: [
    "なぜ多くの人は{topic}でつまずくのか？",
    "{topic}、うまくいく人と続かない人の差って何だと思いますか？",
  ],
  数字提示: [
    "{topic}でやってよかったこと、{n}つだけ。",
    "{topic}を変えるためにやめた{n}つの習慣。",
  ],
  "告白・体験": [
    "{topic}に本気で向き合って気づいた、たった1つの真実。",
    "{topic}を続けて分かったこと、正直に全部書きます。",
  ],
  "逆説・意外性": [
    "実は{topic}に才能はいりません。必要なのは1つだけ。",
    "多くの人が誤解している{topic}の話をします。",
  ],
  "断定・命令": [
    "{topic}を変えたいなら、これだけ意識すればいい。",
    "{topic}で消耗している人に、これだけは伝えたい。",
  ],
  通常の言い切り: [
    "{topic}がうまい人が、静かにやっていること。",
    "{topic}で結果を出す人の共通点をまとめました。",
  ],
};


/*
 * 結びの一文（本文の締め）のテンプレートです。
 */
const CLOSING_TEMPLATES = [
  "才能ではなく、ただの積み重ねでした。",
  "意志ではなく、仕組みで勝ちましょう。",
  "知っているかどうかで、あとで大きな差がつきます。",
  "騙されたと思って、今日から試してみてください。",
  "あなたは、思っているよりずっとよくやっています。",
];


/*
 * CTAキーワードから、自然な一文を組み立てます。
 */
function buildCtaLine(keyword) {
  const map = {
    保存: "後で見返せるように、保存推奨です。",
    ブックマーク: "忘れないうちにブックマークしておいてください。",
    フォロー: "こういう話は、フォローしておくと役に立ちます。",
    リポスト: "共感したら、リポストで広めてもらえると嬉しいです。",
    リプ: "あなたの意見も、ぜひリプで教えてください。",
    コメント: "あなたの体験も、コメントで聞かせてください。",
    いいね: "参考になったら、いいねで教えてください。",
    拡散: "誰かの役に立ちそうなら、拡散してもらえると嬉しいです。",
    シェア: "刺さった人がいたら、シェアしてください。",
    試してみて: "騙されたと思って、まず試してみてください。",
    やってみて: "まずは1つだけ、やってみてください。",
    始めてみて: "今日から、小さく始めてみてください。",
    見返せる: "後で見返せるように、保存しておくと便利です。",
  };

  return map[keyword] ?? "参考になったら、反応で教えてください。";
}


/*
 * 配列から index を巡回して要素を取り出します。
 * 候補を複数作るときに、テンプレートをずらして選びます。
 */
function pick(list, index, fallback) {
  if (list.length === 0) {
    return fallback;
  }

  return list[index % list.length];
}


/*
 * 要点（keyPoints）を、プロファイルの箇条書き記号で整形します。
 */
function formatPoints(keyPoints, marker, variantIndex) {
  return keyPoints.map((point, pointIndex) => {
    if (marker === "番号付き") {
      return `${pointIndex + 1}. ${point}`;
    }

    const symbol = marker ?? "・";

    return `${symbol}${point}`;
  });
}


/*
 * お題の見た目を整えます（前後の空白や末尾の助詞を除去）。
 */
function normalizeTopic(topic) {
  return String(topic ?? "")
    .trim()
    .replace(/[。.]$/, "");
}


/*
 * 1つの投稿案を組み立てます。
 */
function composePost({
  topic,
  keyPoints,
  profile,
  variantIndex,
}) {
  const hookLabel = topOf(profile.hookTypes, "通常の言い切り");

  const rawTemplates =
    HOOK_TEMPLATES[hookLabel] ?? HOOK_TEMPLATES["通常の言い切り"];

  /*
   * 要点が無いときは「{n}つだけ」のような件数依存の型を避け、
   * 件数に触れないテンプレートへフォールバックします。
   */
  const hookTemplates =
    keyPoints.length === 0
      ? [
          ...rawTemplates.filter((template) => !template.includes("{n}")),
          ...HOOK_TEMPLATES["通常の言い切り"],
        ]
      : rawTemplates;

  const hook = pick(hookTemplates, variantIndex, "{topic}の話をします。")
    .replaceAll("{topic}", topic)
    .replaceAll("{n}", String(keyPoints.length));

  const blocks = [hook];

  const useBullets =
    profile.ratios.bulletListPercent >= 50 && keyPoints.length > 0;

  if (useBullets) {
    const marker = topOf(profile.bulletMarkers, "・");

    blocks.push("");
    blocks.push(...formatPoints(keyPoints, marker, variantIndex));
  } else if (keyPoints.length > 0) {
    blocks.push("");
    blocks.push(keyPoints.join("。") + "。");
  }

  blocks.push("");
  blocks.push(pick(CLOSING_TEMPLATES, variantIndex, ""));

  /*
   * 絵文字を、プロファイルの平均が1個以上のときだけ末尾へ添えます。
   */
  const avgEmoji = profile.length.emojisPerPost.average;

  if (avgEmoji >= 1 && profile.topEmojis.length > 0) {
    const emoji = pick(
      profile.topEmojis.map((item) => item.value),
      variantIndex,
      "",
    );

    blocks[blocks.length - 1] = `${blocks.at(-1)} ${emoji}`.trim();
  }

  /*
   * CTAが半数以上の投稿で使われていれば、締めの一文を足します。
   */
  if (profile.ratios.ctaPercent >= 50 && profile.ctaKeywords.length > 0) {
    const ctaKeyword = pick(
      profile.ctaKeywords.map((item) => item.value),
      variantIndex,
      "保存",
    );

    blocks.push(buildCtaLine(ctaKeyword));
  }

  const text = blocks.join("\n").replace(/\n{3,}/g, "\n\n").trim();

  return {
    variant: variantIndex + 1,
    hookLabel,
    usedBullets: useBullets,
    text,
    charCount: countCharacters(text),
    withinLimit: countCharacters(text) <= 140,
  };
}


/*
 * お題から複数の投稿案を生成します。
 *
 * request = {
 *   topic: "副業",                     // 必須
 *   keyPoints: ["毎日30分", ...],       // 任意
 *   count: 3,                          // 生成する案の数
 * }
 */
export function generatePosts(request, profile) {
  const topic = normalizeTopic(request.topic);

  if (topic.length === 0) {
    throw new Error("topic（お題）を指定してください。");
  }

  const keyPoints = Array.isArray(request.keyPoints)
    ? request.keyPoints
        .map((point) => String(point).trim())
        .filter((point) => point.length > 0)
    : [];

  const count = Math.max(1, Number(request.count ?? 3));

  const posts = [];

  for (let index = 0; index < count; index += 1) {
    posts.push(
      composePost({
        topic,
        keyPoints,
        profile,
        variantIndex: index,
      }),
    );
  }

  return {
    topic,
    keyPoints,
    basedOn: {
      hookType: topOf(profile.hookTypes, "通常の言い切り"),
      bulletListPercent: profile.ratios.bulletListPercent,
      ctaPercent: profile.ratios.ctaPercent,
      targetCharacters: profile.length.characters.median,
    },
    posts,
  };
}
