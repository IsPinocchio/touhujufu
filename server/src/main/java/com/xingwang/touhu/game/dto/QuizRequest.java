package com.xingwang.touhu.game.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

/** 答题上报请求体：第 2/4/6/8 轮判断题作答后调用 */
public record QuizRequest(
    @NotNull(message = "轮次不能为空")
    @Min(value = 1, message = "轮次不合法")
    @Max(value = 9, message = "轮次不合法")
    Integer roundNo,

    String quizId,

    @NotNull(message = "答题结果不能为空")
    Boolean correct) {
}
