package com.xingwang.touhu.question.entity;

import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

/** 判断题实体：对应 quiz_questions 表 */
@Data
@TableName("quiz_questions")
public class QuizQuestion {

  /** 题目编号（QZ + 三位序号） */
  @TableId
  private String id;

  private String category;
  private Integer difficulty;
  private String scene;

  /** 是否合规：true 可以做 / false 违规 */
  private Boolean compliant;

  private String answerNote;

  /** 讲解（数据库列名 explain_text，explain 是 MySQL 保留字） */
  private String explainText;
  private String basis;
  private Boolean enabled;
}
