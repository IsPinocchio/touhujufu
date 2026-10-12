package com.xingwang.touhu.game.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.time.LocalDateTime;

/** 对局实体：对应 game_sessions 表 */
@Data
@TableName("game_sessions")
public class GameSession {

  @TableId(type = IdType.AUTO)
  private Long id;

  private Long userId;

  /** PLAYING / FINISHED / ABANDONED */
  private String status;

  /** 当前轮次 1~9；10 表示 9 轮投掷全部完成，等待清算 */
  private Integer currentRound;

  private Integer finalScore;
  private Integer clueCount;
  /** NONE / LIGHT / HEAVY */
  private String penalty;
  private Integer breezeTokens;
  private Boolean confessed;

  /** 是否投过腐败/擦边壶（无论抽到什么卡）：大清洗的判定依据 */
  private Boolean usedRiskyPot;
  /** 是否已被大清洗清零 */
  private Boolean purged;
  private Long purgeBatchId;

  /** 本局抽题结果 JSON（开局生成，续玩原样返回） */
  private String questionPlan;

  private LocalDateTime startedAt;
  private LocalDateTime finishedAt;
}
