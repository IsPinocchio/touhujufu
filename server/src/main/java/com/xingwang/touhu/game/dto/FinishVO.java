package com.xingwang.touhu.game.dto;

import java.time.LocalDateTime;

/** 终局清算返回：服务端重算后的权威结果 */
public record FinishVO(
    Long sessionId,
    Integer finalScore,
    Integer clueCount,
    String penalty,      // NONE / LIGHT / HEAVY
    Integer breezeTokens,
    Boolean confessed,
    Boolean usedRiskyPot, // 是否投过风险壶（前端可据此提示"已被记录在案"）
    LocalDateTime finishedAt) {
}
