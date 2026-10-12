package com.xingwang.touhu.game;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.xingwang.touhu.admin.entity.PurgeRecord;
import com.xingwang.touhu.admin.mapper.PurgeRecordMapper;
import com.xingwang.touhu.common.BizException;
import com.xingwang.touhu.common.enums.CardType;
import com.xingwang.touhu.common.enums.PotType;
import com.xingwang.touhu.common.enums.SessionStatus;
import com.xingwang.touhu.game.dto.CardViewRequest;
import com.xingwang.touhu.game.dto.FinishVO;
import com.xingwang.touhu.game.dto.HistoryItemVO;
import com.xingwang.touhu.game.dto.QuizRequest;
import com.xingwang.touhu.game.dto.SessionStateVO;
import com.xingwang.touhu.game.dto.SessionVO;
import com.xingwang.touhu.game.dto.ThrowRequest;
import com.xingwang.touhu.game.entity.CardViewRecord;
import com.xingwang.touhu.game.entity.GameSession;
import com.xingwang.touhu.game.entity.QuizRecord;
import com.xingwang.touhu.game.entity.ThrowRecord;
import com.xingwang.touhu.game.mapper.CardViewRecordMapper;
import com.xingwang.touhu.game.mapper.GameSessionMapper;
import com.xingwang.touhu.game.mapper.QuizRecordMapper;
import com.xingwang.touhu.game.mapper.ThrowRecordMapper;
import com.xingwang.touhu.question.QuestionService;
import com.xingwang.touhu.question.QuestionService.QuestionPlan;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * 游戏服务：对局的完整生命周期。
 * 服务端维护 current_round 并校验上报顺序，保证明细数据的完整与可信：
 *   投掷必须按轮次依次上报；同一轮重复上报会被数据库唯一键挡下（幂等）。
 */
@Service
@RequiredArgsConstructor
public class GameService {

  private final GameSessionMapper sessionMapper;
  private final ThrowRecordMapper throwMapper;
  private final QuizRecordMapper quizMapper;
  private final CardViewRecordMapper cardViewMapper;
  private final QuestionService questionService;
  private final PurgeRecordMapper purgeRecordMapper;

  /** 开局：抽题入库并创建对局，返回对局ID + 本局题目 + 规则快照 */
  // @Transactional 不只是为了原子性：GET_LOCK 是连接级锁，
  // 非事务下每条 SQL 各自从连接池取连接，锁会失效甚至泄漏（释放不到持锁的那条连接）。
  // 事务内所有 SQL 固定走同一连接，锁才真正互斥、且必定被释放。
  @Transactional
  public SessionVO start(Long userId) {
    // 同一用户同时只允许一局进行中，避免刷分局。
    // 用 MySQL 命名锁把"检查 + 创建"变成原子操作，防止双击/并发产生两局 PLAYING
    String lockName = "touhu_start_" + userId;
    Integer locked = sessionMapper.getLock(lockName);
    if (locked == null || locked != 1) {
      throw new BizException("操作太频繁，请稍后再试");
    }
    try {
      Long playing = sessionMapper.selectCount(new LambdaQueryWrapper<GameSession>()
          .eq(GameSession::getUserId, userId)
          .eq(GameSession::getStatus, SessionStatus.PLAYING.name()));
      if (playing > 0) {
        throw new BizException("你有一局游戏正在进行中，请先完成或继续该对局");
      }
      QuestionPlan plan = questionService.pickSessionQuestions(GameRules.TOTAL_ROUNDS, GameRules.QUIZ_ROUNDS);
      GameSession session = new GameSession();
      session.setUserId(userId);
      session.setStatus(SessionStatus.PLAYING.name());
      session.setCurrentRound(1);
      session.setFinalScore(0);
      session.setClueCount(0);
      session.setPenalty("NONE");
      session.setBreezeTokens(0);
      session.setConfessed(false);
      session.setUsedRiskyPot(false);
      session.setPurged(false);
      session.setQuestionPlan(questionService.toJson(plan));
      sessionMapper.insert(session);
      return new SessionVO(session.getId(), 1, session.getStatus(), session.getStartedAt(), plan,
          GameRules.snapshot());
    } finally {
      sessionMapper.releaseLock(lockName);
    }
  }

