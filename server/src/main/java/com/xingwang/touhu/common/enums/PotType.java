package com.xingwang.touhu.common.enums;

/**
 * 壶类型枚举：与前端 src/utils/touhu/probability.js 的 POTS 一一对应。
 * 三个壶为固定难度档位，答对选项后投中哪个壶得哪个分，未投中保底 MISS_SCORE。
 * 数据库存储枚举的 name() 字符串（如 "EASY"），可读性好。
 */
public enum PotType {
  EASY(10), // 易：区间宽、指针慢，命中 10 分
  MID(15),  // 中：命中 15 分
  HARD(20); // 难：区间窄、指针快，命中 20 分

  private final int score; // 命中得分

  PotType(int score) {
    this.score = score;
  }

  public int getScore() {
    return score;
  }
}
