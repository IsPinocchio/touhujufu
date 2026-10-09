package com.xingwang.touhu.leaderboard;

import com.xingwang.touhu.common.Result;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * 排行榜接口：
 *   GET /api/leaderboard?limit=50  查看排行榜（默认前 50 名；无需登录）
 */
@RestController
@RequestMapping("/api/leaderboard")
@RequiredArgsConstructor
public class LeaderboardController {

  private final LeaderboardService leaderboardService;

  @GetMapping
  public Result<List<LeaderboardEntryVO>> leaderboard(
      @RequestParam(defaultValue = "50") int limit) {
    // 限制上限，防止恶意传 limit=99999999 拖垮查询
    return Result.ok(leaderboardService.leaderboard(Math.min(limit, 200)));
  }
}
