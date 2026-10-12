package com.xingwang.touhu.game.dto;

import com.xingwang.touhu.game.GameRules.RulesSnapshot;
import com.xingwang.touhu.question.QuestionService.QuestionPlan;

import java.time.LocalDateTime;

/** 开局返回：对局信息 + 本局抽题结果（一次下发，含打乱后的选项顺序）+ 规则快照 */
public record SessionVO(
    Long sessionId,
    Integer currentRound,
    String status,
    LocalDateTime startedAt,
    QuestionPlan questionPlan,
    RulesSnapshot rules) {
}
