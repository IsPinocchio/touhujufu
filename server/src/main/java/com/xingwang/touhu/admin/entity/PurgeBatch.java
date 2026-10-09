package com.xingwang.touhu.admin.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.time.LocalDateTime;

/** 清洗批次实体：对应 purge_batches 表 */
@Data
@TableName("purge_batches")
public class PurgeBatch {

  @TableId(type = IdType.AUTO)
  private Long id;

  /** SCHEDULED 定时 / MANUAL 手动 */
  private String executeType;

  /** 手动触发时的管理员ID，定时任务为 null */
  private Long operatorId;

  private Integer affectedCount;

  private LocalDateTime createdAt;
}
