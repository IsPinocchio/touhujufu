package com.xingwang.touhu.leaderboard;

import com.xingwang.touhu.game.entity.GameSession;
import com.xingwang.touhu.game.mapper.GameSessionMapper;
import com.xingwang.touhu.user.User;
import com.xingwang.touhu.user.UserMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * 排行榜服务。
 * 规则：已完结 + 未被清洗的对局中，每个用户取最高 finalScore 上榜，分数相同先达成者排前。
 * 100 人规模下直接内存计算即可；若未来玩家上万，可改为 SQL 聚合或定时物化。
 */
@Service
@RequiredArgsConstructor
public class LeaderboardService {

  private final GameSessionMapper sessionMapper;
  private final UserMapper userMapper;

  public List<LeaderboardEntryVO> leaderboard(int limit) {
    // 取所有有效对局，按分数倒序、完成时间正序
    List<GameSession> sessions = sessionMapper.selectList(
        new com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper<GameSession>()
            .eq(GameSession::getStatus, "FINISHED")
            .eq(GameSession::getPurged, false)
            .orderByDesc(GameSession::getFinalScore)
            .orderByAsc(GameSession::getFinishedAt));

    // 每个用户只保留最好的一局（列表已排序，首次出现即最佳）
    Map<Long, GameSession> best = new HashMap<>();
    for (GameSession s : sessions) {
      best.putIfAbsent(s.getUserId(), s);
    }

    // 用户信息一次性查出，避免循环里逐条查库（N+1 问题）
    Map<Long, User> users = new HashMap<>();
    if (!best.isEmpty()) {
      userMapper.selectBatchIds(best.keySet())
          .forEach(u -> users.put(u.getId(), u));
    }

    List<LeaderboardEntryVO> entries = new ArrayList<>();
    int rank = 0;
    for (GameSession s : best.values().stream()
        .sorted((a, b) -> {
          int cmp = b.getFinalScore().compareTo(a.getFinalScore());
          return cmp != 0 ? cmp : a.getFinishedAt().compareTo(b.getFinishedAt());
        })
        .limit(limit)
        .toList()) {
      User u = users.get(s.getUserId());
      entries.add(new LeaderboardEntryVO(++rank, s.getUserId(),
          u != null ? u.getDisplayName() : "未知用户",
          u != null ? u.getDepartment() : null,
          s.getFinalScore(), s.getFinishedAt()));
    }
    return entries;
  }
}
