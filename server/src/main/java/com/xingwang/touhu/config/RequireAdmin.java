package com.xingwang.touhu.config;

import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/**
 * 管理员接口标记：标在 Controller 方法上，拦截器会校验当前用户必须为 ADMIN。
 * 例：@RequireAdmin 标注在大清洗接口上，普通玩家调用会被 403 拒绝。
 */
@Target(ElementType.METHOD)
@Retention(RetentionPolicy.RUNTIME)
public @interface RequireAdmin {
}
