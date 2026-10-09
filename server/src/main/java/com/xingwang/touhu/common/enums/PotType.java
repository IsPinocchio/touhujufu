package com.xingwang.touhu.common.enums;

/**
 * 壶类型枚举：与前端 src/utils/probability.js 的 POTS 一一对应。
 * 数据库存储枚举的 name() 字符串（如 "CORRUPT"），可读性好。
 */
public enum PotType {
  CORRUPT(30, 10), // 腐败壶：命中 30 分，查看卡 10 分
  EDGE(20, 5),     // 擦边壶：命中 20 分，查看卡 5 分
  CLEAN(10, 0);    // 廉洁壶：命中 10 分，不抽卡

  private final int score;    // 命中得分
  private final int viewCost; // 查看该壶抽到的卡所需分数

  PotType(int score, int viewCost) {
    this.score = score;
    this.viewCost = viewCost;
  }

  public int getScore() {
    return score;
  }

  public int getViewCost() {
    return viewCost;
  }

  /** 是否为风险壶（腐败/擦边）：大清洗的判定依据 */
  public boolean isRisky() {
    return this == CORRUPT || this == EDGE;
  }
}
