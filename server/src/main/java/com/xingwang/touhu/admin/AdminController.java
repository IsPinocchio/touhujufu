package com.xingwang.touhu.admin;

import com.xingwang.touhu.admin.entity.PurgeBatch;
import com.xingwang.touhu.auth.UserContext;
import com.xingwang.touhu.common.Result;
import com.xingwang.touhu.config.RequireAdmin;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * 管理接口（全部需要管理员权限，@RequireAdmin 由拦截器强制校验）：
 *   GET  /api/admin/purge/preview   预览本次清洗将波及的名单
 *   POST /api/admin/purge           手动执行大清洗
 *   GET  /api/admin/purge/batches   清洗历史
 */
@RestController
@RequestMapping("/api/admin/purge")
@RequiredArgsConstructor
public class AdminController {

  private final PurgeService purgeService;

  @RequireAdmin
  @GetMapping("/preview")
  public Result<List<PurgeService.PurgePreviewItem>> preview() {
    return Result.ok(purgeService.preview());
  }

  @RequireAdmin
  @PostMapping
  public Result<Integer> purge() {
    return Result.ok(purgeService.execute("MANUAL", UserContext.getUserId()));
  }

  @RequireAdmin
  @GetMapping("/batches")
  public Result<List<PurgeBatch>> batches() {
    return Result.ok(purgeService.batches());
  }
}
