package com.xingwang.touhu.admin.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.time.LocalDateTime;

/** 清洗明细实体：对应 purge_records 表，记录每局被清零前的原始得分 */
@Data
@TableName("purge_records")
public class PurgeRecord {

  @TableId(type = IdType.AUTO)
  private Long id;

  private Long batchId;
  private Long sessionId;
  private Long userId;
  private Integer originalScore;
  private LocalDateTime createdAt;
}
