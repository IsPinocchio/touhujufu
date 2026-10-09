package com.xingwang.touhu.admin;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.xingwang.touhu.admin.entity.PurgeBatch;
import com.xingwang.touhu.admin.entity.PurgeRecord;
import com.xingwang.touhu.admin.mapper.PurgeBatchMapper;
import com.xingwang.touhu.admin.mapper.PurgeRecordMapper;
import com.xingwang.touhu.game.entity.GameSession;
import com.xingwang.touhu.game.mapper.GameSessionMapper;
import com.xingwang.touhu.user.User;
import com.xingwang.touhu.user.UserMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * 大清洗服务：活动的核心机制。
 *
 * 规则：把「已完结、未清洗、投过腐败/擦边壶、当前得分 > 0」的对局全部抓出来，
 * 得分清零、打上清洗标记，并在 purge_records 里留存原始得分备查。
 * 抽到「平安无事」卡而逃脱的玩家，正是通过这个机制被事后清算。
 *
 * 注：主动交代过的玩家目前也在清洗范围内（usedRiskyPot 仍为 true）。
 * 若活动策划决定「交代者豁免」，在下方查询条件中追加 .eq(GameSession::getConfessed, false) 即可。
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class PurgeService {

  private final GameSessionMapper sessionMapper;
  private final PurgeBatchMapper batchMapper;
  private final PurgeRecordMapper recordMapper;
  private final UserMapper userMapper;

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
   * @param executeType SCHEDULED / MANUAL
   * @param operatorId  手动触发的管理员ID（定时任务传 null）
   * @return 本批清洗的对局数量
   */
  @Transactional
  public int execute(String executeType, Long operatorId) {
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

  /** 清洗目标查询：单一出口，预览与执行共用，保证两者结果一致 */
  private List<GameSession> findTargets() {
    return sessionMapper.selectList(new LambdaQueryWrapper<GameSession>()
        .eq(GameSession::getStatus, "FINISHED")
        .eq(GameSession::getPurged, false)
        .eq(GameSession::getUsedRiskyPot, true) // 投过腐败/擦边壶（含逃脱者）
        .gt(GameSession::getFinalScore, 0));
  }

  /** 清洗历史（批次列表，最新在前） */
  public List<PurgeBatch> batches() {
    return batchMapper.selectList(new LambdaQueryWrapper<PurgeBatch>()
        .orderByDesc(PurgeBatch::getCreatedAt)
        .last("LIMIT 20"));
  }
}
