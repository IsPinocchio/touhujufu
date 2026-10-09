package com.xingwang.touhu.game;

import com.xingwang.touhu.auth.UserContext;
import com.xingwang.touhu.common.Result;
import com.xingwang.touhu.game.dto.CardViewRequest;
import com.xingwang.touhu.game.dto.FinishVO;
import com.xingwang.touhu.game.dto.HistoryItemVO;
import com.xingwang.touhu.game.dto.QuizRequest;
import com.xingwang.touhu.game.dto.SessionVO;
import com.xingwang.touhu.game.dto.ThrowRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * 游戏接口（全部需要登录令牌）：
 *   POST /api/game/sessions                    开局
 *   GET  /api/game/sessions/current            查询进行中的对局（继续上局）
 *   POST /api/game/sessions/{id}/throws        上报一轮投掷
 *   POST /api/game/sessions/{id}/quiz          上报一轮答题
 *   POST /api/game/sessions/{id}/card-views    上报付费查看
 *   POST /api/game/sessions/{id}/confess       主动交代
 *   POST /api/game/sessions/{id}/finish        终局清算
 *   GET  /api/game/my/history                  我的历史战绩
 */
@RestController
@RequestMapping("/api/game")
@RequiredArgsConstructor
public class GameController {

  private final GameService gameService;

  @PostMapping("/sessions")
  public Result<SessionVO> start() {
    return Result.ok(gameService.start(UserContext.getUserId()));
  }

  @GetMapping("/sessions/current")
  public Result<SessionVO> current() {
    return Result.ok(gameService.currentSession(UserContext.getUserId()));
  }

  @PostMapping("/sessions/{id}/throws")
  public Result<Void> reportThrow(@PathVariable Long id, @Valid @RequestBody ThrowRequest req) {
    gameService.reportThrow(UserContext.getUserId(), id, req);
    return Result.ok();
  }

  @PostMapping("/sessions/{id}/quiz")
  public Result<Void> reportQuiz(@PathVariable Long id, @Valid @RequestBody QuizRequest req) {
    gameService.reportQuiz(UserContext.getUserId(), id, req);
    return Result.ok();
  }

  @PostMapping("/sessions/{id}/card-views")
  public Result<Void> reportCardView(@PathVariable Long id, @Valid @RequestBody CardViewRequest req) {
    gameService.reportCardView(UserContext.getUserId(), id, req);
    return Result.ok();
  }

  @PostMapping("/sessions/{id}/confess")
  public Result<Void> confess(@PathVariable Long id) {
    gameService.confess(UserContext.getUserId(), id);
    return Result.ok();
  }

  @PostMapping("/sessions/{id}/finish")
  public Result<FinishVO> finish(@PathVariable Long id) {
    return Result.ok(gameService.finish(UserContext.getUserId(), id));
  }

  @PostMapping("/sessions/{id}/abandon")
  public Result<Void> abandon(@PathVariable Long id) {
    gameService.abandon(UserContext.getUserId(), id);
    return Result.ok();
  }

  @GetMapping("/my/history")
  public Result<List<HistoryItemVO>> myHistory() {
    return Result.ok(gameService.myHistory(UserContext.getUserId()));
  }
}
