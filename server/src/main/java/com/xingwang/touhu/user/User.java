package com.xingwang.touhu.user;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.time.LocalDateTime;

/**
 * 用户实体：对应 users 表。
 * MyBatis-Plus 约定：@TableName 指定表名，@TableId 指定主键，
 * 字段驼峰自动对应数据库下划线列（displayName -> display_name）。
 */
@Data
@TableName("users")
public class User {

  @TableId(type = IdType.AUTO)
  private Long id;

  private String username;

  /** BCrypt 哈希，任何接口都不要把这个字段返回给前端 */
  private String passwordHash;

  private String displayName;

  private String department;

  /** PLAYER / ADMIN，见 common.enums.Role */
  private String role;

  private Integer status;

  private LocalDateTime createdAt;

  private LocalDateTime lastLoginAt;
}
