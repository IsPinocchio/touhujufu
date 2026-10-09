package com.xingwang.touhu.auth.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** 注册请求体 */
public record RegisterRequest(
    @NotBlank(message = "账号不能为空")
    @Size(min = 3, max = 32, message = "账号长度需为 3~32 位")
    String username,

    @NotBlank(message = "密码不能为空")
    @Size(min = 6, max = 64, message = "密码长度需为 6~64 位")
    String password,

    @NotBlank(message = "姓名不能为空")
    @Size(max = 32, message = "姓名最长 32 字")
    String displayName,

    @Size(max = 64, message = "部门最长 64 字")
    String department) {
}
