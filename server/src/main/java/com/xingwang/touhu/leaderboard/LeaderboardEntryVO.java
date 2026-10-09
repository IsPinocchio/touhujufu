package com.xingwang.touhu.leaderboard;

import java.time.LocalDateTime;

/**
 * 排行榜条目：每人取「未清洗对局」中的最高分上榜。
 * 注意：投过风险壶但逃脱的玩家此时仍正常在榜（分数真实有效），
 * 只有大清洗之后他们的分数才会被清零、从榜上消失 —— 这正是活动的戏剧张力所在。
 */
public record LeaderboardEntryVO(
    Integer rank,          // 名次
    Long userId,
    String displayName,
    String department,
    Integer bestScore,     // 历史最高分（未清洗）
    LocalDateTime achievedAt // 取得该分数的时间
) {
}
