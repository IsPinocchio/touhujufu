package com.xingwang.touhu.game.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.xingwang.touhu.game.GameRules.RulesSnapshot;
import com.xingwang.touhu.question.QuestionService.QuestionPlan;

import java.time.LocalDateTime;
import java.util.List;

/**
 * 进行中对局的完整状态：续玩时前端据此重建游戏。
 * 题目（questionPlan）+ 已发生的明细记录（轮次作答/判断题），
 * 前端按轮次重放即可还原得分、清风令等全部状态。
 */
public record SessionStateVO(
    Long sessionId,
    Integer currentRound,
    String status,
    QuestionPlan questionPlan,
    RulesSnapshot rules,
    @JsonProperty("throws") List<ThrowItem> throwsList,
    List<QuizItem> quizzes,
    LocalDateTime startedAt) {

  /** 一轮记录：答错时 pot 相关字段为 null、scoreGained 为 0 */
  public record ThrowItem(Integer roundNo, String sceneId, String optionKey, Boolean optionCorrect,
                          String potType, Boolean inZone, Boolean hit, Integer scoreGained) {
  }

  public record QuizItem(Integer roundNo, String quizId, Boolean correct) {
  }
}
