package com.xingwang.touhu.game.dto;

import java.time.LocalDateTime;

/** 我的历史战绩条目 */
public record HistoryItemVO(
    Long sessionId,
    Integer finalScore,
    Integer clueCount,
    String penalty,
    Integer breezeTokens,
    Boolean confessed,
    Boolean usedRiskyPot,
    Boolean purged,        // 是否已被大清洗清零
    Integer originalScore, // 清洗前原得分（仅被清洗局有值，其余为 null）
    LocalDateTime finishedAt) {
}
