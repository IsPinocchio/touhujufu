package com.xingwang.touhu.game;

/**
 * 游戏规则常量：与前端 src/data/config.js 严格对齐。
 * 前端改规则时这里必须同步修改，否则服务端清算结果会与玩家看到的不一致。
 */
public final class GameRules {

  private GameRules() {
  }

  public static final int TOTAL_ROUNDS = 9;      // 共 9 轮
  public static final int CONFESS_ROUND = 4;     // 第 4 轮结束后可主动交代
  public static final int TOKEN_BONUS = 10;      // 每枚清风令清算时 +10 分
  public static final int BREEZE_AWARD = 30;     // 全程未投风险壶且 0 线索：清风奖 +30

  /** 判断题出现的轮次 */
  public static boolean isQuizRound(int round) {
    return round == 2 || round == 4 || round == 6 || round == 8;
  }
}
