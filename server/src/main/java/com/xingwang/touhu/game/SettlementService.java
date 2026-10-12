package com.xingwang.touhu.game;

import com.xingwang.touhu.common.enums.CardType;
import com.xingwang.touhu.common.enums.Penalty;
import com.xingwang.touhu.common.enums.PotType;
import com.xingwang.touhu.game.entity.CardViewRecord;
import com.xingwang.touhu.game.entity.QuizRecord;
import com.xingwang.touhu.game.entity.ThrowRecord;

import java.util.List;

/**
 * 清算服务：终局时根据投掷/答题/查看/交代明细，在服务端重新计算最终得分与处分。
 * 为什么不直接信客户端上报的分数？—— 客户端代码运行在玩家浏览器里，理论上可以被篡改。
 * 服务端以明细记录为准重算，是排行榜公平性的根本保证。
 */
public final class SettlementService {

  private SettlementService() {
  }

  /** 清算结果 */
  public record Settlement(int finalScore, int clueCount, Penalty penalty,
                           int breezeTokens, boolean usedRiskyPot) {
  }

  /**
   * 重算一局游戏的最终结果。
   *
   * @param throws_   全部投掷记录（按轮次）
   * @param quizzes   全部答题记录
   * @param cardViews 全部付费查看记录
   * @param confessed 是否主动交代过（交代 = 扣除交代前投风险壶得分 + 消除交代前抽到的所有线索卡）
   */
  public static Settlement settle(List<ThrowRecord> throws_,
                                  List<QuizRecord> quizzes,
                                  List<CardViewRecord> cardViews,
                                  boolean confessed) {

    // 1. 投壶总分
    int score = throws_.stream().mapToInt(ThrowRecord::getScoreGained).sum();

    // 2. 主动交代：扣除交代前（第 1~4 轮）投风险壶所得全部分数
    if (confessed) {
      int riskyBeforeConfess = throws_.stream()
          .filter(t -> t.getRoundNo() <= GameRules.CONFESS_ROUND)
          .filter(t -> PotType.valueOf(t.getPotType()).isRisky())
          .mapToInt(ThrowRecord::getScoreGained)
          .sum();
      score -= riskyBeforeConfess;
    }

    // 3. 付费查看扣分
    int viewCost = cardViews.stream().mapToInt(CardViewRecord::getCost).sum();
    score -= viewCost;

    // 4. 清风令：每答对一题一枚，每枚 +10 分
    int tokens = (int) quizzes.stream().filter(QuizRecord::getCorrect).count();
    score += tokens * GameRules.TOKEN_BONUS;

    // 5. 线索数：交代前的线索卡已被消除，只统计交代后（第 5~9 轮）抽到的
    int clueCount = (int) throws_.stream()
        .filter(t -> CardType.CLUE.name().equals(t.getCardType()))
        .filter(t -> !confessed || t.getRoundNo() > GameRules.CONFESS_ROUND)
        .count();

    // 6. 是否投过风险壶（无论抽到什么卡）—— 大清洗的判定依据
    boolean usedRiskyPot = throws_.stream()
        .anyMatch(t -> PotType.valueOf(t.getPotType()).isRisky());

    // 7. 线索阶梯处分（与前端 settlePlayer 一致）
    Penalty penalty;
    if (clueCount == 0) {
      // 0 线索且全程未投风险壶、至少命中过一次：清风奖 +30（全程陪跑不获奖）
      if (!usedRiskyPot && throws_.stream().anyMatch(t -> Boolean.TRUE.equals(t.getHit()))) {
        score += GameRules.BREEZE_AWARD;
      }
      penalty = Penalty.NONE;
    } else if (clueCount == 1) {
      score = score / 2; // 轻处分：减半（整数除法等同前端的 Math.floor）
      penalty = Penalty.LIGHT;
    } else {
      score = 0; // 重处分：清零
      penalty = Penalty.HEAVY;
    }

    // 负分清底：付费查看可能把分数扣成负数，最终得分不为负
    score = Math.max(score, 0);

    return new Settlement(score, clueCount, penalty, tokens, usedRiskyPot);
  }
}
