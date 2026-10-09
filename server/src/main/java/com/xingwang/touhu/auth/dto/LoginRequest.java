package com.xingwang.touhu.auth.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** 登录请求体 */
public record LoginRequest(
    @NotBlank(message = "账号不能为空") String username,
    @NotBlank(message = "密码不能为空") String password) {
}
