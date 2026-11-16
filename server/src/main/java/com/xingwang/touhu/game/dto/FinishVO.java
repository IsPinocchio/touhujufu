package com.xingwang.touhu.game.dto;

import java.time.LocalDateTime;

/** 终局清算返回：服务端重算后的权威结果 */
public record FinishVO(
    Long sessionId,
    Integer finalScore,
    Integer breezeTokens,
    LocalDateTime finishedAt) {
}
