package com.xingwang.touhu.game;

import com.xingwang.touhu.common.enums.PotType;

import java.util.List;
import java.util.Map;

/**
 * 游戏规则常量：与前端 src/data/touhu/config.js 严格对齐。
 * 开局/续玩时通过 rules 快照下发给前端，前端展示数值以快照为准，
 * 双端数值一旦漂移，玩家结算页能直接看出来，便于及时发现。
 */
public final class GameRules {

  private GameRules() {
  }

  public static final int TOTAL_ROUNDS = 9;      // 共 9 轮
  public static final int TOKEN_BONUS = 10;      // 每枚清风令清算时 +10 分
  public static final int MISS_SCORE = 5;        // 答对选项但投壶未中的保底分

  /** 判断题出现的轮次 */
  public static final List<Integer> QUIZ_ROUNDS = List.of(2, 4, 6, 8);

  /** 判断题出现的轮次 */
  public static boolean isQuizRound(int round) {
    return QUIZ_ROUNDS.contains(round);
  }

  /** 规则快照：随开局/续玩接口下发，键名与前端 config.js / probability.js 对应 */
  public record RulesSnapshot(int totalRounds, List<Integer> quizRounds,
                              int tokenBonus, int missScore,
                              Map<String, Integer> potScores) {
  }

  public static RulesSnapshot snapshot() {
    return new RulesSnapshot(TOTAL_ROUNDS, QUIZ_ROUNDS, TOKEN_BONUS, MISS_SCORE,
        Map.of("EASY", PotType.EASY.getScore(),
            "MID", PotType.MID.getScore(),
            "HARD", PotType.HARD.getScore()));
  }
}
