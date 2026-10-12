package com.xingwang.touhu.game.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.xingwang.touhu.game.GameRules.RulesSnapshot;
import com.xingwang.touhu.question.QuestionService.QuestionPlan;

import java.time.LocalDateTime;
import java.util.List;

/**
 * 进行中对局的完整状态：续玩时前端据此重建游戏。
 * 题目（questionPlan）+ 已发生的明细记录（投掷/答题/看卡）+ 交代标记，
 * 前端按轮次重放即可还原得分、线索卡、清风令等全部状态。
 */
public record SessionStateVO(
    Long sessionId,
    Integer currentRound,
    String status,
    Boolean confessed,
    QuestionPlan questionPlan,
    RulesSnapshot rules,
    @JsonProperty("throws") List<ThrowItem> throwsList,
    List<QuizItem> quizzes,
    List<CardViewItem> cardViews,
    LocalDateTime startedAt) {

  public record ThrowItem(Integer roundNo, String sceneId, String potType, Boolean inZone,
                          Boolean hit, Integer scoreGained, String cardType) {
  }

  public record QuizItem(Integer roundNo, String quizId, Boolean correct) {
  }

  public record CardViewItem(Integer roundNo, Integer cost) {
  }
}
