package com.xingwang.touhu.common;

/**
 * 业务异常：业务逻辑出错时抛出（如"对局不存在""轮次不对"），
 * 由 GlobalExceptionHandler 统一捕获并转成 { code, message } 返回给前端。
 * 好处：业务代码里不用到处写错误返回，抛异常即可。
 */
public class BizException extends RuntimeException {

  private final int code;

  public BizException(String message) {
    this(400, message);
  }

  public BizException(int code, String message) {
    super(message);
    this.code = code;
  }

  public int getCode() {
    return code;
  }
}
