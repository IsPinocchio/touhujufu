package com.xingwang.touhu.user;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;

/**
 * 用户表 Mapper：继承 MyBatis-Plus 的 BaseMapper 后，
 * selectById / insert / update / selectList 等单表操作全部免费获得，无需写 SQL。
 */
public interface UserMapper extends BaseMapper<User> {
}
