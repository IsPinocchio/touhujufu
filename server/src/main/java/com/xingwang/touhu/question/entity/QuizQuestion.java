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

  /** 题型：scenario 情景判断 / statement 条例判断 */
  private String qtype;

  /** 情景题：true 可以做 / false 违规；条例题：true 表述正确 / false 表述错误 */
  private Boolean compliant;

  private String answerNote;

  /** 讲解（数据库列名 explain_text，explain 是 MySQL 保留字） */
  private String explainText;
  private String basis;
  private Boolean enabled;
}
