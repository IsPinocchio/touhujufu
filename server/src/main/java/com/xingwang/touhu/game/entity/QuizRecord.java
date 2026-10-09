package com.xingwang.touhu.game.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.time.LocalDateTime;

/** 答题记录实体：对应 quiz_records 表 */
@Data
@TableName("quiz_records")
public class QuizRecord {

  @TableId(type = IdType.AUTO)
  private Long id;

  private Long sessionId;
  private Integer roundNo;
  private String quizId;
  private Boolean correct;
  private LocalDateTime createdAt;
}