  /** 上报一轮投掷；hit 与得分由服务端按规则推导（区间内必中），不信客户端 */
  @Transactional
  public void reportThrow(Long userId, Long sessionId, ThrowRequest req) {
    GameSession session = loadOwnedSession(userId, sessionId);
    requirePlaying(session);
    if (!req.roundNo().equals(session.getCurrentRound())) {
      throw new BizException("轮次不匹配：当前应进行第 " + session.getCurrentRound() + " 轮");
    }

    PotType pot = parsePot(req.potType());
    CardType card = parseCard(req.cardType());

    // 服务端推导：指针在高亮区间 = 必中（与前端确定性判定一致）
    boolean hit = Boolean.TRUE.equals(req.inZone());
    int scoreGained = hit ? pot.getScore() : 0;

    // 只有命中风险壶才会抽卡；客户端上报的卡片类型与壶类型不一致时拒绝
    if (!hit || !pot.isRisky()) {
      if (card != CardType.NONE) {
        throw new BizException("本次投掷不应抽卡");
      }
    } else if (card == CardType.NONE) {
      throw new BizException("命中腐败/擦边壶必须抽一张卡");
    }

    ThrowRecord record = new ThrowRecord();
    record.setSessionId(sessionId);
    record.setRoundNo(req.roundNo());
    record.setSceneId(req.sceneId());
    record.setPotType(pot.name());
    record.setPointerPos(BigDecimal.valueOf(req.pointerPos()));
    record.setInZone(req.inZone());
    record.setHit(hit);
    record.setScoreGained(scoreGained);
    record.setCardType(card.name());
    try {
      throwMapper.insert(record);
    } catch (DuplicateKeyException e) {
      // 唯一键 (session_id, round_no)：网络重试/重复点击安全，直接视为成功
      return;
    }

    // 投过风险壶即打标（无论抽到什么卡）—— 大清洗的判定依据
    if (pot.isRisky() && !session.getUsedRiskyPot()) {
      session.setUsedRiskyPot(true);
    }
    session.setCurrentRound(session.getCurrentRound() + 1);
    sessionMapper.updateById(session);
  }

  /** 上报一轮答题：仅 2/4/6/8 轮，每轮一次；须先完成本轮投掷，且题目与本局抽题结果一致 */
  public void reportQuiz(Long userId, Long sessionId, QuizRequest req) {
    GameSession session = loadOwnedSession(userId, sessionId);
    requirePlaying(session);
    if (!GameRules.isQuizRound(req.roundNo())) {
      throw new BizException("第 " + req.roundNo() + " 轮没有判断题");
    }
    // 顺序校验：答题发生在本轮投掷之后（投掷上报后 currentRound 已 +1）
    if (!req.roundNo().equals(session.getCurrentRound() - 1)) {
      throw new BizException("答题轮次与游戏进度不匹配");
    }
    ThrowRecord roundThrow = throwMapper.selectOne(new LambdaQueryWrapper<ThrowRecord>()
        .eq(ThrowRecord::getSessionId, sessionId)
        .eq(ThrowRecord::getRoundNo, req.roundNo()));
    if (roundThrow == null) {
      throw new BizException("请先完成本轮投掷再答题");
    }
    // quizId 必须是本局该轮抽到的题（老对局没有 question_plan 时跳过该校验）
    if (session.getQuestionPlan() != null) {
      QuestionService.QuizPayload planned =
          questionService.parsePlan(session.getQuestionPlan()).quizzes().get(req.roundNo());
      if (planned == null || !planned.id().equals(req.quizId())) {
        throw new BizException("题目与本局抽题结果不一致");
      }
    }
    QuizRecord record = new QuizRecord();
    record.setSessionId(sessionId);
    record.setRoundNo(req.roundNo());
    record.setQuizId(req.quizId());
    record.setCorrect(req.correct());
    try {
      quizMapper.insert(record);
    } catch (DuplicateKeyException e) {
      throw new BizException("本轮判断题已提交过");
    }
  }

