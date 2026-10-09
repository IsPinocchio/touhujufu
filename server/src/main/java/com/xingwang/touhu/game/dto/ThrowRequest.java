package com.xingwang.touhu.game.dto;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

/**
 * 投掷上报请求体：客户端每轮松手后调用。
 * cardType 由客户端按概率随机产生后上报 —— 卡片结果不影响大清洗判定
 * （清洗只看 pot_type），所以卡片结果允许客户端上报；
 * 若后续要加强防作弊，可改为服务端发牌。
 */
public record ThrowRequest(
    @NotNull(message = "轮次不能为空")
    @Min(value = 1, message = "轮次最小为 1")
    @Max(value = 9, message = "轮次最大为 9")
    Integer roundNo,

    String sceneId,

    @NotBlank(message = "壶类型不能为空")
    String potType, // CORRUPT / EDGE / CLEAN

    @NotNull(message = "指针位置不能为空")
    @DecimalMin(value = "0", message = "指针位置不合法")
    @DecimalMax(value = "1", message = "指针位置不合法")
    Double pointerPos,

    @NotNull(message = "是否落入区间不能为空")
    Boolean inZone,

    @NotBlank(message = "卡片类型不能为空")
    String cardType // NONE / SAFE / CLUE
) {
}
