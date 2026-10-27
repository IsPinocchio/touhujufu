package com.xingwang.touhu.config;

import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

/**
 * Web 层配置：
 * 1. 注册登录拦截器，并放行不需要登录的接口（注册/登录/排行榜查看）
 * 2. 配置跨域（CORS）：前端部署在不同域名/端口时浏览器需要此头才放行响应
 */
@Configuration
@RequiredArgsConstructor
public class WebConfig implements WebMvcConfigurer {

  private final AuthInterceptor authInterceptor;

  // 允许跨域的前端来源，逗号分隔；默认 * 放开（开发期），
  // 线上由环境变量 CORS_ORIGINS 传入前端实际来源，如 https://maas-dev.chinasatnet.com.cn
  @Value("${touhu.cors.allowed-origins:*}")
  private String allowedOrigins;

  @Override
  public void addInterceptors(InterceptorRegistry registry) {
    registry.addInterceptor(authInterceptor)
        .addPathPatterns("/api/**") // 拦截所有接口
        .excludePathPatterns(
            "/api/auth/login",     // 登录本身不需要令牌
            "/api/auth/register",  // 注册不需要令牌
            "/api/leaderboard"     // 排行榜允许未登录查看（如需登录可删掉这行）
        );
  }

  @Override
  public void addCorsMappings(CorsRegistry registry) {
    registry.addMapping("/api/**")
        .allowedOriginPatterns(allowedOrigins.split(","))
        .allowedMethods("GET", "POST", "PUT", "DELETE", "OPTIONS")
        .allowedHeaders("*")
        .maxAge(3600);
  }
}
