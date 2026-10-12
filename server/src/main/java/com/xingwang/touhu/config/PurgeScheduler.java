package com.xingwang.touhu.config;

import com.xingwang.touhu.admin.PurgeService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/**
 * 大清洗定时任务：按 application.yml 的 touhu.purge.cron 配置周期执行（默认每周一凌晨 3 点）。
 * 前端不感知这个过程 —— 清洗后排行榜自动变化，玩家在自己的历史战绩里能看到 purged 标记。
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class PurgeScheduler {

  private final PurgeService purgeService;

  // zone 显式指定东八区：cron 默认走 JVM 时区，容器/服务器在 UTC 时周一 3 点会偏 8 小时
  @Scheduled(cron = "${touhu.purge.cron}", zone = "Asia/Shanghai")
  public void scheduledPurge() {
    log.info("定时大清洗开始");
    try {
      int count = purgeService.execute("SCHEDULED", null);
      log.info("定时大清洗结束，清洗 {} 局", count);
    } catch (Exception e) {
      // 吞掉异常只记日志：事务已回滚，下次调度会重试
      log.error("定时大清洗失败", e);
    }
  }
}
