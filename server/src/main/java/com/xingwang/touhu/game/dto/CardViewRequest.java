package com.xingwang.touhu.game.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

/** 付费查看上报请求体：玩家花积分偷看某一轮抽到的卡 */
public record CardViewRequest(
    @NotNull(message = "轮次不能为空")
    @Min(value = 1, message = "轮次不合法")
    @Max(value = 9, message = "轮次不合法")
    Integer roundNo) {
}
