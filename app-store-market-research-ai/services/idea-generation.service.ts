import { prisma } from "@/lib/prisma";
import type { AppIdeaOutput, AvoidIdeaOutput } from "@/types/analysis";

/**
 * Claude Code / Codex にそのまま渡せる開発プロンプトを組み立てる。
 * LLM有無に関わらず同じ構造で出力できるよう、決定論的なテンプレートにしている。
 */
export function buildDevPrompt(idea: {
  title: string;
  targetUser: string;
  problem: string;
  solution: string;
  mvpFeatures: string[];
  monetization: string;
}): string {
  return [
    `# ${idea.title} 開発プロンプト`,
    "",
    "あなたはNext.js + TypeScriptでアプリを開発するエンジニアです。以下の要件でMVPを実装してください。",
    "",
    "## 対象ユーザー",
    idea.targetUser,
    "",
    "## 解決する課題",
    idea.problem,
    "",
    "## 解決策の概要",
    idea.solution,
    "",
    "## MVP機能",
    ...idea.mvpFeatures.map((f) => `- ${f}`),
    "",
    "## 収益化案",
    idea.monetization,
    "",
    "## 実装時の注意点",
    "- 上記MVP機能に絞り、過剰な抽象化や将来拡張を先取りしないこと",
    "- 個人開発で運用できる範囲のバックエンド構成にすること",
    "- データモデルを明確にし、CRUD中心の設計から始めること",
  ].join("\n");
}

function buildFallbackIdea(params: {
  genreName: string;
  hint: string;
  index: number;
  recommendation: "recommend" | "niche";
  personalDevScore: number;
  aiDevScore: number;
}): AppIdeaOutput {
  const { genreName, hint, index, recommendation, personalDevScore, aiDevScore } = params;
  const title = `${genreName}特化アプリ案${index + 1}（${hint}向け）`;
  const idea: AppIdeaOutput = {
    title,
    targetUser: `${genreName}ジャンルで「${hint}」に困っているユーザー`,
    problem: `既存の${genreName}アプリの多くは総合型で、「${hint}」という個別課題に十分応えられていない`,
    solution: `「${hint}」の解決だけに機能を絞ったシンプルなアプリを提供する`,
    marketReason: `ランキング上位アプリの傾向分析から、この課題への言及が繰り返し見られた`,
    competitorWeakness: `上位アプリは機能が多く、${hint}に特化した使い勝手では見劣りする`,
    mvpFeatures: ["コア機能の実装", "オンボーディング", "基本設定画面", "簡易的な記録・閲覧機能"],
    monetization: "買い切り、または少額サブスクでの提供",
    difficulty: "low",
    personalDevScore,
    aiDevScore,
    recommendation,
    devPrompt: "",
  };
  idea.devPrompt = buildDevPrompt(idea);
  return idea;
}

function buildFallbackAvoidIdea(genreName: string, reason: string, index: number): AvoidIdeaOutput {
  return {
    title: `${genreName}の総合型アプリ案${index + 1}`,
    reason,
    alternative: "機能を1つに絞ったニッチな切り口で再検討する",
  };
}

/**
 * LLMキーが未設定の場合のフォールバックで使う、簡易的なアプリ案生成。
 * ジャンル名と分析済みの opportunityAreas / avoidAreas から機械的に組み立てる。
 */
export function buildFallbackIdeaSet(params: {
  genreName: string;
  opportunityAreas: string[];
  avoidAreas: string[];
  personalDevFitScore: number;
  aiDevFitScore: number;
}): { recommendedIdeas: AppIdeaOutput[]; nicheIdeas: AppIdeaOutput[]; avoidIdeas: AvoidIdeaOutput[] } {
  const hints = params.opportunityAreas.length > 0 ? params.opportunityAreas : ["特定用途への特化"];
  const avoidReasons = params.avoidAreas.length > 0 ? params.avoidAreas : ["競合が強く、総合型アプリでの正面突破は難しい"];

  const recommendedIdeas = [0, 1, 2].map((i) =>
    buildFallbackIdea({
      genreName: params.genreName,
      hint: hints[i % hints.length],
      index: i,
      recommendation: "recommend",
      personalDevScore: params.personalDevFitScore,
      aiDevScore: params.aiDevFitScore,
    }),
  );

  const nicheIdeas = [3, 4].map((i) =>
    buildFallbackIdea({
      genreName: params.genreName,
      hint: hints[i % hints.length],
      index: i,
      recommendation: "niche",
      personalDevScore: Math.max(0, params.personalDevFitScore - 10),
      aiDevScore: params.aiDevFitScore,
    }),
  );

  const avoidIdeas = [0, 1, 2].map((i) => buildFallbackAvoidIdea(params.genreName, avoidReasons[i % avoidReasons.length], i));

  return { recommendedIdeas, nicheIdeas, avoidIdeas };
}

export class IdeaGenerationService {
  async generateDevPrompt(ideaId: string): Promise<string> {
    const idea = await prisma.appIdea.findUniqueOrThrow({ where: { id: ideaId } });
    return buildDevPrompt({
      title: idea.title,
      targetUser: idea.targetUser,
      problem: idea.problem,
      solution: idea.solution,
      mvpFeatures: JSON.parse(idea.mvpFeatures),
      monetization: idea.monetization,
    });
  }

  async generateIdeas(analysisId: string): Promise<AppIdeaOutput[]> {
    const analysis = await prisma.analysis.findUniqueOrThrow({ where: { id: analysisId } });
    const result = JSON.parse(analysis.resultJson) as { recommendedIdeas?: AppIdeaOutput[]; avoidIdeas?: AvoidIdeaOutput[] };
    const ideas = result.recommendedIdeas ?? [];

    await prisma.appIdea.deleteMany({ where: { analysisId } });
    for (const idea of ideas) {
      await prisma.appIdea.create({
        data: {
          analysisId,
          title: idea.title,
          targetUser: idea.targetUser,
          problem: idea.problem,
          solution: idea.solution,
          mvpFeatures: JSON.stringify(idea.mvpFeatures),
          monetization: idea.monetization,
          difficulty: idea.difficulty,
          personalDevScore: idea.personalDevScore,
          aiDevScore: idea.aiDevScore,
          recommendation: idea.recommendation,
          devPrompt: idea.devPrompt,
        },
      });
    }
    return ideas;
  }
}

export const ideaGenerationService = new IdeaGenerationService();
