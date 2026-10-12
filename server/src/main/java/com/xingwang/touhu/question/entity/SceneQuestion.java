package com.xingwang.touhu.question.entity;

import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

/** 场景题实体：对应 scene_questions 表 */
@Data
@TableName("scene_questions")
public class SceneQuestion {

  /** 题目编号（SC + 三位序号） */
  @TableId
  private String id;

  private String category;
  private Integer difficulty;
  private String sceneText;

  /** 选项 JSON 数组：[{"key":"a","text":"...","pot":"corrupt|edge|clean"}, ...] */
  private String optionsJson;

  private String hint;
  private String source;
  private Boolean enabled;
}
