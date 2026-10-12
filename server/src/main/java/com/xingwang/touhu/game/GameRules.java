package com.xingwang.touhu.game;

import com.xingwang.touhu.common.enums.PotType;

import java.util.List;
import java.util.Map;

/**
 * 游戏规则常量：与前端 src/data/config.js 严格对齐。
 * 开局/续玩时通过 rules 快照下发给前端，前端展示数值以快照为准，
 * 双端数值一旦漂移，玩家结算页能直接看出来，便于及时发现。
 */
public final class GameRules {

  private GameRules() {
  }

  public static final int TOTAL_ROUNDS = 9;      // 共 9 轮
  public static final int CONFESS_ROUND = 4;     // 第 4 轮结束后可主动交代
  public static final int TOKEN_BONUS = 10;      // 每枚清风令清算时 +10 分
  public static final int BREEZE_AWARD = 30;     // 全程未投风险壶且 0 线索：清风奖 +30

  /** 判断题出现的轮次 */
  public static final List<Integer> QUIZ_ROUNDS = List.of(2, 4, 6, 8);

  /** 判断题出现的轮次 */
  public static boolean isQuizRound(int round) {
    return QUIZ_ROUNDS.contains(round);
  }

  /** 规则快照：随开局/续玩接口下发，键名与前端 config.js / probability.js 对应 */
  public record RulesSnapshot(int totalRounds, int confessRound, List<Integer> quizRounds,
                              int tokenBonus, int breezeAward,
                              Map<String, Integer> potScores, Map<String, Integer> viewCosts) {
  }

  public static RulesSnapshot snapshot() {
    return new RulesSnapshot(TOTAL_ROUNDS, CONFESS_ROUND, QUIZ_ROUNDS, TOKEN_BONUS, BREEZE_AWARD,
        Map.of("CORRUPT", PotType.CORRUPT.getScore(),
            "EDGE", PotType.EDGE.getScore(),
            "CLEAN", PotType.CLEAN.getScore()),
        Map.of("CORRUPT", PotType.CORRUPT.getViewCost(),
            "EDGE", PotType.EDGE.getViewCost(),
            "CLEAN", PotType.CLEAN.getViewCost()));
  }
}
