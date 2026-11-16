package com.xingwang.touhu.leaderboard;

import java.time.LocalDateTime;

/** 排行榜条目：每人取「本周（周一 00:00 起）已完结对局」中的最高分上榜 */
public record LeaderboardEntryVO(
    Integer rank,          // 名次
    Long userId,
    String displayName,
    String department,
    Integer bestScore,     // 本周最高分
    Integer gamesThisWeek, // 本周已完结场次
    LocalDateTime achievedAt // 取得该分数的时间
) {
}
