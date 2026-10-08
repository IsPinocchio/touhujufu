/**
 * localStorage 安全读写辅助
 * 统一做 try/catch 与 JSON 序列化，避免隐私模式 / 存储满导致崩溃
 */

/**
 * 读取 JSON 数据
 * @param {string} key
 * @param {*} fallback 缺省值
 */
export function loadJSON(key, fallback = null) {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : fallback
  } catch (e) {
    return fallback
  }
}

/**
 * 写入 JSON 数据
 * @param {string} key
 * @param {*} value
 */
export function saveJSON(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch (e) {
    // 存储失败时静默忽略（如容量超限）
  }
}

/**
 * 删除指定键
 * @param {string} key
 */
export function removeKey(key) {
  try {
    localStorage.removeItem(key)
  } catch (e) {
    // 忽略
  }
}
