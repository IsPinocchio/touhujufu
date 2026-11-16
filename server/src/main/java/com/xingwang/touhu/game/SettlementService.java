package com.xingwang.touhu.game;

import com.xingwang.touhu.game.entity.QuizRecord;
import com.xingwang.touhu.game.entity.ThrowRecord;

import java.util.List;

/**
 * 清算服务：终局时根据轮次/答题明细，在服务端重新计算最终得分。
 * 为什么不直接信客户端上报的分数？—— 客户端代码运行在玩家浏览器里，理论上可以被篡改。
 * 服务端以明细记录为准重算，是排行榜公平性的根本保证。
 */
public final class SettlementService {

  private SettlementService() {
  }

  /** 清算结果 */
  public record Settlement(int finalScore, int breezeTokens) {
  }

  /**
   * 重算一局游戏的最终结果：最终得分 = 各轮得分之和 + 答对判断题数 × 清风令加成。
   * （各轮得分在落库时已由服务端推导：答错 0 / 未中保底 5 / 命中 10/15/20）
   */
  public static Settlement settle(List<ThrowRecord> throws_, List<QuizRecord> quizzes) {
    int score = throws_.stream().mapToInt(ThrowRecord::getScoreGained).sum();

    // 清风令：每答对一题一枚，每枚 +10 分
    int tokens = (int) quizzes.stream().filter(QuizRecord::getCorrect).count();
    score += tokens * GameRules.TOKEN_BONUS;

    return new Settlement(score, tokens);
  }
}
