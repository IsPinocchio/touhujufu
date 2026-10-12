package com.xingwang.touhu.leaderboard;

import java.time.LocalDateTime;

/**
 * 排行榜条目：每人取「本周（周一 00:00 起）未清洗对局」中的最高分上榜。
 * 注意：投过风险壶但逃脱的玩家此时仍正常在榜（分数真实有效），
 * 只有大清洗之后他们的分数才会被清零、从榜上消失 —— 这正是活动的戏剧张力所在。
 */
public record LeaderboardEntryVO(
    Integer rank,          // 名次
    Long userId,
    String displayName,
    String department,
    Integer bestScore,     // 本周最高分（未清洗）
    Integer clueCount,     // 最佳局的线索数
    String penalty,        // 最佳局的处分：NONE / LIGHT / HEAVY
    Integer gamesThisWeek, // 本周已完结场次（含被清洗）
    LocalDateTime achievedAt // 取得该分数的时间
) {
}
