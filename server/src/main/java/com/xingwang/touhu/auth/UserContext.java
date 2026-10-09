package com.xingwang.touhu.auth;

/**
 * 当前登录用户上下文：基于 ThreadLocal，在一次请求内任何地方都能拿到当前用户ID/角色。
 * 由 AuthInterceptor 在请求开始时写入、请求结束时清除。
 */
public class UserContext {

  private static final ThreadLocal<Long> USER_ID = new ThreadLocal<>();
  private static final ThreadLocal<String> ROLE = new ThreadLocal<>();

  public static void set(Long userId, String role) {
    USER_ID.set(userId);
    ROLE.set(role);
  }

  public static Long getUserId() {
    return USER_ID.get();
  }

  public static String getRole() {
    return ROLE.get();
  }

  public static boolean isAdmin() {
    return "ADMIN".equals(ROLE.get());
  }

  /** 请求结束必须清理，否则线程复用时会串号 */
  public static void clear() {
    USER_ID.remove();
    ROLE.remove();
  }
}
