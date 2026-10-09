package com.xingwang.touhu.auth.dto;

/**
 * 登录成功返回：令牌 + 用户基本信息。
 * 前端之后所有请求在 Header 携带：Authorization: Bearer <token>
 */
public record LoginResponse(
    String token,
    Long userId,
    String displayName,
    String role) {
}
