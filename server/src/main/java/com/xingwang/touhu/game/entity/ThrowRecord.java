package com.xingwang.touhu.game.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/** 投掷记录实体：对应 throw_records 表，每轮投壶一行 */
@Data
@TableName("throw_records")
public class ThrowRecord {

  @TableId(type = IdType.AUTO)
  private Long id;

  private Long sessionId;
  private Integer roundNo;
  private String sceneId;

  /** CORRUPT / EDGE / CLEAN */
  private String potType;

  /** 松手时指针位置 0~1 */
  private BigDecimal pointerPos;

  private Boolean inZone;
  private Boolean hit;
  private Integer scoreGained;

  /** NONE / SAFE / CLUE */
  private String cardType;

  private LocalDateTime createdAt;
}
