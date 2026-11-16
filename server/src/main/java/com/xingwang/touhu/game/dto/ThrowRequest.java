package com.xingwang.touhu.game.dto;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

/**
 * 轮次上报请求体：作答 + 投壶一体上报，每轮一次。
 * - 答错选项：只带 optionKey，pot 相关字段必须为 null，本题 0 分；
 * - 答对选项：带 optionKey + potType/pointerPos/inZone，
 *   hit 与得分由服务端推导（区间内必中；命中 = 壶分，未中 = 保底分），不信客户端。
 * 选项对错由服务端按本局 question_plan 判定，客户端伪造 pot 字段无法得分。
 */
public record ThrowRequest(
    @NotNull(message = "轮次不能为空")
    @Min(value = 1, message = "轮次最小为 1")
    @Max(value = 9, message = "轮次最大为 9")
    Integer roundNo,

    String sceneId,

    @NotBlank(message = "选项不能为空")
    String optionKey, // 玩家选择的选项编号（a/b/c）

    String potType, // EASY / MID / HARD（仅答对时填写）

    @DecimalMin(value = "0", message = "指针位置不合法")
    @DecimalMax(value = "1", message = "指针位置不合法")
    Double pointerPos, // 仅答对时填写

    Boolean inZone // 仅答对时填写
) {
}
