package com.xingwang.touhu.game.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.time.LocalDateTime;

/** 付费查看记录实体：对应 card_view_records 表 */
@Data
@TableName("card_view_records")
public class CardViewRecord {

  @TableId(type = IdType.AUTO)
  private Long id;

  private Long sessionId;
  private Integer roundNo;
  private Integer cost;
  private LocalDateTime createdAt;
}
