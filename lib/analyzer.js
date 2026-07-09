/*
 * 1件の投稿本文から特徴量を抽出するモジュールです。
 *
 * 外部APIには依存せず、テキストのみから
 * バズ投稿に共通しやすい要素を機械的に取り出します。
 */

/*
 * 絵文字をおおまかに検出するための正規表現です。
 * 記号・国旗・補助記号など、代表的な範囲をまとめて拾います。
 */
const EMOJI_PATTERN =
  /(?:[←-⇿⌀-➿⬀-⯿️])|(?:[\uD83C-\uD83E][\uDC00-\uDFFF])/g;

/*
 * 箇条書きの行頭に使われやすい記号です。
 */
const BULLET_MARKERS = [
  "・",
  "-",
  "→",
  "▶",
  "✓",
  "✔",
  "◎",
  "○",
  "●",
  "☑",
];

/*
 * 丸数字や「1.」形式など、番号付きリストの行頭パターンです。
 */
const NUMBERED_LIST_PATTERN =
  /^\s*(?:[①-⑳]|[0-9]{1,2}[.)、）])\s*/;

/*
 * 行動を促す（CTA）ときに使われやすい表現です。
 */
const CTA_KEYWORDS = [
  "保存",
  "フォロー",
  "リポスト",
  "リプ",
  "コメント",
  "いいね",
  "拡散",
  "シェア",
  "試してみて",
  "やってみて",
  "始めてみて",
  "見返せる",
  "ブックマーク",
];

/*
 * 冒頭のフック（つかみ）を分類するためのルールです。
 * 上から順に判定し、最初に一致した型を採用します。
 */
const HOOK_RULES = [
  {
    type: "question",
    label: "問いかけ",
    test: (line) => /[?？]\s*$/.test(line) || /^なぜ|^どうして|^知って/.test(line),
  },
  {
    type: "number",
    label: "数字提示",
    test: (line) => /[0-9０-９]+\s*(?:つ|個|選|位|万|円|%|％|日|年|ヶ月|時間|分)/.test(line),
  },
  {
    type: "confession",
    label: "告白・体験",
    test: (line) => /気づいた|分かった|辞めて|始めて|正直に|全部書く|やってよかった/.test(line),
  },
  {
    type: "contrast",
    label: "逆説・意外性",
    test: (line) => /実は|意外と|多くの人|誰も|本当は|じゃない|ではない/.test(line),
  },
  {
    type: "imperative",
    label: "断定・命令",
    test: (line) => /だけでいい|してほしい|覚えておいて|べき|しよう|しましょう/.test(line),
  },
];


/*
 * 文字列の見た目上の長さ（コードポイント数）を返します。
 * サロゲートペアの絵文字を2文字と数えないようにします。
 */
export function countCharacters(text) {
  return [...text].length;
}


/*
 * 空行で区切られた段落の数を数えます。
 */
export function countParagraphs(text) {
  return text
    .split(/\n\s*\n/)
    .map((block) => block.trim())
    .filter((block) => block.length > 0).length;
}


/*
 * 冒頭行のフックを分類します。
 */
export function detectHook(text) {
  const firstLine = text
    .split("\n")
    .map((line) => line.trim())
    .find((line) => line.length > 0) ?? "";

  for (const rule of HOOK_RULES) {
    if (rule.test(firstLine)) {
      return {
        type: rule.type,
        label: rule.label,
        line: firstLine,
      };
    }
  }

  return {
    type: "statement",
    label: "通常の言い切り",
    line: firstLine,
  };
}


/*
 * 箇条書き行を抽出します。
 */
export function extractBulletLines(text) {
  const lines = text.split("\n").map((line) => line.trim());

  const markerMatches = [];

  const bulletLines = lines.filter((line) => {
    if (line.length === 0) {
      return false;
    }

    const symbolMarker = BULLET_MARKERS.find((marker) =>
      line.startsWith(marker),
    );

    if (symbolMarker) {
      markerMatches.push(symbolMarker);
      return true;
    }

    if (NUMBERED_LIST_PATTERN.test(line)) {
      markerMatches.push("番号付き");
      return true;
    }

    return false;
  });

  return {
    bulletLines,
    markers: markerMatches,
  };
}


/*
 * CTA（行動喚起）に該当するキーワードを検出します。
 */
export function detectCta(text) {
  const matched = CTA_KEYWORDS.filter((keyword) =>
    text.includes(keyword),
  );

  return {
    hasCta: matched.length > 0,
    keywords: matched,
  };
}


/*
 * 1件の投稿を分析し、特徴量オブジェクトを返します。
 */
export function analyzePost(post) {
  const text = String(post.text ?? "");

  /*
   * 丸数字（①〜⑳）は番号付きリスト記号として別途数えるため、
   * 絵文字の集計からは除外します。
   */
  const emojis = (text.match(EMOJI_PATTERN) ?? []).filter(
    (symbol) => !/[①-⑳]/.test(symbol),
  );

  const hashtags = text.match(/[#＃][^\s#＃]+/g) ?? [];

  const mentions = text.match(/[@＠][A-Za-z0-9_]+/g) ?? [];

  const urls = text.match(/https?:\/\/\S+/g) ?? [];

  const numbers = text.match(/[0-9０-９]+/g) ?? [];

  const lines = text.split("\n");

  const nonEmptyLines = lines.filter(
    (line) => line.trim().length > 0,
  );

  const hook = detectHook(text);

  const { bulletLines, markers } = extractBulletLines(text);

  const cta = detectCta(text);

  const hasQuestion = /[?？]/.test(text);

  return {
    id: post.id ?? null,
    theme: post.theme ?? null,
    metrics: post.metrics ?? null,

    charCount: countCharacters(text),
    lineCount: lines.length,
    nonEmptyLineCount: nonEmptyLines.length,
    paragraphCount: countParagraphs(text),

    emojiCount: emojis.length,
    emojis,

    hashtagCount: hashtags.length,
    hashtags,

    mentionCount: mentions.length,
    urlCount: urls.length,
    numberCount: numbers.length,

    hasBulletList: bulletLines.length > 0,
    bulletCount: bulletLines.length,
    bulletMarkers: markers,

    hookType: hook.type,
    hookLabel: hook.label,
    hookLine: hook.line,

    hasQuestion,
    hasCta: cta.hasCta,
    ctaKeywords: cta.keywords,
  };
}
