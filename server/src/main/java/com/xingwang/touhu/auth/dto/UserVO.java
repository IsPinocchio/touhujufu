package com.xingwang.touhu.auth.dto;

/** 当前用户信息（GET /api/auth/me 的返回） */
public record UserVO(
    Long id,
    String username,
    String displayName,
    String department,
    String role) {
}
