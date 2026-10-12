package com.xingwang.touhu.admin;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.xingwang.touhu.admin.entity.PurgeBatch;
import com.xingwang.touhu.admin.entity.PurgeRecord;
import com.xingwang.touhu.admin.mapper.PurgeBatchMapper;
import com.xingwang.touhu.admin.mapper.PurgeRecordMapper;
import com.xingwang.touhu.common.BizException;
import com.xingwang.touhu.game.GameRules;
import com.xingwang.touhu.game.entity.GameSession;
import com.xingwang.touhu.game.mapper.GameSessionMapper;
import com.xingwang.touhu.user.User;
import com.xingwang.touhu.user.UserMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

import javax.sql.DataSource;
import java.sql.Connection;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * 大清洗服务：活动的核心机制。
 *
 * 规则：把「已完结、未清洗、投过腐败/擦边壶、未主动交代、当前得分 > 0」的对局全部抓出来，
 * 得分清零、打上清洗标记，并在 purge_records 里留存原始得分备查。
 * 抽到「平安无事」卡而逃脱的玩家，正是通过这个机制被事后清算。
 *
 * 主动交代者从宽：交代过、且交代后（第 4 轮后）未再投腐败/擦边壶的，豁免清洗；
 * 交代完还继续伸手的，与从未交代者一样列入清洗范围。
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class PurgeService {

  private final GameSessionMapper sessionMapper;
  private final PurgeBatchMapper batchMapper;
  private final PurgeRecordMapper recordMapper;
  private final UserMapper userMapper;
  private final DataSource dataSource;
  private final PlatformTransactionManager txManager;

  /** 多实例部署全局互斥的命名锁（MySQL 服务端级，与实例数量无关） */
  private static final String PURGE_LOCK = "touhu_purge_execute";

  /** 待清洗预览条目 */
  public record PurgePreviewItem(Long sessionId, Long userId, String displayName,
                                 Integer finalScore, Integer clueCount, Boolean confessed) {
  }

  /** 预览：本次清洗将波及哪些对局（不实际执行，供管理员确认） */
  public List<PurgePreviewItem> preview() {
    List<GameSession> targets = findTargets();
    Map<Long, User> users = new HashMap<>();
    if (!targets.isEmpty()) {
      userMapper.selectBatchIds(targets.stream().map(GameSession::getUserId).distinct().toList())
          .forEach(u -> users.put(u.getId(), u));
    }
    return targets.stream()
        .map(s -> new PurgePreviewItem(s.getId(), s.getUserId(),
            users.get(s.getUserId()) != null ? users.get(s.getUserId()).getDisplayName() : "未知用户",
            s.getFinalScore(), s.getClueCount(), s.getConfessed()))
        .toList();
  }

  /**
   * 执行大清洗。整个流程在一个数据库事务里：任何一步失败全部回滚，
   * 不会出现「分数清了一半」的中间态。
   *
   * 多实例部署时定时任务会在每台机器上各触发一次，这里用 MySQL 命名锁保证
   * 全局只有一个执行者。锁由一条独立连接持有、横跨事务提交之后才释放，
   * 避免「锁已释放但事务未提交」的窗口期导致另一实例重复清洗。
   *
   * @param executeType SCHEDULED / MANUAL
   * @param operatorId  手动触发的管理员ID（定时任务传 null）
   * @return 本批清洗的对局数量（另一实例持有锁时返回 0）
   */
  public int execute(String executeType, Long operatorId) {
    try (Connection conn = dataSource.getConnection(); Statement st = conn.createStatement()) {
      ResultSet rs = st.executeQuery("SELECT GET_LOCK('" + PURGE_LOCK + "', 5)");
      rs.next();
      if (rs.getInt(1) != 1) {
        log.info("另一实例正在执行大清洗，本次跳过");
        return 0;
      }
      try {
        Integer count = new TransactionTemplate(txManager)
            .execute(status -> doExecute(executeType, operatorId));
        return count == null ? 0 : count;
      } finally {
        st.executeQuery("SELECT RELEASE_LOCK('" + PURGE_LOCK + "')");
      }
    } catch (SQLException e) {
      throw new BizException("大清洗执行失败：" + e.getMessage());
    }
  }

  /** 清洗事务本体：找目标、建批次、逐局清零留档、回写统计 */
  private int doExecute(String executeType, Long operatorId) {
    List<GameSession> targets = findTargets();

    // 1. 创建批次
    PurgeBatch batch = new PurgeBatch();
    batch.setExecuteType(executeType);
    batch.setOperatorId(operatorId);
    batch.setAffectedCount(0);
    batchMapper.insert(batch);

    // 2. 逐局清零 + 留档
    for (GameSession s : targets) {
      PurgeRecord record = new PurgeRecord();
      record.setBatchId(batch.getId());
      record.setSessionId(s.getId());
      record.setUserId(s.getUserId());
      record.setOriginalScore(s.getFinalScore());
      recordMapper.insert(record);

      s.setFinalScore(0);
      s.setPurged(true);
      s.setPurgeBatchId(batch.getId());
      sessionMapper.updateById(s);
    }

    // 3. 回写批次统计
    batch.setAffectedCount(targets.size());
    batchMapper.updateById(batch);

    log.info("大清洗完成：批次 {}，清洗 {} 局", batch.getId(), targets.size());
    return targets.size();
  }

  /** 交代后（交代窗口在第 {@value GameRules#CONFESS_ROUND} 轮后）又投风险壶的明细子查询 */
  private static final String RISKY_AFTER_CONFESS_SQL =
      "SELECT 1 FROM throw_records tr WHERE tr.session_id = game_sessions.id"
          + " AND tr.round_no > " + GameRules.CONFESS_ROUND
          + " AND tr.pot_type IN ('CORRUPT','EDGE')";

  /** 清洗目标查询：单一出口，预览与执行共用，保证两者结果一致 */
  private List<GameSession> findTargets() {
    return sessionMapper.selectList(new LambdaQueryWrapper<GameSession>()
        .eq(GameSession::getStatus, "FINISHED")
        .eq(GameSession::getPurged, false)
        .eq(GameSession::getUsedRiskyPot, true) // 投过腐败/擦边壶（含逃脱者）
        // 豁免条件：交代过且交代后未再伸手。取反即：未交代，或交代后又投风险壶
        .and(w -> w.eq(GameSession::getConfessed, false).or().exists(RISKY_AFTER_CONFESS_SQL))
        .gt(GameSession::getFinalScore, 0));
  }

  /** 清洗历史（批次列表，最新在前） */
  public List<PurgeBatch> batches() {
    return batchMapper.selectList(new LambdaQueryWrapper<PurgeBatch>()
        .orderByDesc(PurgeBatch::getCreatedAt)
        .last("LIMIT 20"));
  }
}