  /** 上报付费查看：扣除对应壶的查看费用（清算时统一扣减）；当前分数不足时拒绝 */
  public void reportCardView(Long userId, Long sessionId, CardViewRequest req) {
    GameSession session = loadOwnedSession(userId, sessionId);
    requirePlaying(session);

    // 找到那一轮的投掷记录，校验确实有卡可看，并按壶计费
    List<ThrowRecord> throws_ = throwMapper.selectList(new LambdaQueryWrapper<ThrowRecord>()
        .eq(ThrowRecord::getSessionId, sessionId));
    ThrowRecord throwRecord = throws_.stream()
        .filter(t -> t.getRoundNo().equals(req.roundNo()))
        .findFirst().orElse(null);
    if (throwRecord == null || CardType.NONE.name().equals(throwRecord.getCardType())) {
      throw new BizException("该轮没有可查看的线索卡");
    }
    PotType pot = PotType.valueOf(throwRecord.getPotType());

    // 余额校验：当前得分 = 投掷得分 - 交代扣除 - 已付查看费，不足则不允许查看
    int earned = throws_.stream().mapToInt(ThrowRecord::getScoreGained).sum();
    if (Boolean.TRUE.equals(session.getConfessed())) {
      earned -= throws_.stream()
          .filter(t -> t.getRoundNo() <= GameRules.CONFESS_ROUND)
          .filter(t -> PotType.valueOf(t.getPotType()).isRisky())
          .mapToInt(ThrowRecord::getScoreGained)
          .sum();
    }
    int spent = cardViewMapper.selectList(new LambdaQueryWrapper<CardViewRecord>()
            .eq(CardViewRecord::getSessionId, sessionId))
        .stream().mapToInt(CardViewRecord::getCost).sum();
    if (earned - spent < pot.getViewCost()) {
      throw new BizException("当前分数不足，无法查看这张卡");
    }

    CardViewRecord record = new CardViewRecord();
    record.setSessionId(sessionId);
    record.setRoundNo(req.roundNo());
    record.setCost(pot.getViewCost());
    try {
      cardViewMapper.insert(record);
    } catch (DuplicateKeyException e) {
      throw new BizException("这张卡已经查看过了");
    }
  }

  /** 主动交代：仅第 4 轮结束（投掷与判断题均完成）后一次 */
  public void confess(Long userId, Long sessionId) {
    GameSession session = loadOwnedSession(userId, sessionId);
    requirePlaying(session);
    if (session.getCurrentRound() != GameRules.CONFESS_ROUND + 1) {
      throw new BizException("主动交代窗口已关闭（仅第 4 轮结束后）");
    }
    // 前端流程是「第 4 轮投掷 -> 判断题 -> 交代窗口」，服务端保持同样顺序
    Long quizDone = quizMapper.selectCount(new LambdaQueryWrapper<QuizRecord>()
        .eq(QuizRecord::getSessionId, sessionId)
        .eq(QuizRecord::getRoundNo, GameRules.CONFESS_ROUND));
    if (quizDone == 0) {
      throw new BizException("请先完成第 " + GameRules.CONFESS_ROUND + " 轮的法规判断题");
    }
    if (session.getConfessed()) {
      throw new BizException("已经交代过了");
    }
    session.setConfessed(true);
    sessionMapper.updateById(session);
  }

  /**
   * 终局清算：要求 9 轮投掷全部完成；
   * 最终得分由服务端按明细重算（见 SettlementService），返回权威结果。
   */
  @Transactional
  public FinishVO finish(Long userId, Long sessionId) {
    GameSession session = loadOwnedSession(userId, sessionId);
    requirePlaying(session);
    if (session.getCurrentRound() <= GameRules.TOTAL_ROUNDS) {
      throw new BizException("还没有完成全部 " + GameRules.TOTAL_ROUNDS + " 轮投掷");
    }

    List<ThrowRecord> throws_ = throwMapper.selectList(
        new LambdaQueryWrapper<ThrowRecord>().eq(ThrowRecord::getSessionId, sessionId));
    List<QuizRecord> quizzes = quizMapper.selectList(
        new LambdaQueryWrapper<QuizRecord>().eq(QuizRecord::getSessionId, sessionId));
    List<CardViewRecord> cardViews = cardViewMapper.selectList(
        new LambdaQueryWrapper<CardViewRecord>().eq(CardViewRecord::getSessionId, sessionId));

    SettlementService.Settlement s =
        SettlementService.settle(throws_, quizzes, cardViews, session.getConfessed());

    session.setStatus(SessionStatus.FINISHED.name());
    session.setFinalScore(s.finalScore());
    session.setClueCount(s.clueCount());
    session.setPenalty(s.penalty().name());
    session.setBreezeTokens(s.breezeTokens());
    session.setUsedRiskyPot(s.usedRiskyPot());
    session.setFinishedAt(LocalDateTime.now());
    sessionMapper.updateById(session);

    return new FinishVO(session.getId(), s.finalScore(), s.clueCount(), s.penalty().name(),
        s.breezeTokens(), session.getConfessed(), s.usedRiskyPot(), session.getFinishedAt());
  }

  /** 放弃对局：玩家点"退出游戏"或本地存档丢失时调用，把进行中的对局标记为已放弃 */
  public void abandon(Long userId, Long sessionId) {
    GameSession session = loadOwnedSession(userId, sessionId);
    if (SessionStatus.PLAYING.name().equals(session.getStatus())) {
      session.setStatus(SessionStatus.ABANDONED.name());
      sessionMapper.updateById(session);
    }
  }

