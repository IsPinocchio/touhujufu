/**
 * 调试模式开关
 * URL 追加 ?debug=1 后开启，游戏界面会显示每轮概率与抽卡结果，便于测试
 */
export const DEBUG = new URLSearchParams(window.location.search).has('debug')
