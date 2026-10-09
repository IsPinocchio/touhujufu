package com.xingwang.touhu.game.dto;

import java.time.LocalDateTime;

/** 开局返回 */
public record SessionVO(
    Long sessionId,
    Integer currentRound,
    String status,
    LocalDateTime startedAt) {
}
