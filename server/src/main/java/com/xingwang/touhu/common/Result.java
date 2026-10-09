package com.xingwang.touhu.common;

import lombok.Data;

/**
 * 统一 API 返回体：所有接口都返回 { code, message, data } 结构。
 * 前端拿到响应后只需判断 code === 0 即成功，与业务无关的错误格式也保持一致。
 */
@Data
public class Result<T> {

  /** 0 = 成功；非 0 = 各类业务错误码；HTTP 状态码也同步设置 */
  private int code;

  private String message;

  /** 真正的业务数据，可能是对象、列表或 null */
  private T data;

  public static <T> Result<T> ok(T data) {
    Result<T> r = new Result<>();
    r.code = 0;
    r.message = "ok";
    r.data = data;
    return r;
  }

  public static Result<Void> ok() {
    return ok(null);
  }

  public static <T> Result<T> error(int code, String message) {
    Result<T> r = new Result<>();
    r.code = code;
    r.message = message;
    return r;
  }
}
