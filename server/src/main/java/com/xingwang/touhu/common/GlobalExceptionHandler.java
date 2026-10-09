package com.xingwang.touhu.common;

import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.validation.BindException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

/**
 * 全局异常处理：所有 Controller 抛出的异常都在这里兜底，
 * 保证前端永远拿到统一的 { code, message, data } 格式，不会看到 Java 报错堆栈页面。
 */
@RestControllerAdvice
public class GlobalExceptionHandler {

  /** 业务异常：返回业务方指定的错误码与文案 */
  @ExceptionHandler(BizException.class)
  public Result<Void> handleBiz(BizException e) {
    return Result.error(e.getCode(), e.getMessage());
  }

  /** 参数校验失败（@Valid 不通过）：把第一条校验信息返回给前端 */
  @ExceptionHandler(BindException.class)
  public Result<Void> handleValidation(BindException e) {
    String msg = e.getBindingResult().getFieldError() != null
        ? e.getBindingResult().getFieldError().getDefaultMessage()
        : "参数校验失败";
    return Result.error(400, msg);
  }

  /** 请求体 JSON 解析失败（比如前端传了格式错误的 JSON） */
  @ExceptionHandler(HttpMessageNotReadableException.class)
  public Result<Void> handleBadJson(HttpMessageNotReadableException e) {
    return Result.error(400, "请求体格式错误");
  }

  /** 其它未预料的异常：记日志（控制台），对前端只暴露通用文案，避免泄露内部实现 */
  @ExceptionHandler(Exception.class)
  public Result<Void> handleUnknown(Exception e) {
    e.printStackTrace();
    return Result.error(500, "服务器内部错误，请稍后再试");
  }
}
