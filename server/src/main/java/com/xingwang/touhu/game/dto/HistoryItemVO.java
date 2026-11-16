package com.xingwang.touhu.game.dto;

import java.time.LocalDateTime;

/** 我的历史战绩条目 */
public record HistoryItemVO(
    Long sessionId,
    Integer finalScore,
    Integer breezeTokens,
    LocalDateTime finishedAt) {
}