  /** 我的历史战绩（已完结的局，最新在前）；被清洗的局带清洗前原分，便于玩家知情 */
  public List<HistoryItemVO> myHistory(Long userId) {
    List<GameSession> sessions = sessionMapper.selectList(new LambdaQueryWrapper<GameSession>()
        .eq(GameSession::getUserId, userId)
        .eq(GameSession::getStatus, SessionStatus.FINISHED.name())
        .orderByDesc(GameSession::getFinishedAt)
        .last("LIMIT 50"));

    // 被清洗局的原得分存在 purge_records，一次性批量查出，避免循环逐条查库
    List<Long> purgedIds = sessions.stream()
        .filter(s -> Boolean.TRUE.equals(s.getPurged()))
        .map(GameSession::getId)
        .toList();
    Map<Long, Integer> originalScores = new HashMap<>();
    if (!purgedIds.isEmpty()) {
      purgeRecordMapper.selectList(new LambdaQueryWrapper<PurgeRecord>()
              .in(PurgeRecord::getSessionId, purgedIds))
          .forEach(r -> originalScores.put(r.getSessionId(), r.getOriginalScore()));
    }

    return sessions.stream()
        .map(s -> new HistoryItemVO(s.getId(), s.getFinalScore(), s.getClueCount(), s.getPenalty(),
            s.getBreezeTokens(), s.getConfessed(), s.getUsedRiskyPot(), s.getPurged(),
            originalScores.get(s.getId()), s.getFinishedAt()))
        .toList();
  }

  /**
   * 查询当前进行中的对局完整状态（用于"继续上局"，换设备也能续玩）：
   * 返回本局题目 + 已上报的全部明细，前端按轮次重放即可还原现场。
   */
  public SessionStateVO currentSession(Long userId) {
    GameSession session = sessionMapper.selectOne(new LambdaQueryWrapper<GameSession>()
        .eq(GameSession::getUserId, userId)
        .eq(GameSession::getStatus, SessionStatus.PLAYING.name())
        .orderByDesc(GameSession::getStartedAt)
        .last("LIMIT 1"));
    if (session == null) {
      return null;
    }
    Long sid = session.getId();
    List<SessionStateVO.ThrowItem> throwsList = throwMapper.selectList(
            new LambdaQueryWrapper<ThrowRecord>()
                .eq(ThrowRecord::getSessionId, sid)
                .orderByAsc(ThrowRecord::getRoundNo))
        .stream()
        .map(t -> new SessionStateVO.ThrowItem(t.getRoundNo(), t.getSceneId(), t.getPotType(),
            t.getInZone(), t.getHit(), t.getScoreGained(), t.getCardType()))
        .toList();
    List<SessionStateVO.QuizItem> quizzes = quizMapper.selectList(
            new LambdaQueryWrapper<QuizRecord>()
                .eq(QuizRecord::getSessionId, sid)
                .orderByAsc(QuizRecord::getRoundNo))
        .stream()
        .map(q -> new SessionStateVO.QuizItem(q.getRoundNo(), q.getQuizId(), q.getCorrect()))
        .toList();
    List<SessionStateVO.CardViewItem> cardViews = cardViewMapper.selectList(
            new LambdaQueryWrapper<CardViewRecord>()
                .eq(CardViewRecord::getSessionId, sid)
                .orderByAsc(CardViewRecord::getRoundNo))
        .stream()
        .map(v -> new SessionStateVO.CardViewItem(v.getRoundNo(), v.getCost()))
        .toList();
    QuestionPlan plan = session.getQuestionPlan() != null
        ? questionService.parsePlan(session.getQuestionPlan())
        : null;
    return new SessionStateVO(sid, session.getCurrentRound(), session.getStatus(),
        session.getConfessed(), plan, GameRules.snapshot(), throwsList, quizzes, cardViews,
        session.getStartedAt());
  }

  // —— 内部工具 ——

  /** 加载对局并校验归属：只能操作自己的对局 */
  private GameSession loadOwnedSession(Long userId, Long sessionId) {
    GameSession session = sessionMapper.selectById(sessionId);
    if (session == null || !session.getUserId().equals(userId)) {
      throw new BizException(404, "对局不存在");
    }
    return session;
  }

  private void requirePlaying(GameSession session) {
    if (!SessionStatus.PLAYING.name().equals(session.getStatus())) {
      throw new BizException("对局已结束");
    }
  }

  private PotType parsePot(String potType) {
    try {
      return PotType.valueOf(potType);
    } catch (Exception e) {
      throw new BizException("未知的壶类型：" + potType);
    }
  }

  private CardType parseCard(String cardType) {
    try {
      return CardType.valueOf(cardType);
    } catch (Exception e) {
      throw new BizException("未知的卡片类型：" + cardType);
    }
  }
}
