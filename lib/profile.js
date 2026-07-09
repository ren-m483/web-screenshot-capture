/*
 * 複数投稿の特徴量を集約し、「スタイルプロファイル」を
 * 作成するモジュールです。
 *
 * 反応（いいね・リポスト）が大きい投稿ほど強く反映される
 * よう、重み付き集計を行います。この重みが、後段の生成で
 * 「どの型を優先的に真似るか」を決めます。
 */

import { analyzePost } from "./analyzer.js";


/*
 * 投稿の反応量から重みを求めます。
 * metricsが無い場合は等倍（1）とします。
 */
function computeWeight(metrics) {
  if (!metrics) {
    return 1;
  }

  const likes = Number(metrics.likes ?? 0);
  const reposts = Number(metrics.reposts ?? 0);
  const replies = Number(metrics.replies ?? 0);

  /*
   * リポストは拡散力が高いため重めに、
   * 全体は対数で圧縮し、極端な外れ値に引きずられないようにします。
   */
  const rawScore = likes + reposts * 3 + replies * 2;

  return 1 + Math.log10(1 + rawScore);
}


/*
 * 数値配列から代表値（最小・最大・平均・中央値）を求めます。
 */
function summarizeNumbers(values) {
  if (values.length === 0) {
    return {
      min: 0,
      max: 0,
      average: 0,
      median: 0,
    };
  }

  const sorted = [...values].sort((a, b) => a - b);

  const total = sorted.reduce((sum, value) => sum + value, 0);

  const middle = Math.floor(sorted.length / 2);

  const median =
    sorted.length % 2 === 0
      ? (sorted[middle - 1] + sorted[middle]) / 2
      : sorted[middle];

  return {
    min: sorted[0],
    max: sorted[sorted.length - 1],
    average: Math.round((total / sorted.length) * 10) / 10,
    median,
  };
}


/*
 * 重み付きで出現回数を数え、多い順の配列に変換します。
 */
function rankByWeight(weightedCounts) {
  return [...weightedCounts.entries()]
    .map(([value, weight]) => ({
      value,
      weight: Math.round(weight * 10) / 10,
    }))
    .sort((a, b) => b.weight - a.weight);
}


/*
 * 投稿群からスタイルプロファイルを構築します。
 */
export function buildProfile(posts) {
  const analyzed = posts.map((post) => ({
    post,
    features: analyzePost(post),
    weight: computeWeight(post.metrics),
  }));

  const totalWeight = analyzed.reduce(
    (sum, item) => sum + item.weight,
    0,
  );

  const hookCounts = new Map();
  const emojiCounts = new Map();
  const ctaCounts = new Map();
  const bulletMarkerCounts = new Map();
  const themeCounts = new Map();

  const addWeighted = (map, key, weight) => {
    map.set(key, (map.get(key) ?? 0) + weight);
  };

  for (const { features, weight } of analyzed) {
    addWeighted(hookCounts, features.hookLabel, weight);

    if (features.theme) {
      addWeighted(themeCounts, features.theme, weight);
    }

    for (const emoji of features.emojis) {
      addWeighted(emojiCounts, emoji, weight);
    }

    for (const keyword of features.ctaKeywords) {
      addWeighted(ctaCounts, keyword, weight);
    }

    for (const marker of features.bulletMarkers) {
      addWeighted(bulletMarkerCounts, marker, weight);
    }
  }

  const charCounts = analyzed.map((item) => item.features.charCount);
  const lineCounts = analyzed.map(
    (item) => item.features.nonEmptyLineCount,
  );
  const bulletCounts = analyzed.map(
    (item) => item.features.bulletCount,
  );
  const emojiPerPost = analyzed.map(
    (item) => item.features.emojiCount,
  );

  const ctaShare =
    analyzed.reduce(
      (sum, item) => sum + (item.features.hasCta ? item.weight : 0),
      0,
    ) / (totalWeight || 1);

  const bulletShare =
    analyzed.reduce(
      (sum, item) =>
        sum + (item.features.hasBulletList ? item.weight : 0),
      0,
    ) / (totalWeight || 1);

  const questionShare =
    analyzed.reduce(
      (sum, item) =>
        sum + (item.features.hasQuestion ? item.weight : 0),
      0,
    ) / (totalWeight || 1);

  const toPercent = (value) => Math.round(value * 100);

  return {
    sampleCount: posts.length,
    totalWeight: Math.round(totalWeight * 10) / 10,

    length: {
      characters: summarizeNumbers(charCounts),
      nonEmptyLines: summarizeNumbers(lineCounts),
      bulletLines: summarizeNumbers(bulletCounts),
      emojisPerPost: summarizeNumbers(emojiPerPost),
    },

    ratios: {
      ctaPercent: toPercent(ctaShare),
      bulletListPercent: toPercent(bulletShare),
      questionPercent: toPercent(questionShare),
    },

    hookTypes: rankByWeight(hookCounts),
    topEmojis: rankByWeight(emojiCounts).slice(0, 8),
    ctaKeywords: rankByWeight(ctaCounts),
    bulletMarkers: rankByWeight(bulletMarkerCounts),
    themes: rankByWeight(themeCounts),

    perPost: analyzed.map((item) => ({
      id: item.features.id,
      theme: item.features.theme,
      weight: Math.round(item.weight * 10) / 10,
      charCount: item.features.charCount,
      hookLabel: item.features.hookLabel,
      hasBulletList: item.features.hasBulletList,
      hasCta: item.features.hasCta,
    })),
  };
}


/*
 * プロファイルの中で最も優勢な（重みが最大の）項目を返します。
 * 何も無い場合はフォールバック値を返します。
 */
export function topOf(rankedList, fallback) {
  return rankedList.length > 0 ? rankedList[0].value : fallback;
}
