/**
 * 地址管理工具
 * 使用本地存储管理用户地址数据
 */

const STORAGE_KEY = 'user_addresses';

/**
 * 获取所有地址
 */
export function getAllAddresses() {
  try {
    const addresses = uni.getStorageSync(STORAGE_KEY);
    return addresses ? JSON.parse(addresses) : [];
  } catch (error) {
    console.error('获取地址列表失败:', error);
    return [];
  }
}

/**
 * 保存地址（新增或更新）
 */
export function saveAddress(address) {
  try {
    const addresses = getAllAddresses();
    
    if (address.id) {
      // 更新现有地址
      const index = addresses.findIndex(addr => addr.id === address.id);
      if (index !== -1) {
        addresses[index] = {
          ...address,
          updatedAt: Date.now()
        };
      }
    } else {
      // 新增地址
      const newAddress = {
        ...address,
        id: `addr_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        createdAt: Date.now(),
        updatedAt: Date.now()
      };
      addresses.push(newAddress);
    }
    
    uni.setStorageSync(STORAGE_KEY, JSON.stringify(addresses));
    return true;
  } catch (error) {
    console.error('保存地址失败:', error);
    return false;
  }
}

/**
 * 根据ID获取地址
 */
export function getAddressById(id) {
  try {
    const addresses = getAllAddresses();
    return addresses.find(addr => addr.id === id) || null;
  } catch (error) {
    console.error('获取地址失败:', error);
    return null;
  }
}

/**
 * 删除地址
 */
export function deleteAddress(id) {
  try {
    const addresses = getAllAddresses();
    const filtered = addresses.filter(addr => addr.id !== id);
    uni.setStorageSync(STORAGE_KEY, JSON.stringify(filtered));
    return true;
  } catch (error) {
    console.error('删除地址失败:', error);
    return false;
  }
}

/**
 * 设置默认地址
 */
export function setDefaultAddress(id) {
  try {
    const addresses = getAllAddresses();
    addresses.forEach(addr => {
      addr.isDefault = addr.id === id;
    });
    uni.setStorageSync(STORAGE_KEY, JSON.stringify(addresses));
    return true;
  } catch (error) {
    console.error('设置默认地址失败:', error);
    return false;
  }
}

/**
 * 获取默认地址
 */
export function getDefaultAddress() {
  try {
    const addresses = getAllAddresses();
    return addresses.find(addr => addr.isDefault) || addresses[0] || null;
  } catch (error) {
    console.error('获取默认地址失败:', error);
    return null;
  }
}

/**
 * 清空所有地址
 */
export function clearAllAddresses() {
  try {
    uni.removeStorageSync(STORAGE_KEY);
    return true;
  } catch (error) {
    console.error('清空地址失败:', error);
    return false;
  }
}

